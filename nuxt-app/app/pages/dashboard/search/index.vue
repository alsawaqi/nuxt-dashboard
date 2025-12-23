 <script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { ApexOptions } from 'apexcharts'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()

type RangeKey = '7d' | '30d' | '6m' | 'custom'

const activeRange = ref<RangeKey>('7d')
const from = ref('')
const to = ref('')

const loading = ref(false)
const error = ref<string | null>(null)

// ---- totals (raw from API)
const totalSuccess = ref(0)
const totalFailed = ref(0)

// ---- totals (animated display)
const displaySuccess = ref(0)
const displayFailed = ref(0)

const rangeLabel = computed(() => {
  if (activeRange.value === '7d') return 'Last 7 days'
  if (activeRange.value === '30d') return 'Last 30 days'
  if (activeRange.value === '6m') return 'Last 6 months'
  if (activeRange.value === 'custom') return 'Custom range'
  return '—'
})

function countUp(to: number, target: any, duration = 700) {
  const start = Number(target.value || 0)
  const end = Number(to || 0)
  const startTs = performance.now()

  const tick = (now: number) => {
    const p = Math.min(1, (now - startTs) / duration)
    // easeOutCubic
    const eased = 1 - Math.pow(1 - p, 3)
    target.value = start + (end - start) * eased
    if (p < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

watch(totalSuccess, (v) => countUp(v, displaySuccess, 800))
watch(totalFailed, (v) => countUp(v, displayFailed, 800))

const fmtMoney = (n: any) => `${Number(n || 0).toFixed(2)} OMR`

// ApexCharts typings in some versions don't include `animations.easing`.
// Keep easing at runtime while satisfying TS.
const chartAnimations: any = { enabled: true, easing: 'easeinout', speed: 650 }

// ✅ bar chart
const barSeries = ref([{ name: 'Success Amount', data: [] as number[] }])

const barOptions = ref<ApexOptions>({
  chart: {
    type: 'bar',
    height: 350,
    toolbar: { show: false },
    animations: chartAnimations,
  },
  plotOptions: {
    bar: {
      columnWidth: '55%',
      borderRadius: 10,
    },
  },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'category',
    categories: [] as string[],
    labels: { rotate: -40 },
  },
  yaxis: {
    labels: { formatter: (val) => Number(val).toFixed(1) },
  },
  tooltip: {
    theme: 'dark',
    y: { formatter: (val) => `${Number(val).toFixed(2)} OMR` },
  },
  grid: { borderColor: 'rgba(148,163,184,.25)' },
  colors: ['#4f46e5'],
})

// pie palette (still nice, but a bit richer)
const pieColors = ['#22c55e', '#60a5fa', '#a78bfa', '#fb7185', '#f59e0b', '#14b8a6']

// ✅ top devices
type TopRow = { label: string; total_amount: number; tx_count?: number; location_label?: string }

const topDevices = ref<TopRow[]>([])
const devicesLabels = computed(() => topDevices.value.map((d) => d.label))
const devicesSeries = computed(() => topDevices.value.map((d) => Number(d.total_amount) || 0))
const maxDevice = computed(() => Math.max(1, ...devicesSeries.value))

const devicesPieOptions = ref<ApexOptions>({
  chart: {
    type: 'donut',
    height: 270,
    animations: chartAnimations,
  },
  labels: [],
  colors: pieColors,
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 0 },
  tooltip: { theme: 'dark' },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          name: {
            show: true,
            offsetY: 10,
            fontSize: '13px',
            color: '#64748b',
            formatter: () => 'Devices',
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 700,
            formatter: (val: string) => Number(val).toFixed(0),
          },
          total: {
            show: true,
            label: 'Total',
            formatter: (w: any) =>
              (w.globals.seriesTotals || []).reduce((a: number, b: number) => a + b, 0).toFixed(0),
          },
        },
      },
    },
  },
})

