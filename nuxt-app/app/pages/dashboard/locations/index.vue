 <script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
 
})

const isRecording = ref(false)
const status = ref('Idle')
const transcript = ref('')
const error = ref('')
const audioUrl = ref<string | null>(null)

let mediaRecorder: MediaRecorder | null = null
let chunks: BlobPart[] = []

const startRecording = async () => {
  error.value = ''
  transcript.value = ''

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Use a supported mime type
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
      const blob = new Blob(chunks, { type: mimeType || mediaRecorder!.mimeType })
      console.log('Recorded blob type:', blob.type, 'size:', blob.size)

      if (blob.size === 0) {
        error.value = 'Recorded audio is empty'
        status.value = 'Error'
        return
      }

      audioUrl.value = URL.createObjectURL(blob)
      await sendToStt(blob)
    }

    mediaRecorder.start()
    isRecording.value = true
    status.value = 'Recording...'
  } catch (e: any) {
    console.error(e)
    error.value = 'Could not access microphone. Check permissions / HTTPS.'
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

const sendToStt = async (blob: Blob) => {
  try {
    const formData = new FormData()
    formData.append('file', blob, 'audio.webm') // field name "file" as docs
    formData.append('model', 'gpt-4o-mini-transcribe') 
    // (or "whisper-1" – both are supported in docs):contentReference[oaicite:1]{index=1}

    const res = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(errText || 'STT API failed')
    }

    const data = await res.json()
    transcript.value = data.text || JSON.stringify(data)
    status.value = 'Done'
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || 'Error sending audio to STT'
    status.value = 'Error'
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
    <h1 class="text-2xl font-semibold">Speech to Text (OpenAI)</h1>

    <div class="flex gap-2">
      <button
        @click="startRecording"
        :disabled="isRecording"
        class="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
      >
        🎙 Start
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
      ▶ Play Last Recording
    </button>

    <div class="w-full max-w-xl mt-4">
      <h2 class="font-semibold mb-2">Transcription:</h2>
      <div class="border rounded p-2 min-h-[80px] text-sm whitespace-pre-wrap">
        {{ transcript || 'No transcription yet...' }}
      </div>
    </div>

    <p v-if="error" class="text-red-500 text-sm mt-2">
      {{ error }}
    </p>
  </div>
</template>
