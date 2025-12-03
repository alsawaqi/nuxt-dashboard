<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
  ssr: false,
})

const { $api } = useNuxtApp()

// ---------------- Base state ----------------
const from = ref<string | null>(null)
const to = ref<string | null>(null)
const loading = ref(false)
const searchQuery = ref<any>({})

// KPIs / chart data
const dailyLabels = ref<string[]>([])
const dailySeries = ref<number[]>([])

const hasData = computed(() => {
  if (!searchQuery.value) return false
  if (Array.isArray(searchQuery.value)) return searchQuery.value.length > 0
  return Object.keys(searchQuery.value).length > 0
})

// ---------------- Build daily line from charity.daily_totals ----------------
const buildDailyLineSeries = () => {
  const daily = searchQuery.value?.charity?.daily_totals ?? []
  dailyLabels.value = daily.map((row: any) => row.date)
  dailySeries.value = daily.map((row: any) => Number(row.total_amount ?? 0))
}

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

// ---------------- AI insights state ----------------
type AiInsights = {
  overview: string
  key_highlights: string[]
  trends: string[]
  locations: string[]
  devices: string[]
  banks: string[]
  risks: string[]
  recommendations: string[]
  suggested_questions: string[]
}

const insights = ref<AiInsights | null>(null)
const insightsLoading = ref(false)
const insightsError = ref('')
const showInsights = ref(false)

const hasInsights = computed(() => !!insights.value)

