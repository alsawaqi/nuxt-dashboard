<script setup lang="ts">
import { ref, computed } from 'vue'

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

const from = ref<string | null>(null)
const to = ref<string | null>(null)
const loading = ref<boolean>(false)
const searchQuery = ref<any>({})

// voice modal / flow state
const showVoiceModal = ref(false)
const isAnalyzing = ref(false)
const progress = ref(0)                // 0 → 100 for whole flow
const stageLabel = ref('Idle')         // e.g. "Transcribing...", "Analyzing...", "Speaking..."
const isPlayingTts = ref(false)

let mediaRecorder: MediaRecorder | null = null
let chunks: BlobPart[] = []
let ttsAudio: HTMLAudioElement | null = null

const { $api } = useNuxtApp()

// we only show the mic button if we have data
const hasData = computed(() => {
  if (!searchQuery.value) return false
  if (Array.isArray(searchQuery.value)) return searchQuery.value.length > 0
  return Object.keys(searchQuery.value).length > 0
})

const openVoiceModal = () => {
  error.value = ''
  transcript.value = ''
  answerText.value = ''
  progress.value = 0
  stageLabel.value = 'Ready'
  status.value = 'Ready'
  showVoiceModal.value = true
}

const closeVoiceModal = () => {
  // stop recording if still active
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  isRecording.value = false

  // stop TTS if playing
  if (ttsAudio) {
    ttsAudio.pause()
    ttsAudio = null
  }
  isPlayingTts.value = false

  isAnalyzing.value = false
  progress.value = 0
  stageLabel.value = 'Idle'
  status.value = 'Idle'
  showVoiceModal.value = false
}

// ---- Search (loads dashboard JSON) ----
const search = async (): Promise<void> => {
  loading.value = true
  try {
    const { data } = await $api.get('/api/ai-dashboard-search', {
      params: {
        from: from.value,
        to: to.value,
      },
    })
    // store the full response so AI can see everything
    searchQuery.value = data
  } catch (e: any) {
    console.log(e)
  } finally {
    loading.value = false
  }
}

// ---- Recording ----
const startOrStopRecording = async () => {
  if (isRecording.value) {
    // stop current recording
    stopRecording()
  } else {
    await startRecording()
  }
}

const startRecording = async () => {
  if (!hasData.value) {
    error.value = 'Please run search first. No data to analyze.'
    return
  }

  error.value = ''
  transcript.value = ''
  answerText.value = ''
  status.value = 'Requesting mic...'
  stageLabel.value = 'Listening...'
  progress.value = 5

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
        stageLabel.value = 'Error'
        progress.value = 0
        return
      }

      audioUrl.value = URL.createObjectURL(blob)
      await fullVoiceAnalyzeFlow(blob)
    }

    mediaRecorder.start()
    isRecording.value = true
    status.value = 'Recording your question...'
    stageLabel.value = 'Listening...'
  } catch (e: any) {
    console.error(e)
    error.value = 'Could not access microphone. Check permissions.'
    status.value = 'Error'
    stageLabel.value = 'Error'
    progress.value = 0
  }
}

const stopRecording = () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.stop()
  isRecording.value = false
  status.value = 'Processing audio...'
  stageLabel.value = 'Processing recording...'
  progress.value = 10
}

// ---- Full STT + Analyze + TTS chain ----
const fullVoiceAnalyzeFlow = async (blob: Blob) => {
  try {
    if (!hasData.value) {
      error.value = 'No data loaded. Please run the search first.'
      status.value = 'Error'
      stageLabel.value = 'Error'
      progress.value = 0
      return
    }

    isAnalyzing.value = true

    // 1) STT: send audio to /api/stt
    status.value = 'Transcribing question...'
    stageLabel.value = 'Transcribing...'
    progress.value = 25

    const formData = new FormData()
    formData.append('file', blob, 'question.webm')
    formData.append('model', 'gpt-4o-mini-transcribe')

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
      stageLabel.value = 'No speech detected'
      progress.value = 0
      isAnalyzing.value = false
      return
    }

    // 2) Analyze: send JSON + question to /api/analyze
    status.value = 'Analyzing dashboard data...'
    stageLabel.value = 'Analyzing data...'
    progress.value = 60

    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: searchQuery.value,
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
    status.value = 'Generating voice response...'
    stageLabel.value = 'Generating voice...'
    progress.value = 85

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

    // done fetching: analysis + tts ready
    progress.value = 100
    stageLabel.value = 'Playing answer'
    status.value = 'Playing answer...'

    // play with cancel support
    if (ttsAudio) {
      ttsAudio.pause()
      ttsAudio = null
    }
    ttsAudio = new Audio(ttsUrl)
    isPlayingTts.value = true

    ttsAudio.onended = () => {
      isPlayingTts.value = false
      status.value = 'Done'
      stageLabel.value = 'Done'
    }

    ttsAudio.play()
  } catch (e: any) {
    console.error(e)
    error.value = e.message || 'Error in voice → analyze → voice flow'
    status.value = 'Error'
    stageLabel.value = 'Error'
    progress.value = 0
    isPlayingTts.value = false
  } finally {
    isAnalyzing.value = false
  }
}