// ✅ top locations
const topLocations = ref<TopRow[]>([])
const locationsLabels = computed(() => topLocations.value.map((d) => d.label))
const locationsSeries = computed(() => topLocations.value.map((d) => Number(d.total_amount) || 0))
const maxLocation = computed(() => Math.max(1, ...locationsSeries.value))

const locationsPieOptions = ref<ApexOptions>({
  chart: {
    type: 'donut',
    height: 270,
    animations: chartAnimations,
  },
  labels: [],
  colors: pieColors,
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 0 },
  tooltip: { theme: 'dark' },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          name: {
            show: true,
            offsetY: 10,
            fontSize: '13px',
            color: '#64748b',
            formatter: () => 'Locations',
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 700,
            formatter: (val: string) => Number(val).toFixed(0),
          },
          total: {
            show: true,
            label: 'Total',
            formatter: (w: any) =>
              (w.globals.seriesTotals || []).reduce((a: number, b: number) => a + b, 0).toFixed(0),
          },
        },
      },
    },
  },
})

// ✅ Sales by hour (heatmap)
const salesByHourSeries = ref<{ name: string; data: number[] }[]>([])

const salesByHourOptions = ref<ApexOptions>({
  chart: {
    type: 'heatmap',
    height: 520,
    toolbar: { show: false },
    foreColor: '#111827',              // ✅ dark text
    background: '#ffffff',             // ✅ light background
    animations: chartAnimations,
  },

  theme: { mode: 'light' },            // ✅ light mode

  dataLabels: {
    enabled: true,
    style: { fontSize: '10px', colors: ['#111827'] }, // ✅ readable
    formatter: (val: number) => (val > 0 ? val.toFixed(1) : ''),
  },

  xaxis: {
    type: 'category',
    categories: [] as string[],
    labels: { style: { colors: '#374151' } },         // gray-700
  },

  yaxis: {
    labels: { style: { colors: '#374151' } },         // gray-700
  },

  grid: {
    borderColor: '#E5E7EB',                            // ✅ light grid
    padding: { left: 8, right: 8, top: 0, bottom: 0 },
  },

  stroke: { width: 2, colors: ['#FFFFFF'] },           // ✅ clean cell separators

  plotOptions: {
    heatmap: {
      radius: 6,
      shadeIntensity: 0.25,                            // ✅ softer look
      colorScale: {
        ranges: [
          { from: 0, to: 0, color: '#F3F4F6', name: 'No sales' },        // gray-100
          { from: 0.01, to: 10, color: '#FFEDD5', name: 'Low' },         // orange-100
          { from: 10.01, to: 50, color: '#FDBA74', name: 'Medium' },     // orange-300
          { from: 50.01, to: 1000000, color: '#FB923C', name: 'High' },  // orange-400/500-ish
        ],
      },
    },
  },

  tooltip: {
    theme: 'light',                                     // ✅ light tooltip
    y: { formatter: (val: number) => `OMR ${Number(val).toFixed(2)}` },
  },
})


const fetchStatus = async () => {
  try {
    loading.value = true
    error.value = null

    const params: Record<string, any> = { range: activeRange.value }

    if (activeRange.value === 'custom') {
      if (!from.value || !to.value) {
        loading.value = false
        return
      }
      params.from = from.value
      params.to = to.value
    }

    const { data } = await $api.get('/api/stats/charity/status', { params })

    totalSuccess.value = Number(data.totals?.success || 0)
    totalFailed.value = Number(data.totals?.failed || 0)

    // bar
    const categories = (data.bar?.categories || []) as string[]
    const values = (data.bar?.data || []).map((v: any) => Number(v) || 0)

    barSeries.value = [{ name: 'Success Amount', data: values }]
    barOptions.value = {
      ...barOptions.value,
      xaxis: { ...(barOptions.value.xaxis || {}), categories, labels: { rotate: -40 } },
    }

    // top devices
    topDevices.value = ((data.top_devices || []) as TopRow[]).map((d) => ({
      ...d,
      total_amount: Number(d.total_amount) || 0,
    }))
    devicesPieOptions.value = { ...devicesPieOptions.value, labels: devicesLabels.value, colors: pieColors }

    // top locations
    topLocations.value = ((data.top_locations || []) as TopRow[]).map((d) => ({
      ...d,
      total_amount: Number(d.total_amount) || 0,
    }))
    locationsPieOptions.value = { ...locationsPieOptions.value, labels: locationsLabels.value, colors: pieColors }

    // heatmap
    if (data.sales_by_hour) {
      const cats = (data.sales_by_hour.categories || []) as string[]
      const rawSeries = (data.sales_by_hour.series || []) as { name: string; data: (number | string)[] }[]

      salesByHourSeries.value = rawSeries.map((row) => ({
        name: row.name,
        data: row.data.map((v) => Number(v) || 0),
      }))

      salesByHourOptions.value = {
        ...salesByHourOptions.value,
        xaxis: { ...(salesByHourOptions.value.xaxis || {}), categories: cats },
      }
    } else {
      salesByHourSeries.value = []
    }
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load status statistics.'
  } finally {
    loading.value = false
  }
}