// ---------------- Load dashboard data (Laravel API) ----------------
const search = async (): Promise<void> => {
  loading.value = true
  insights.value = null
  insightsError.value = ''
  showInsights.value = false

  try {
    const { data } = await $api.get('/api/ai-dashboard-search', {
      params: {
        from: from.value,
        to: to.value,
      },
    })

    searchQuery.value = data
    buildDailyLineSeries()
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ---------------- Call AI to generate insights ----------------
const generateInsights = async () => {
  if (!hasData.value) return

  insightsLoading.value = true
  insightsError.value = ''
  showInsights.value = true // open the card immediately with loading state

  try {
    const res: any = await $fetch('/api/dashboard-insights', {
      method: 'POST',
      body: {
        data: searchQuery.value,
      },
    })

    if (!res?.success) {
      throw new Error('AI did not return success = true')
    }

    insights.value = res.insights as AiInsights
  } catch (e: any) {
    console.error('Insights error:', e)
    insightsError.value = e?.message || 'Failed to generate AI insights.'
  } finally {
    insightsLoading.value = false
  }
}
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">AI Overview (Level 1)</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="#" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">AI Overview</li>
      </ul>
    </div>

    <!-- Filters card -->
    <div class="row gy-4">
      <div class="col-lg-12">
        <div class="card">
          <div
            class="card-header d-flex justify-content-between align-items-center"
          >
            <h5 class="card-title mb-0">Charity Status (Filtered)</h5>

            <!-- AI button (enabled only if we have data) -->
            <button
              type="button"
              class="btn btn-primary-600 d-flex align-items-center gap-2"
              :disabled="!hasData || insightsLoading"
              @click="generateInsights"
            >
              <span v-if="insightsLoading" class="spinner-border spinner-border-sm"></span>
              <iconify-icon
                v-else
                icon="solar:sparkles-bold-duotone"
                class="icon"
              ></iconify-icon>
              {{ insightsLoading ? 'Analyzing...' : 'Generate AI Insights' }}
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
                  {{ loading ? 'Loading...' : 'Search' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs + charts -->
    <div v-if="hasData" class="mt-4">
      <div class="row row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
        <!-- Total donations count -->
        <div class="col">
          <div class="card shadow-none border bg-gradient-start-1 h-100">
            <div class="card-body p-20">
              <div
                class="d-flex flex-wrap align-items-center justify-content-between gap-3"
              >
                <div>
                  <p class="fw-medium text-primary-light mb-1">Donations</p>
                  <h6 class="mb-0">
                    {{ searchQuery.charity?.summary?.total_success_count ?? 0 }}
                  </h6>
                </div>
                <div
                  class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center"
                >
                  <iconify-icon
                    icon="mdi:hand-heart-outline"
                    class="text-white text-2xl mb-0"
                  ></iconify-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Total amount -->
        <div class="col">
          <div class="card shadow-none border bg-gradient-start-2 h-100">
            <div class="card-body p-20">
              <div
                class="d-flex flex-wrap align-items-center justify-content-between gap-3"
              >
                <div>
                  <p class="fw-medium text-primary-light mb-1">Total Amount</p>
                  <h6 class="mb-0">
                    {{ searchQuery.charity?.summary?.total_success_amount ?? 0 }} OMR
                  </h6>
                </div>
                <div
                  class="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center"
                >
                  <iconify-icon
                    icon="mdi:hand-coin-outline"
                    class="text-white text-2xl mb-0"
                  ></iconify-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Period -->
        <div class="col">
          <div class="card shadow-none border bg-gradient-start-3 h-100">
            <div class="card-body p-20">
              <div
                class="d-flex flex-wrap align-items-center justify-content-between gap-3"
              >
                <div>
                  <p class="fw-medium text-primary-light mb-1">Period</p>
                  <h6 class="mb-0 text-sm">
                    {{ searchQuery.charity?.summary?.from }}<br />
                    → {{ searchQuery.charity?.summary?.to }}
                  </h6>
                </div>
                <div
                  class="w-50-px h-50-px bg-primary-600 rounded-circle d-flex justify-content-center align-items-center"
                >
                  <iconify-icon
                    icon="solar:calendar-bold-duotone"
                    class="text-white text-2xl mb-0"
                  ></iconify-icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Line chart -->
      <div class="row gy-4 mt-2">
        <div class="col-xxl-8 col-xl-12">
          <div class="card h-100">
            <div class="card-body">
              <div
                class="d-flex flex-wrap align-items-center justify-content-between"
              >
                <h6 class="text-lg mb-0">Daily Donations</h6>
              </div>

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

        <!-- AI insights card -->
        <div class="col-xxl-4 col-xl-12">
          <div class="card ai-card h-100">
            <div class="card-body">
              <div class="d-flex align-items-start justify-content-between mb-2">
                <div>
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="ai-badge">
                      <span class="dot"></span>
                      AI Summary
                    </span>
                  </div>
                  <h6 class="mb-1">AI Insights for this period</h6>
                  <p class="text-muted small mb-0">
                    Generated from donations, locations, devices and banks.
                  </p>
                </div>
              </div>

              <div v-if="!showInsights" class="mt-3">
                <p class="text-muted small mb-2">
                  Click <strong>Generate AI Insights</strong> above after you load data.
                </p>
              </div>

              <div v-else class="mt-3 ai-content">
                <!-- Loading state -->
                <div v-if="insightsLoading" class="d-flex align-items-center gap-2">
                  <span class="spinner-border spinner-border-sm" role="status"></span>
                  <span class="text-muted small">Analyzing dashboard data...</span>
                </div>

                <!-- Error state -->
                <div v-else-if="insightsError" class="alert alert-danger mb-2">
                  {{ insightsError }}
                </div>

                <!-- Insights -->
                <div v-else-if="insights">
                  <p class="mb-2 ai-overview">
                    {{ insights.overview }}
                  </p>

                  <div class="ai-section" v-if="insights.key_highlights?.length">
                    <p class="ai-section-title">Key highlights</p>
                    <ul>
                      <li v-for="(item, i) in insights.key_highlights" :key="'h-' + i">
                        {{ item }}
                      </li>
                    </ul>
                  </div>

                  <div class="ai-section" v-if="insights.trends?.length">
                    <p class="ai-section-title">Trends</p>
                    <ul>
                      <li v-for="(item, i) in insights.trends" :key="'t-' + i">
                        {{ item }}
                      </li>
                    </ul>
                  </div>

                  <div class="ai-section" v-if="insights.recommendations?.length">
                    <p class="ai-section-title">Recommendations</p>
                    <ul>
                      <li
                        v-for="(item, i) in insights.recommendations"
                        :key="'r-' + i"
                      >
                        {{ item }}
                      </li>
                    </ul>
                  </div>

                  <div class="ai-section" v-if="insights.suggested_questions?.length">
                    <p class="ai-section-title">Suggested questions</p>
                    <div class="d-flex flex-wrap gap-2">
                      <span
                        v-for="(q, i) in insights.suggested_questions"
                        :key="'q-' + i"
                        class="badge rounded-pill bg-light text-muted small"
                      >
                        {{ q }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-else class="text-muted small">
                  No insights available yet.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- You can add more charts (Top Locations, Devices, Banks) below here
           exactly like your Level 2 page.
      -->
    </div>
  </div>
</template>

<style scoped>
.ai-card {
  border-radius: 18px;
  position: relative;
  overflow: hidden;
}

.ai-card::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background: radial-gradient(circle at 0% 0%, #a5f3fc, transparent 55%),
    radial-gradient(circle at 100% 0%, #bbf7d0, transparent 60%);
  pointer-events: none;
}

.ai-card > .card-body {
  position: relative;
  z-index: 1;
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.18);
  font-size: 11px;
  color: #1d4ed8;
}

.ai-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  animation: ai-dot 1.4s infinite;
}

@keyframes ai-dot {
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

.ai-content {
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.ai-overview {
  font-size: 13px;
  color: #111827;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(209, 213, 219, 0.7);
}

.ai-section {
  margin-top: 8px;
}

.ai-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
}

.ai-section ul {
  padding-left: 18px;
  margin-bottom: 4px;
}

.ai-section li {
  font-size: 12px;
  color: #111827;
}
</style>