// Stop / cancel TTS playback
const stopTtsPlayback = () => {
  if (ttsAudio) {
    ttsAudio.pause()
    ttsAudio = null
  }
  isPlayingTts.value = false
  status.value = 'Stopped'
  stageLabel.value = 'Stopped'
}
</script>

 <template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">Dashboard</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">AI</li>
      </ul>
    </div>

    <!-- Filters + Search -->
    <div class="row gy-4">
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">AI Status Analysis</h5>
            <!-- Voice button appears only when we have data -->
            <button
              v-if="hasData"
              type="button"
              class="btn btn-primary-600 d-flex align-items-center gap-2"
              @click="openVoiceModal"
            >
              <iconify-icon icon="solar:microphone-bold-duotone" class="icon"></iconify-icon>
              Analyze with AI
            </button>
          </div>
          <div class="card-body">
            <form class="row gy-3 needs-validation" novalidate @submit.prevent="search">
              <div class="col-md-6">
                <label class="form-label">FROM</label>
                <div class="icon-field has-validation">
                  <span class="icon">
                    <iconify-icon icon="solar:calendar-date-bold-duotone"></iconify-icon>
                  </span>
                  <input
                    type="date"
                    class="form-control"
                    v-model="from"
                    required
                  />
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">TO</label>
                <div class="icon-field has-validation">
                  <span class="icon">
                    <iconify-icon icon="solar:calendar-date-bold-duotone"></iconify-icon>
                  </span>
                  <input
                    type="date"
                    class="form-control"
                    v-model="to"
                    required
                  />
                </div>
              </div>
              <div class="col-12">
                <button class="btn btn-primary-600" type="submit" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ loading ? 'Searching...' : 'Search' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Error display (optional) -->
    <div v-if="error" class="alert alert-danger mt-3">
      {{ error }}
    </div>

    <!-- Voice Modal Overlay -->
    <div
      v-if="showVoiceModal"
      class="voice-modal-overlay"
      @click.self="closeVoiceModal"
    >
      <div class="voice-modal-card">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="mb-0">AI Voice Assistant</h5>
          <button type="button" class="btn btn-sm btn-light" @click="closeVoiceModal">
            ✕
          </button>
        </div>

        <p class="text-muted small mb-3">
          Press and hold the mic to ask a question about this dashboard.  
          Release to let AI analyze and speak back the answer.
        </p>

        <!-- Wave + Mic Button -->
        <div class="voice-center">
          <div class="wave-container">
            <div class="wave-circle" :class="{ 'wave-active': isRecording }"></div>
            <button
              type="button"
              class="voice-mic-btn"
              :class="{ 'voice-mic-btn-recording': isRecording }"
              @click="startOrStopRecording"
            >
              <iconify-icon
                :icon="isRecording ? 'solar:stop-bold-duotone' : 'solar:microphone-bold-duotone'"
                class="voice-mic-icon"
              ></iconify-icon>
            </button>
          </div>
          <div class="mt-3 text-center">
            <div class="fw-semibold">{{ stageLabel }}</div>
            <div class="text-muted small">{{ status }}</div>
          </div>
        </div>

        <!-- Progress bar for STT + Analyze + TTS -->
        <div class="mt-4">
          <div class="d-flex justify-content-between mb-1">
            <span class="small text-muted">Analysis progress</span>
            <span class="small text-muted">{{ progress }}%</span>
          </div>
          <div class="progress voice-progress">
            <div
              class="progress-bar"
              role="progressbar"
              :style="{ width: progress + '%' }"
              :aria-valuenow="progress"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>

        <!-- Controls: stop answer playback -->
        <div class="mt-3 d-flex justify-content-between align-items-center">
          <span class="small text-muted">
            {{ isPlayingTts ? 'AI is speaking...' : 'Waiting for your question...' }}
          </span>
          <button
            v-if="isPlayingTts"
            type="button"
            class="btn btn-outline-danger btn-sm"
            @click="stopTtsPlayback"
          >
            Stop Voice
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.voice-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65); /* dark, semi-transparent */
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.voice-modal-card {
  background: #0f172a; /* slate-900 style */
  color: #e5e7eb;
  border-radius: 16px;
  padding: 20px 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.voice-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.wave-container {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Wave animation around mic button */
.wave-circle {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  border: 2px solid rgba(96, 165, 250, 0.4);
  opacity: 0;
  transform: scale(0.8);
}

.wave-active {
  animation: pulse-wave 1.4s infinite;
}

@keyframes pulse-wave {
  0% {
    opacity: 0.2;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}

.voice-mic-btn {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #22c55e, #0ea5e9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 10px 25px rgba(16, 185, 129, 0.5),
    0 0 0 1px rgba(15, 23, 42, 0.8);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.voice-mic-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 14px 30px rgba(16, 185, 129, 0.7),
    0 0 0 1px rgba(15, 23, 42, 0.9);
}

.voice-mic-btn-recording {
  background: linear-gradient(135deg, #f97316, #ef4444);
}

.voice-mic-icon {
  font-size: 32px;
  color: white;
}

.voice-progress {
  height: 8px;
  border-radius: 999px;
  background-color: rgba(148, 163, 184, 0.25);
}

.voice-progress .progress-bar {
  background: linear-gradient(90deg, #22c55e, #0ea5e9);
  border-radius: 999px;
}
</style>