const changeRange = (range: RangeKey) => {
  activeRange.value = range
  if (range !== 'custom') {
    from.value = ''
    to.value = ''
    fetchStatus()
  }
}

onMounted(fetchStatus)
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-0">Charity Status</h6>
        <div class="text-muted small">Analytics for successes, failures, devices, locations, and hourly activity.</div>
      </div>

      <span class="badge bg-primary-50 text-primary-600 px-3 py-2">
        <iconify-icon icon="mdi:calendar-range" class="me-1"></iconify-icon>
        {{ rangeLabel }}
      </span>
    </div>

    <!-- Range toolbar -->
    <div class="card border-0 shadow-sm mb-24 reveal">
      <div class="card-body p-20 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-11"
            :class="activeRange === '7d' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('7d')"
          >
            Last 7 Days
          </button>

          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-11"
            :class="activeRange === '30d' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('30d')"
          >
            Last 30 Days
          </button>

          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-11"
            :class="activeRange === '6m' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('6m')"
          >
            Last 6 Months
          </button>

          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-11"
            :class="activeRange === 'custom' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('custom')"
          >
            Custom
          </button>
        </div>

        <div v-if="loading" class="d-flex align-items-center gap-2 text-muted small">
          <span class="spinner-border spinner-border-sm"></span>
          Loading…
        </div>
      </div>

      <!-- custom date range -->
      <div v-if="activeRange === 'custom'" class="card-body pt-0 p-20">
        <div class="row g-2">
          <div class="col-md-4">
            <label class="form-label mb-1">From</label>
            <input v-model="from" type="date" class="form-control" />
          </div>
          <div class="col-md-4">
            <label class="form-label mb-1">To</label>
            <input v-model="to" type="date" class="form-control" />
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <button type="button" class="btn btn-primary-600 w-100" :disabled="!from || !to || loading" @click="fetchStatus">
              Apply
            </button>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="row gy-4 mb-24">
      <div class="col-lg-6">
        <div class="card kpi-card kpi-success reveal">
          <div class="card-body p-20 d-flex align-items-center justify-content-between gap-3">
            <div>
              <div class="text-muted fw-medium">Total Donations (Successful)</div>
              <div class="kpi-value">{{ fmtMoney(displaySuccess) }}</div>
              <div class="text-muted small">Sum of successful transactions in range</div>
            </div>
            <div class="kpi-icon bg-success">
              <iconify-icon icon="mdi:hand-heart-outline" class="text-white text-2xl"></iconify-icon>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card kpi-card kpi-failed reveal">
          <div class="card-body p-20 d-flex align-items-center justify-content-between gap-3">
            <div>
              <div class="text-muted fw-medium">Total Donations (Failed)</div>
              <div class="kpi-value">{{ fmtMoney(displayFailed) }}</div>
              <div class="text-muted small">Sum of failed transactions in range</div>
            </div>
            <div class="kpi-icon bg-danger">
              <iconify-icon icon="mdi:alert-circle-outline" class="text-white text-2xl"></iconify-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bar chart -->
    <div class="card border-0 shadow-sm mb-24 hover-lift reveal">
      <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between">
        <div>
          <h6 class="mb-0 fw-bold">Daily Success Amount</h6>
          <div class="text-muted small">How successful donations move day-by-day.</div>
        </div>
        <span class="badge bg-primary-50 text-primary-600">Bar</span>
      </div>

      <div class="card-body">
        <div v-if="loading" class="chart-skel"></div>
        <ClientOnly v-else>
          <apexchart type="bar" height="340" :options="barOptions" :series="barSeries" />
        </ClientOnly>
      </div>
    </div>

    <!-- Top Devices + Top Locations -->
    <div class="row gy-4 mb-24">
      <!-- Devices -->
      <div class="col-xxl-6 col-xl-12">
        <div class="card border-0 shadow-sm hover-lift reveal h-100">
          <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between">
            <div>
              <h6 class="mb-0 fw-bold">Top Devices</h6>
              <div class="text-muted small">Ranked by success amount.</div>
            </div>
            <span class="badge bg-success-soft text-success">Donut + Ranking</span>
          </div>

          <div class="card-body">
            <div v-if="loading" class="chart-skel"></div>

            <div v-else class="row g-3 align-items-center">
              <div class="col-lg-5">
                <ClientOnly>
                  <apexchart type="donut" height="270" :options="devicesPieOptions" :series="devicesSeries" />
                </ClientOnly>
              </div>

              <div class="col-lg-7">
                <div v-if="!topDevices.length" class="text-muted small">No device data.</div>

                <div v-else class="rank-list">
                  <div v-for="(d, i) in topDevices" :key="d.label" class="rank-item">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                      <div>
                        <div class="fw-semibold">{{ i + 1 }}. {{ d.label }}</div>
                        <div v-if="d.location_label" class="text-muted small">
                          Top location: {{ d.location_label }}
                        </div>
                        <div v-if="d.tx_count != null" class="text-muted small">
                          {{ d.tx_count }} tx
                        </div>
                      </div>
                      <div class="fw-bold">{{ fmtMoney(d.total_amount) }}</div>
                    </div>

                    <div class="mini-bar mt-2">
                      <div class="mini-bar-fill" :style="{ width: ((d.total_amount / maxDevice) * 100) + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Locations -->
      <div class="col-xxl-6 col-xl-12">
        <div class="card border-0 shadow-sm hover-lift reveal h-100">
          <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between">
            <div>
              <h6 class="mb-0 fw-bold">Top Locations</h6>
              <div class="text-muted small">Ranked by success amount.</div>
            </div>
            <span class="badge bg-primary-50 text-primary-600">Donut + Ranking</span>
          </div>

          <div class="card-body">
            <div v-if="loading" class="chart-skel"></div>

            <div v-else class="row g-3 align-items-center">
              <div class="col-lg-5">
                <ClientOnly>
                  <apexchart type="donut" height="270" :options="locationsPieOptions" :series="locationsSeries" />
                </ClientOnly>
              </div>

              <div class="col-lg-7">
                <div v-if="!topLocations.length" class="text-muted small">No location data.</div>

                <div v-else class="rank-list">
                  <div v-for="(d, i) in topLocations" :key="d.label" class="rank-item">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                      <div class="fw-semibold">{{ i + 1 }}. {{ d.label }}</div>
                      <div class="fw-bold">{{ fmtMoney(d.total_amount) }}</div>
                    </div>

                    <div class="mini-bar mt-2">
                      <div class="mini-bar-fill mini-bar-fill-2" :style="{ width: ((d.total_amount / maxLocation) * 100) + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Sales by hour (Heatmap) -->
    <div class="card border-0 shadow-sm hover-lift reveal">
      <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-3">
          <div class="heat-icon">
            <iconify-icon icon="mdi:chart-timeline-variant-shimmer" class="text-white text-xl"></iconify-icon>
          </div>
          <div>
            <h6 class="mb-0 fw-bold">Sales by Hour</h6>
            <div class="text-muted small">Successful donations grouped by weekday & hour.</div>
          </div>
        </div>
        <span class="badge bg-dark text-white">Heatmap</span>
      </div>

      <div class="card-body">
        <div v-if="loading" class="chart-skel dark"></div>

        <ClientOnly v-else>
          <div class="heat-panel">
            <apexchart type="heatmap" height="520" :options="salesByHourOptions" :series="salesByHourSeries" />
          </div>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3">
            <div class="d-flex flex-wrap align-items-center gap-3 small text-muted">
              <span class="legend-pill"><i class="dot dot-0"></i> No sales</span>
              <span class="legend-pill"><i class="dot dot-1"></i> Low</span>
              <span class="legend-pill"><i class="dot dot-2"></i> Medium</span>
              <span class="legend-pill"><i class="dot dot-3"></i> High</span>
            </div>

            <div class="text-muted small">
              Tip: darker cells = peak hours. Use this for campaign timing.
            </div>
          </div>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ---- reveal animation ---- */
