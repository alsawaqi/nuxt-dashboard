<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
  ssr: false, // client-only (uses MediaRecorder, window, Audio)
})

// ---- State ----
const isRecording = ref(false)
const status = ref('Idle')
const transcript = ref('')
const answerText = ref('')
const error = ref('')
const audioUrl = ref<string | null>(null)

// Example JSON data (replace with your real API data)
const exampleData = ref({
  period: 'Jan – Mar 2025',
  sales: [
    { month: 'Jan', total: 1200, orders: 30 },
    { month: 'Feb', total: 1800, orders: 45 },
    { month: 'Mar', total: 2200, orders: 50 },
  ],
})

let mediaRecorder: MediaRecorder | null = null
let chunks: BlobPart[] = []

// ---- Step 1: Record voice question ----
const startRecording = async () => {
  error.value = ''
  transcript.value = ''
  answerText.value = ''
  status.value = 'Requesting mic...'

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    let mimeType = ''
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm'
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus'
    }

    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)

    console.log('Using mimeType:', mimeType || mediaRecorder.mimeType)
    chunks = []

    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, {
        type: mimeType || mediaRecorder!.mimeType,
      })
      console.log('Recorded blob type:', blob.type, 'size:', blob.size)

      if (blob.size === 0) {
        error.value = 'Recorded audio is empty'
        status.value = 'Error'
        return
      }

      audioUrl.value = URL.createObjectURL(blob)
      await fullVoiceAnalyzeFlow(blob)
    }

    mediaRecorder.start()
    isRecording.value = true
    status.value = 'Recording your question...'
  } catch (e: any) {
    console.error(e)
    error.value = 'Could not access microphone. Check permissions.'
    status.value = 'Error'
  }
}

const stopRecording = () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.stop()
  isRecording.value = false
  status.value = 'Processing audio...'
}

const playRecording = () => {
  if (!audioUrl.value) return
  const audio = new Audio(audioUrl.value)
  audio.play()
}

// ---- Step 2: STT + Analyze + TTS chain ----
const fullVoiceAnalyzeFlow = async (blob: Blob) => {
  try {
    status.value = 'Transcribing question...'

    // 1) STT: send audio to /api/stt
    const formData = new FormData()
    formData.append('file', blob, 'question.webm')
    formData.append('model', 'gpt-4o-mini-transcribe') // server will forward this

    const sttRes = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    })

    if (!sttRes.ok) {
      const err = await sttRes.text()
      throw new Error('STT failed: ' + err)
    }

    const sttData = await sttRes.json()
    const questionText = sttData.text || ''
    transcript.value = questionText || '(empty transcription)'

    if (!questionText.trim()) {
      status.value = 'No speech detected'
      return
    }

    // 2) Analyze: send JSON + question to /api/analyze
    status.value = 'Analyzing data...'

    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: exampleData.value,
        question: questionText,
      }),
    })

    if (!analyzeRes.ok) {
      const err = await analyzeRes.text()
      throw new Error('Analyze failed: ' + err)
    }

    const analyzeJson = await analyzeRes.json()
    const answer = analyzeJson.answer || 'No answer returned.'
    answerText.value = answer

    // 3) TTS: speak the answer via /api/tts
    status.value = 'Speaking answer...'

    const ttsRes = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: answer }),
    })

    if (!ttsRes.ok) {
      const err = await ttsRes.text()
      throw new Error('TTS failed: ' + err)
    }

    const audioBuf = await ttsRes.arrayBuffer()
    const ttsBlob = new Blob([audioBuf], { type: 'audio/mpeg' })
    const ttsUrl = URL.createObjectURL(ttsBlob)
    const audio = new Audio(ttsUrl)
    audio.play()

    status.value = 'Done'
  } catch (e: any) {
    console.error(e)
    error.value = e.message || 'Error in voice → analyze → voice flow'
    status.value = 'Error'
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
    <h1 class="text-2xl font-semibold text-center">Voice Data Assistant</h1>

    <div class="flex gap-2">
      <button
        @click="startRecording"
        :disabled="isRecording"
        class="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
      >
        🎙 Ask by Voice
      </button>
      <button
        @click="stopRecording"
        :disabled="!isRecording"
        class="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
      >
        ⏹ Stop
      </button>
    </div>

    <p class="text-sm text-gray-600">
      Status: {{ status }}
    </p>

    <button
      v-if="audioUrl"
      @click="playRecording"
      class="px-3 py-1 rounded border text-sm"
    >
      ▶ Play Raw Question Recording
    </button>

    <div class="w-full max-w-xl mt-4 space-y-4">
      <div>
        <h2 class="font-semibold mb-1">Transcribed Question:</h2>
        <div class="border rounded p-2 min-h-[60px] text-sm whitespace-pre-wrap">
          {{ transcript || 'No transcription yet...' }}
        </div>
      </div>

      <div>
        <h2 class="font-semibold mb-1">AI Answer (on your data):</h2>
        <div class="border rounded p-2 min-h-[80px] text-sm whitespace-pre-wrap">
          {{ answerText || 'No analysis yet...' }}
        </div>
      </div>
    </div>

    <p v-if="error" class="text-red-500 text-sm mt-2">
      {{ error }}
    </p>
  </div>
</template>
