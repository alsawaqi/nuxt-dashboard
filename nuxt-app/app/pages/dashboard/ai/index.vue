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

// 🔹 multi-turn conversation history (frontend only)
type Turn = { user: string; assistant: string }
const conversationHistory = ref<Turn[]>([])

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

// 🔹 Top devices pie chart state
const topDevicesLabels = ref<string[]>([])
const topDevicesSeries = ref<number[]>([])
const topLocationsLabels = ref<string[]>([])
const topLocationsSeries = ref<number[]>([])
const topBanksLabels = ref<string[]>([])
const topBanksSeries = ref<number[]>([])
const dailyLabels = ref<string[]>([])
const dailySeries = ref<number[]>([])

// 🔹 Build labels + series from charity.by_devices
const buildTopDevicesPie = () => {
  const charity = searchQuery.value?.charity
  const byDevices = charity?.by_devices ?? []

  topDevicesLabels.value = byDevices.map((row: any) => {
    // Prefer model name, fallback to model number, then generic
    return (
      row.device?.devicemodel?.name ||
      row.device?.model_number ||
      `Device #${row.device_id}`
    )
  })

  topDevicesSeries.value = byDevices.map((row: any) =>
    Number(row.transactions_count ?? 0)
  )
}

// 🔹 Apex options for top devices pie
const topDevicesPieOptions = computed(() => ({
  chart: {
    type: 'pie',
  },
  labels: topDevicesLabels.value,
  legend: {
    position: 'bottom',
  },
  dataLabels: {
    enabled: true,
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val} tx`,
    },
  },
}))

// 🔹 Build labels + series from charity.by_charity_location
const buildTopLocationsPie = () => {
  const charity = searchQuery.value?.charity
  const byLocations = charity?.by_charity_location ?? []

  topLocationsLabels.value = byLocations.map((row: any) => {
    return (
      row.charity_location?.name ||
      `Location #${row.charity_location_id}`
    )
  })

  topLocationsSeries.value = byLocations.map((row: any) =>
    Number(row.transactions_count ?? 0)
  )
}

// 🔹 Apex options for top charity locations pie
const topLocationsPieOptions = computed(() => ({
  chart: {
    type: 'pie',
  },
  labels: topLocationsLabels.value,
  legend: {
    position: 'bottom',
  },
  dataLabels: {
    enabled: true,
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val} tx`,
    },
  },
}))

// 🔹 Build labels + series from charity.by_bank
const buildTopBanksPie = () => {
  const charity = searchQuery.value?.charity
  const byBank = charity?.by_bank ?? []

  topBanksLabels.value = byBank.map((row: any) => {
    // prefer short_name, fallback to name, then generic label
    return (
      row.bank?.short_name ||
      row.bank?.name ||
      `Bank #${row.bank_transaction_id}`
    )
  })

  topBanksSeries.value = byBank.map((row: any) =>
    Number(row.transactions_count ?? 0)
  )
}

// 🔹 Apex options for top banks pie
const topBanksPieOptions = computed(() => ({
  chart: {
    type: 'pie',
  },
  labels: topBanksLabels.value,
  legend: {
    position: 'bottom',
  },
  dataLabels: {
    enabled: true,
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val} tx`,
    },
  },
}))

// Build from charity.daily_totals
const buildDailyLineSeries = () => {
  const daily = searchQuery.value?.charity?.daily_totals ?? []

  dailyLabels.value = daily.map((row: any) => row.date)
  dailySeries.value = daily.map((row: any) =>
    Number(row.total_amount ?? 0),
  )
}

const showAnswerModal = ref(false)

const hasAnswer = computed(
  () => !!answerText.value && answerText.value.trim().length > 0
)

const openAnswerModal = () => {
  if (!hasAnswer.value) return
  showAnswerModal.value = true
}

const closeAnswerModal = () => {
  showAnswerModal.value = false
}

// 🔹 Reset conversation context (for new filters / new topic)
const resetConversation = () => {
  conversationHistory.value = []
  transcript.value = ''
  answerText.value = ''
}

// Apex options for the line chart
const dailyLineOptions = computed(() => ({
  chart: {
    type: 'line',
    toolbar: { show: false },
  },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: dailyLabels.value,
    labels: {
      rotate: 0,
    },
  },
  yaxis: {
    labels: {
      formatter: (val: number) => val.toFixed(3),
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val.toFixed(3)} OMR`,
    },
  },
}))

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
  // NOTE: conversationHistory is NOT reset here -> multi-turn context kept
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

    buildTopDevicesPie()
    buildTopLocationsPie()
    buildTopBanksPie()
    buildDailyLineSeries()

    // New data range -> reset AI context
    resetConversation()
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