.reveal {
  animation: floatIn 520ms ease-out both;
}
@keyframes floatIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- hover lift ---- */
.hover-lift {
  transition: transform .18s ease, box-shadow .18s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
}

/* ---- KPI cards ---- */
.kpi-card {
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
.kpi-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(600px 200px at 80% 0%, rgba(79,70,229,.12), transparent 60%);
  pointer-events: none;
}
.kpi-success::after {
  background: radial-gradient(600px 200px at 80% 0%, rgba(34,197,94,.14), transparent 60%);
}
.kpi-failed::after {
  background: radial-gradient(600px 200px at 80% 0%, rgba(239,68,68,.14), transparent 60%);
}
.kpi-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: .2px;
  margin-top: 6px;
}
.kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 20px rgba(2, 6, 23, .08);
}

/* ---- ranking list ---- */
.rank-list { display: grid; gap: 12px; }
.rank-item {
  padding: 12px;
  border: 1px solid rgba(148,163,184,.22);
  border-radius: 12px;
  background: rgba(255,255,255,.55);
  transition: transform .15s ease, border-color .15s ease;
}
.rank-item:hover {
  transform: translateY(-1px);
  border-color: rgba(79,70,229,.35);
}
.mini-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(148,163,184,.22);
  overflow: hidden;
}
.mini-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(34,197,94,.85), rgba(79,70,229,.85));
  width: 0%;
  transition: width .55s ease;
}
.mini-bar-fill-2 {
  background: linear-gradient(90deg, rgba(96,165,250,.9), rgba(79,70,229,.85));
}

/* ---- heatmap panel (dark) ---- */
.heat-panel {
  border-radius: 16px;
  padding: 14px;
  background: radial-gradient(900px 300px at 10% 0%, rgba(79,70,229,.18), transparent 60%),
              linear-gradient(180deg, #3270eb, #0b1220);
  border: 1px solid rgba(148,163,184,.16);
}
.heat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #4f46e5, #22c55e);
  box-shadow: 0 10px 22px rgba(2, 6, 23, .25);
}

/* ---- legend dots ---- */
.legend-pill { display: inline-flex; align-items: center; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.dot-0 { background: #0b1220; border: 1px solid rgba(148,163,184,.25); }
.dot-1 { background: #1f2a44; }
.dot-2 { background: #2b4c7e; }
.dot-3 { background: #4f46e5; }

/* ---- skeleton ---- */
.chart-skel {
  height: 340px;
  border-radius: 16px;
  background: linear-gradient(90deg, rgba(226,232,240,.55), rgba(226,232,240,.85), rgba(226,232,240,.55));
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
}
.chart-skel.dark {
  background: linear-gradient(90deg, rgba(15,23,42,.65), rgba(15,23,42,.9), rgba(15,23,42,.65));
}
@keyframes shimmer {
  0% { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}
</style>