// ---- Full STT + Analyze + TTS chain (multi-turn) ----
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

    // 2) Analyze: send JSON + question + last turns to /api/analyze
    status.value = 'Analyzing dashboard data...'
    stageLabel.value = 'Analyzing data...'
    progress.value = 60

    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: searchQuery.value,
        question: questionText,
        // 🔹 multi-turn context: only last 3 turns
        history: conversationHistory.value.slice(-3),
      }),
    })

    if (!analyzeRes.ok) {
      const err = await analyzeRes.text()
      throw new Error('Analyze failed: ' + err)
    }

    const analyzeJson = await analyzeRes.json()
    const answer = analyzeJson.answer || 'No answer returned.'
    answerText.value = answer

    // 🔹 Update conversation history (keep only last 3 turns)
    conversationHistory.value.push({
      user: questionText,
      assistant: answer,
    })
    if (conversationHistory.value.length > 3) {
      conversationHistory.value = conversationHistory.value.slice(-3)
    }

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
      <h6 class="fw-semibold mb-0">Ai Analysis</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Ai Analysis
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

            <div class="d-flex gap-2 align-items-center">
              <!-- Reset conversation context (appears only if we have history) -->
              <button
                v-if="conversationHistory.length"
                type="button"
                class="btn btn-soft-light btn-sm d-flex align-items-center gap-1"
                @click="resetConversation"
              >
                <iconify-icon icon="solar:refresh-bold-duotone" class="icon text-sm"></iconify-icon>
                New Topic
              </button>

              <!-- Show AI Answer button only if we already have an answer -->
              <button
                v-if="hasAnswer"
                type="button"
                class="btn btn-outline-secondary d-flex align-items-center gap-2"
                @click="openAnswerModal"
              >
                <iconify-icon icon="solar:chat-round-dots-bold-duotone" class="icon"></iconify-icon>
                View AI Insight
              </button>

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
          </div>

          <div class="card-body">
            <form class="row gy-3 needs-validation" novalidate @submit.prevent="search">
              <div class="col-md-6">
                <label class="form-label">FROM</label>
                <div class="icon-field has-validation">
                  <span class="icon">
                    <iconify-icon icon="solar:calendar-date-bold-duotone"></iconify-icon>
                  </span>
                  <input type="date" class="form-control" v-model="from" required />
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">TO</label>
                <div class="icon-field has-validation">
                  <span class="icon">
                    <iconify-icon icon="solar:calendar-date-bold-duotone"></iconify-icon>
                  </span>
                  <input type="date" class="form-control" v-model="to" required />
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

    <div class="dashboard-main-body" v-if="hasData">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 class="fw-semibold mb-0">Result</h6>
      </div>

      <div class="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
        <!-- Total Charities -->
        <div class="col">
          <div class="card shadow-none border bg-gradient-start-1 h-100">
            <div class="card-body p-20">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p class="fw-medium text-primary-light mb-1">Donations</p>
                  <h6 class="mb-0">{{ searchQuery.charity?.summary?.total_success_count }} </h6>
                </div>
                <div class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                  <iconify-icon icon="mdi:hand-heart-outline" class="text-white text-2xl mb-0"></iconify-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Total Charities Amount -->
        <div class="col">
          <div class="card shadow-none border bg-gradient-start-2 h-100">
            <div class="card-body p-20">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p class="fw-medium text-primary-light mb-1">Total Amount</p>
                  <h6 class="mb-0">{{ searchQuery.charity?.summary?.total_success_amount }} OMR</h6>
                </div>
                <div class="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                  <iconify-icon icon="mdi:hand-coin-outline" class="text-white text-2xl mb-0"></iconify-icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts & table (unchanged) -->
      <div class="row gy-4 mt-1">
        <div class="col-xxl-6 col-xl-12">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex flex-wrap align-items-center justify-content-between">
                <h6 class="text-lg mb-0">Charity Statistic</h6>
              </div>

              <div class="d-flex flex-wrap align-items-center gap-2 mt-8"></div>

              <div class="pt-28 apexcharts-tooltip-style-1">
                <ClientOnly>
                  <apexchart
                    v-if="dailySeries.length > 0"
                    type="line"
                    height="320"
                    :options="dailyLineOptions"
                    :series="[{ name: 'Total Amount (Success)', data: dailySeries }]"
                  />
                  <div v-else class="text-muted text-sm">
                    No charity data for this date range.
                  </div>
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xxl-3 col-xl-12">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                <h6 class="mb-2 fw-bold text-lg mb-0">Top Locations</h6>
              </div>

              <div class="mt-32">
                <ClientOnly>
                  <apexchart
                    v-if="topLocationsSeries.length > 0"
                    type="pie"
                    height="260"
                    :options="topLocationsPieOptions"
                    :series="topLocationsSeries"
                  />
                  <div v-else class="text-muted text-sm">
                    No charity location transactions found in this date range.
                  </div>
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xxl-3 col-xl-12">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                <h6 class="mb-2 fw-bold text-lg mb-0">Top Devices</h6>
                <a href="javascript:void(0)"
                  class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                  View All
                  <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                </a>
              </div>

              <div class="mt-32">
                <ClientOnly>
                  <apexchart
                    v-if="topDevicesSeries.length > 0"
                    type="pie"
                    height="260"
                    :options="topDevicesPieOptions"
                    :series="topDevicesSeries"
                  />
                  <div v-else class="text-muted text-sm">
                    No device transactions found in this date range.
                  </div>
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xxl-9 col-xl-12">
          <div class="card h-100">
            <div class="card-body p-24">
              <div class="d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16">
                <ul class="nav border-gradient-tab nav-pills mb-0" id="pills-tab" role="tablist">
                  <li class="nav-item" role="presentation">
                    <button
                      class="nav-link d-flex align-items-center active"
                      id="pills-to-do-list-tab"
                      data-bs-toggle="pill"
                      data-bs-target="#pills-to-do-list"
                      type="button"
                      role="tab"
                      aria-controls="pills-to-do-list"
                      aria-selected="true"
                    >
                      Latest Charities
                      <span
                        class="text-sm fw-semibold py-6 px-12 bg-neutral-500 rounded-pill text-white line-height-1 ms-12 notification-alert">
                      </span>
                    </button>
                  </li>
                </ul>
                <a href="javascript:void(0)"
                  class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                  View All
                  <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                </a>
              </div>

              <div class="tab-content" id="pills-tabContent">
                <div
                  class="tab-pane fade show active"
                  id="pills-to-do-list"
                  role="tabpanel"
                  aria-labelledby="pills-to-do-list-tab"
                  tabindex="0"
                >
                  <div class="table-responsive scroll-sm">
                    <table class="table bordered-table sm-table mb-0">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Device Name</th>
                          <th scope="col">Bank</th>
                          <th scope="col">Amount</th>
                          <th scope="col" class="text-center">Locations</th>
                          <th scope="col">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(transaction, index) in searchQuery.charity?.transactions"
                          :key="transaction.id"
                        >
                          <td>{{ index + 1 }}</td>
                          <td>{{ transaction.device?.devicemodel?.name }}</td>
                          <td>{{ transaction.bank?.name || 'N/A' }}</td>
                          <td>{{ transaction.total_amount }} OMR</td>
                          <td class="text-center">
                            {{ transaction.charity_location?.name || 'N/A' }}
                          </td>
                          <td>{{ new Date(transaction.created_at).toLocaleDateString() }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div class="col-xxl-3 col-xl-12">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                <h6 class="mb-2 fw-bold text-lg mb-0">Top Banks</h6>
                <a href="javascript:void(0)"
                  class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                  View All
                  <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                </a>
              </div>

              <div class="mt-32">
                <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                  <ClientOnly>
                    <apexchart
                      v-if="topBanksSeries.length > 0"
                      type="pie"
                      height="260"
                      :options="topBanksPieOptions"
                      :series="topBanksSeries"
                    />
                    <div v-else class="text-muted text-sm">
                      No bank transactions found in this date range.
                    </div>
                  </ClientOnly>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> <!-- row -->
    </div> <!-- dashboard-main-body (hasData) -->

    <!-- Error display (optional) -->
    <div v-if="error" class="alert alert-danger mt-3">
      {{ error }}
    </div>

    <!-- Voice Modal Overlay -->
    <div v-if="showVoiceModal" class="voice-modal-overlay" @click.self="closeVoiceModal">
      <div class="voice-modal-card">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge rounded-pill voice-pill-status">
                <span class="voice-pill-dot"></span>
                {{ isRecording ? 'Listening' : isAnalyzing ? 'Analyzing' : isPlayingTts ? 'Speaking' : 'Ready' }}
              </span>
            </div>
            <h5 class="mb-0 mt-2">AI Voice Assistant</h5>
            <p class="text-muted small mb-0">
              Ask a question about this dashboard. I’ll analyze the data and speak back the answer.
            </p>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-outline-secondary rounded-circle voice-close-btn"
            @click="closeVoiceModal"
          >
            ✕
          </button>
        </div>

        <!-- Wave + Mic Button -->
        <div class="voice-center my-3">
          <div class="wave-container">
            <span class="wave-ring ring-1" :class="{ 'wave-ring-active': isRecording }"></span>
            <span class="wave-ring ring-2" :class="{ 'wave-ring-active': isRecording }"></span>
            <span class="wave-ring ring-3" :class="{ 'wave-ring-active': isRecording }"></span>

            <button
              type="button"
              class="voice-mic-btn"
              :class="{ 'voice-mic-btn-recording': isRecording }"
              @click="startOrStopRecording"
            >
              <iconify-icon
                :icon="isRecording ? 'solar:stop-bold-duotone' : 'solar:microphone-bold-duotone'"
                class="voice-mic-icon">
              </iconify-icon>
            </button>
          </div>

          <div class="mt-3 text-center">
            <div class="fw-semibold text-dark">{{ stageLabel }}</div>
            <div class="text-muted small">{{ status }}</div>
          </div>
        </div>

        <!-- Progress bar for STT + Analyze + TTS -->
        <div class="mt-3">
          <div class="d-flex justify-content-between mb-1">
            <span class="small text-muted">Analysis progress</span>
            <span class="small text-muted">{{ progress }}%</span>
          </div>
          <div class="voice-progress-track">
            <div class="voice-progress-bar" :style="{ width: progress + '%' }"></div>
          </div>
        </div>

        <!-- Bottom row: hint + stop button -->
        <div class="mt-3 d-flex justify-content-between align-items-center">
          <span class="small text-muted">
            {{ isPlayingTts ? 'AI is speaking…' : 'Tap the mic to start and stop recording.' }}
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

    <!-- AI Answer Modal -->
    <div
      v-if="showAnswerModal"
      class="answer-modal-overlay"
      @click.self="closeAnswerModal"
    >
      <div class="answer-modal-card">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 class="mb-1">AI Insight</h6>
            <p class="text-muted small mb-1">
              Explanation generated from the current dashboard data.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary rounded-circle"
            @click="closeAnswerModal"
          >
            ✕
          </button>
        </div>

        <div class="mb-3">
          <p class="text-muted small mb-1">Your latest question</p>
          <div class="answer-question-pill">
            {{ transcript || 'No question text available.' }}
          </div>
        </div>

        <div>
          <p class="text-muted small mb-1">AI explanation</p>
          <div class="answer-text-body">
            {{ answerText || 'No answer received yet.' }}
          </div>
        </div>

        <!-- Recent conversation (multi-turn thread) -->
        <div
          v-if="conversationHistory.length"
          class="answer-history mt-3"
        >
          <p class="text-muted small mb-1">Recent conversation</p>
          <div class="answer-history-list">
            <div
              v-for="(turn, idx) in conversationHistory"
              :key="idx"
              class="answer-turn"
            >
              <div class="answer-turn-q">
                <span class="turn-label">Q{{ idx + 1 }}:</span>
                <span class="turn-text">{{ turn.user }}</span>
              </div>
              <div class="answer-turn-a">
                <span class="turn-label">A{{ idx + 1 }}:</span>
                <span class="turn-text">{{ turn.assistant }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.voice-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.voice-modal-card {
  background: #ffffff;
  color: #0f172a;
  border-radius: 20px;
  padding: 20px 24px 18px;
  width: 100%;
  max-width: 420px;
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(226, 232, 240, 0.9);
  position: relative;
  overflow: hidden;
}

/* subtle top gradient strip */
.voice-modal-card::before {
  content: "";
  position: absolute;
  inset: 0;
  height: 4px;
  background: linear-gradient(90deg, #22c55e, #0ea5e9);
  opacity: 0.85;
}

/* Status pill in header */
.voice-pill-status {
  background: rgba(34, 197, 94, 0.08);
  color: #166534;
  font-size: 11px;
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.voice-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  animation: pulse-dot 1.4s infinite;
}

@keyframes pulse-dot {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.voice-close-btn {
  border-radius: 50% !important;
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Center & wave */
.voice-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.wave-container {
  position: relative;
  width: 170px;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* concentric animated rings */
.wave-ring {
  position: absolute;
  border-radius: 999px;
  border: 2px solid rgba(56, 189, 248, 0.4);
  opacity: 0;
  transform: scale(0.8);
}

.ring-1 {
  width: 120px;
  height: 120px;
}

.ring-2 {
  width: 145px;
  height: 145px;
}

.ring-3 {
  width: 170px;
  height: 170px;
}

.wave-ring-active {
  animation: ring-pulse 1.6s infinite;
}

.ring-2.wave-ring-active {
  animation-delay: 0.25s;
}

.ring-3.wave-ring-active {
  animation-delay: 0.5s;
}

@keyframes ring-pulse {
  0% {
    opacity: 0.1;
    transform: scale(0.85);
  }
  40% {
    opacity: 0.5;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.15);
  }
}

/* mic button */
.voice-mic-btn {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 999px;
  border: none;
  background: radial-gradient(circle at 30% 20%, #a5f3fc, #0ea5e9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 12px 26px rgba(15, 118, 110, 0.35),
    0 0 0 1px rgba(226, 232, 240, 0.9);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    background 0.15s ease;
}

.voice-mic-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 16px 32px rgba(14, 116, 144, 0.4),
    0 0 0 1px rgba(226, 232, 240, 1);
}

.voice-mic-btn-recording {
  background: radial-gradient(circle at 30% 20%, #fed7aa, #f97316);
  box-shadow:
    0 16px 32px rgba(234, 88, 12, 0.45),
    0 0 0 1px rgba(254, 243, 199, 0.9);
}

.voice-mic-icon {
  font-size: 32px;
  color: #ffffff;
}

/* progress */
.voice-progress-track {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.voice-progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #22c55e, #0ea5e9);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: -200% 50%;
  }
}

/* --- AI Answer Modal --- */
.answer-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: transparent;
  pointer-events: none;
  z-index: 10000;
}

.answer-modal-card {
  pointer-events: auto;
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px 14px;
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(226, 232, 240, 0.9);
  border-top: 3px solid #0ea5e9;
  animation: slide-up-fade 0.22s ease-out;
}

/* slide up animation */
@keyframes slide-up-fade {
  0% {
    opacity: 0;
    transform: translateY(16px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.answer-question-pill {
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  font-size: 12px;
  background: #f9fafb;
  color: #374151;
  max-height: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.answer-text-body {
  max-height: 180px;
  overflow-y: auto;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #f9fafb, #f3f4f6);
  font-size: 13px;
  line-height: 1.5;
  color: #111827;
}

/* conversation history section */
.answer-history-list {
  max-height: 160px;
  overflow-y: auto;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px dashed #e5e7eb;
  background: #f9fafb;
}

.answer-turn + .answer-turn {
  margin-top: 6px;
}

.answer-turn-q,
.answer-turn-a {
  display: flex;
  gap: 6px;
  font-size: 12px;
}

.answer-turn-q {
  color: #111827;
}

.answer-turn-a {
  color: #374151;
}

.turn-label {
  font-weight: 600;
  color: #0ea5e9;
}

.turn-text {
  flex: 1;
}
</style>
