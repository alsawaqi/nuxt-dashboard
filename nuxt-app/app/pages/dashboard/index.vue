<script setup lang="ts">
import { ref, onMounted, computed, nextTick ,watch} from 'vue'
import type { ApexOptions } from 'apexcharts'
import { useAuthStore } from '~/stores/auth'
definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})
const { $api, $google } = useNuxtApp()


const lastUpdatedAt = ref<Date | null>(null)

const fmtNum = (v: any, d = 0) =>
  new Intl.NumberFormat('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d })
    .format(Number(v || 0))

const fmtOMR = (v: any) => `${fmtNum(v, 2)} OMR`

const fmtDateTime = (v: any) =>
  new Date(v).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })


const auth = useAuthStore()

const deviceLocations = ref<string[]>([])

interface DailyStat {
  date: string
  success_amount: string | number
  failed_amount: string | number
}




interface HeatmapPoint {
  lat: number
  lng: number

  transactions_count: number
  total_amount: number

  success_count: number
  fail_count: number
  success_amount: number
  fail_amount: number
}




interface TopDevice {
  device_brand_id: number
  device_model_id: number
  brand?: string
  model?: string
  label?: string              // backend can send this already
  location_label?: string
  total_amount: number | string
  tx_count?: number
}



interface TopLocation {
  charity_location_id: number
  label: string
  total_amount: number | string
}



interface TopBank {
  bank_transaction_id: number | string
  label: string
  total_amount: number | string
}


const heatmapMode = ref<'amount' | 'count'>('amount') // ✅ NEW
const showHeatmapMarkers = ref(false)                 // ✅ NEW
const heatmapPoints = ref<HeatmapPoint[]>([])         // ✅ NEW
const heatmapMarkers = ref<google.maps.Marker[]>([])  // ✅ NEW

const topDevicesItems = ref<TopDevice[]>([])


const clearMarkers = () => {
  heatmapMarkers.value.forEach(m => m.setMap(null))
  heatmapMarkers.value = []
}

const applyHeatmapData = async () => {
  if (!heatmapLayer.value || !map.value) return
  const google = await $google()

  const data = heatmapPoints.value.map((p) => ({
    location: new google.maps.LatLng(p.lat, p.lng),
    weight: heatmapMode.value === 'amount'
      ? (p.total_amount || 1)
      : (p.transactions_count || 1),
  }))

  heatmapLayer.value.setData(data as any)
}

const applyMarkers = async () => {
  if (!map.value) return
  const google = await $google()

  clearMarkers()

  if (!showHeatmapMarkers.value) return

  // show count label per hotspot
  heatmapMarkers.value = heatmapPoints.value.map((p) => {
    return new google.maps.Marker({
      position: { lat: p.lat, lng: p.lng },
      map: map.value!,
      label: {
        text: String(p.transactions_count),
        fontSize: '12px',
        fontWeight: '600',
      },
      title: `Total: ${p.transactions_count} | Success: ${p.success_count} | Fail: ${p.fail_count}`,
    })
  })
}


const pieColors = ['#22c55e', '#3b82f6', '#6366f1', '#ef4444', '#f97316', '#eab308']
const loading = ref(true)
const error = ref<string | null>(null)
const datas = ref<any>([])
const transactions = ref<any[]>([])

const txPage = ref(1)
const txPerPage = ref(10)

const txMeta = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
})

  // ✅ page boot (optional global)
const pageBooting = ref(true)

// ✅ per-widget loading/errors
const loadingDaily = ref(true)
const errorDaily = ref<string | null>(null)

const loadingTotals = ref(true)
const errorTotals = ref<string | null>(null)

const loadingTransactions = ref(true)
const errorTransactions = ref<string | null>(null)

const heatmapContainer = ref<HTMLElement | null>(null)

const map = ref<google.maps.Map | null>(null)
const heatmapLayer = ref<google.maps.visualization.HeatmapLayer | null>(null)

const heatmapLoading = ref(false)
const heatmapError = ref<string | null>(null)

const categories = ref<string[]>([])
const series = ref([
  { name: 'Success', data: [] as number[] },
  { name: 'Failed',  data: [] as number[] },
])

const rangeTotals = ref({ success: 0, failed: 0 }) 


// 🔹 Top Banks (donut)
const loadingTopBanks = ref(true)
const errorTopBanks = ref<string | null>(null)

const labelsBanks = ref<string[]>([])
const seriesPieBanks = ref<number[]>([])

const totalBanks = computed(() =>
  seriesPieBanks.value.reduce((sum, v) => sum + (Number(v) || 0), 0)
)

const pieRowsBanks = computed(() => {
  if (!labelsBanks.value.length || !seriesPieBanks.value.length || !totalBanks.value) return []

  return labelsBanks.value.map((label, idx) => {
    const value = Number(seriesPieBanks.value[idx] || 0)
    const percentage = totalBanks.value ? (value / totalBanks.value) * 100 : 0

    return {
      label,
      value,
      percentage,
      color: pieColors[idx % pieColors.length],
    }
  })
})

const chartOptionsPieBanks = ref<ApexOptions>({
  chart: {
    type: 'donut',
    height: 260,
  },
  labels: [],          // will be filled after API call
  colors: pieColors,
  legend: {
    show: false,       // we use our own table legend
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 0,
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          name: {
            show: true,
            offsetY: 8,
            fontSize: '13px',
            color: '#6b7280',
            formatter: () => 'Total Value',
          },
          value: {
            show: true,
            fontSize: '26px',
            fontWeight: 600,
            formatter: (val: string) => Number(val).toFixed(0),
          },
          total: {
            show: true,
            label: 'Total Value',
            fontSize: '14px',
            color: '#6b7280',
            formatter: (w: any) => {
              const sum = w.globals.seriesTotals.reduce(
                (a: number, b: number) => a + b,
                0
              )
              return sum.toFixed(0)
            },
          },
        },
      },
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) => val.toFixed(2),
    },
  },
})

const loadingTopLocations = ref(true)
const errorTopLocations = ref<string | null>(null)

const labelsLocations = ref<string[]>([])
const seriesPieLocations = ref<number[]>([])

const totalLocations = computed(() =>
  seriesPieLocations.value.reduce((sum, v) => sum + (Number(v) || 0), 0)
)

const pieRowsLocations = computed(() => {
  if (!labelsLocations.value.length || !seriesPieLocations.value.length || !totalLocations.value) return []

  return labelsLocations.value.map((label, idx) => {
    const value = Number(seriesPieLocations.value[idx] || 0)
    const percentage = totalLocations.value ? (value / totalLocations.value) * 100 : 0

    return {
      label,
      value,
      percentage,
      color: pieColors[idx % pieColors.length],
    }
  })
})

const chartOptionsPieLocations = ref<ApexOptions>({
  chart: {
    type: 'donut',
    height: 260,
  },
  labels: [],              // will be set after API call
  colors: pieColors,
  legend: {
    show: false,           // we'll use our own table
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 0,
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          name: {
            show: true,
            offsetY: 8,
            fontSize: '13px',
            color: '#6b7280',
            formatter: () => 'Total Value',
          },
          value: {
            show: true,
            fontSize: '26px',
            fontWeight: 600,
            formatter: (val: string) => Number(val).toFixed(0),
          },
          total: {
            show: true,
            label: 'Total Value',
            fontSize: '14px',
            color: '#6b7280',
            formatter: (w: any) => {
              const sum = w.globals.seriesTotals.reduce(
                (a: number, b: number) => a + b,
                0
              )
              return sum.toFixed(0)
            },
          },
        },
      },
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) => val.toFixed(2),
    },
  },
})

const chartOptions = ref<ApexOptions>({
  chart: {
    type: 'line',
    height: 350,
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  colors: ['#22c55e', '#ef4444'], // ✅ success green, fail red
  xaxis: {
    type: 'category',
    labels: { rotate: -45 },
  },
  yaxis: {
    labels: { formatter: (val) => val.toFixed(2) },
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val.toFixed(2)} OMR`,
    },
  },
  grid: { borderColor: '#e5e7eb' },
})






const loadingTopDevices = ref(true)
const errorTopDevices = ref<string | null>(null)

const labels = ref<string[]>([])
const seriesPie = ref<number[]>([])

const chartOptionsPie = ref<ApexOptions>({
  chart: {
    type: 'donut',
    height: 260,
  },
  labels: [],          // will be filled after API call
  colors: pieColors,   // matches table dots
  legend: {
    show: false,       // we’ll use our own table legend
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 0,
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          name: {
            show: true,
            offsetY: 8,
            fontSize: '13px',
            color: '#6b7280',
            formatter: () => 'Total Value',
          },
          value: {
            show: true,
            fontSize: '26px',
            fontWeight: 600,
            formatter: (val: string) => Number(val).toFixed(0),
          },
          total: {
            show: true,
            label: 'Total Value',
            fontSize: '14px',
            color: '#6b7280',
            formatter: (w: any) => {
              const sum = w.globals.seriesTotals.reduce(
                (a: number, b: number) => a + b,
                0
              )
              return sum.toFixed(0)
            },
          },
        },
      },
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) => val.toFixed(2),
    },
  },
})



const loadTopLocations = async () => {
  loadingTopLocations.value = true
  errorTopLocations.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/top-location')

    const items = (data.data || []) as TopLocation[]

    labelsLocations.value = items.map((item) => item.label)
    seriesPieLocations.value = items.map((item) => Number(item.total_amount) || 0)

    chartOptionsPieLocations.value = {
      ...chartOptionsPieLocations.value,
      labels: labelsLocations.value,
      colors: pieColors,
    }
  } catch (e) {
    console.error(e)
    errorTopLocations.value = 'Failed to load top locations'
  } finally {
    loadingTopLocations.value = false
  }
}


const loadTopDevices = async () => {
  loadingTopDevices.value = true
  errorTopDevices.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/top-devices')

    const items = (data.data || []) as TopDevice[]
    topDevicesItems.value = items

    // Build labels as: "Brand - Model"
    labels.value = items.map((item) => {
      if (item.label) return item.label
      const b = item.brand || ''
      const m = item.model || ''
      const merged = [b, m].filter(Boolean).join(' - ')
      return merged || '—'
    })

    seriesPie.value = items.map((item) => Number(item.total_amount) || 0)
    deviceLocations.value = items.map((item) => item.location_label || '—')

    chartOptionsPie.value = {
      ...chartOptionsPie.value,
      labels: labels.value,
      colors: pieColors,
    }
  } catch (e) {
    console.error(e)
    errorTopDevices.value = 'Failed to load top devices'
  } finally {
    loadingTopDevices.value = false
  }
}


// total of all slices
 
// rows for the table under the chart
const totalPie = computed(() =>
  topDevicesItems.value.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0)
)

const pieRows = computed(() => {
  if (!topDevicesItems.value.length || !totalPie.value) return []

  return topDevicesItems.value.map((item, idx) => {
    const value = Number(item.total_amount) || 0
    const percentage = totalPie.value ? (value / totalPie.value) * 100 : 0

    const label =
      item.label ||
      [item.brand, item.model].filter(Boolean).join(' - ') ||
      '—'

    return {
      label,
      location: item.location_label || '—',
      value,
      percentage,
      color: pieColors[idx % pieColors.length],
      tx_count: Number(item.tx_count || 0),
    }
  })
})




const loadData = async (): Promise<void> => {
  loadingDaily.value = true
  errorDaily.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/daily')

    const stats = (data.data || []) as DailyStat[]

    categories.value = stats.map((item) => item.date)

    // ✅ set x-axis categories
    chartOptions.value = {
      ...chartOptions.value,
      xaxis: {
        ...(chartOptions.value.xaxis as any),
        categories: categories.value,
      },
    }

    // ✅ 2 lines: Success vs Failed
    series.value = [
      {
        name: 'Success',
        data: stats.map((item) => Number(item.success_amount) || 0),
      },
      {
        name: 'Failed',
        data: stats.map((item) => Number(item.failed_amount) || 0),
      },
    ]
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load charity stats.'
  } finally {
    loadingDaily.value = false
    errorDaily.value = null
  }
}



const loadTotals = async (): Promise<void> => {
 loadingTotals.value = true
  errorTotals.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/totals')

    datas.value = data.data

  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load charity stats.'
  } finally {
    loadingTotals.value = false
    errorTotals.value = null
  }
}



const loadTransactions = async (): Promise<void> => {
  loadingTransactions.value = true
  errorTransactions.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/donations', {
      params: {
        page: txPage.value,
        per_page: txPerPage.value,
      },
    })

    transactions.value = data.data || []
    txMeta.value = data.meta || txMeta.value
  } catch (e: any) {
    console.error(e)
    errorTransactions.value = 'Failed to load transactions.'
  } finally {
    loadingTransactions.value = false
  }
}


const loadTopBanks = async () => {
  loadingTopBanks.value = true
  errorTopBanks.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/top-banks')

    const items = (data.data || []) as TopBank[]

    labelsBanks.value = items.map((item) => item.label)
    seriesPieBanks.value = items.map((item) => Number(item.total_amount) || 0)

    chartOptionsPieBanks.value = {
      ...chartOptionsPieBanks.value,
      labels: labelsBanks.value,
      colors: pieColors,
    }
  } catch (e) {
    console.error(e)
    errorTopBanks.value = 'Failed to load top banks'
  } finally {
    loadingTopBanks.value = false
  }
}


const fetchHeatmapData = async (): Promise<HeatmapPoint[]> => {
  const { data } = await $api.get('/api/stats/charity/heatmap') // default ALL
  return (data.data || []) as HeatmapPoint[]
}



watch(txPerPage, () => {
  txPage.value = 1
  loadTransactions()
})
watch(txPage, () => {
  loadTransactions()
})


const initHeatmap = async () => {
  heatmapLoading.value = true
  heatmapError.value = null

  await nextTick() // ensure DOM + ref are there

  if (!heatmapContainer.value) {
    console.warn('heatmapContainer ref is still null')
    heatmapLoading.value = false
    return
  }

  try {
    const google = await $google()

    const { Map } =
      (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary
    const { HeatmapLayer } =
      (await google.maps.importLibrary('visualization')) as google.maps.VisualizationLibrary

      const points = await fetchHeatmapData()
heatmapPoints.value = points

if (!points.length) {
  heatmapError.value = 'No payment data available for the selected period.'
  return
}

const first = points[0]
if (!first) {
  heatmapError.value = 'No valid payment data available.'
  return
}

map.value = new Map(heatmapContainer.value, {
  center: { lat: first.lat, lng: first.lng },
  zoom: 13,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
})

heatmapLayer.value = new HeatmapLayer({
  data: [], // we’ll set it using applyHeatmapData()
  map: map.value,
  radius: 30,
  opacity: 0.7,
})

await applyHeatmapData()
await applyMarkers()

 
  } catch (err) {
    console.error(err)
    heatmapError.value = 'Failed to load payment heatmap.'
  } finally {
    heatmapLoading.value = false
  }
}


watch(heatmapMode, async () => {
  await applyHeatmapData()
})

watch(showHeatmapMarkers, async () => {
  await applyMarkers()
})


const refreshAll = async () => {
  pageBooting.value = true

  const tasks = [
    loadData(),
    loadTotals(),
    loadTransactions(),
    initHeatmap(),
    loadTopDevices(),
    loadTopLocations(),
    loadTopBanks(),
  ]

  await Promise.allSettled(tasks)

  lastUpdatedAt.value = new Date()
  pageBooting.value = false
}


onMounted(async () => {
 await refreshAll()


});



</script>
 <template>
  <div class="dashboard-main-body dash-wrap" v-if="auth.user?.id == 1">

    <!-- Header -->
    <div class="dash-header">
      <div class="dash-header-left">
        <div class="dash-title-row">
          <h5 class="dash-title">Dashboard</h5>
          <span class="dash-badge">
            <iconify-icon icon="mdi:chart-areaspline" class="me-1"></iconify-icon>
            Charity Analytics
          </span>
        </div>

        <div class="dash-sub">
          <span class="text-muted">
            <iconify-icon icon="mdi:clock-outline" class="me-1"></iconify-icon>
            Last updated:
            <b>{{ lastUpdatedAt ? fmtDateTime(lastUpdatedAt) : '—' }}</b>
          </span>
        </div>
      </div>

      <div class="dash-header-right">
        <NuxtLink to="/dashboard" class="btn btn-sm btn-light dash-btn">
          <iconify-icon icon="solar:home-smile-angle-outline" class="me-1"></iconify-icon>
          Home
        </NuxtLink>

        <button class="btn btn-sm btn-primary dash-btn" @click="refreshAll" :disabled="pageBooting">
          <span v-if="pageBooting" class="d-inline-flex align-items-center gap-2">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Refreshing
          </span>
          <span v-else class="d-inline-flex align-items-center gap-2">
            <iconify-icon icon="mdi:refresh" />
            Refresh
          </span>
        </button>
      </div>
    </div>

    <!-- KPI row -->
    <div class="row gy-3 mt-1">
      <div class="col-xxl-3 col-lg-6">
        <div class="card dash-card kpi-card dash-appear d1">
          <div class="card-body">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Successful Donations</div>
                <div class="kpi-value">
                  <span v-if="loadingTotals" class="skeleton sk-w-120"></span>
                  <span v-else>{{ fmtNum(datas.total_transactions) }}</span>
                </div>
                <div class="kpi-sub">Count of successful donations</div>
              </div>
              <div class="kpi-icon bg-cyan">
                <iconify-icon icon="mdi:hand-heart-outline" class="text-white"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xxl-3 col-lg-6">
        <div class="card dash-card kpi-card dash-appear d2">
          <div class="card-body">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Successful Amount</div>
                <div class="kpi-value">
                  <span v-if="loadingTotals" class="skeleton sk-w-140"></span>
                  <span v-else>{{ fmtOMR(datas.total_amount) }}</span>
                </div>
                <div class="kpi-sub">Sum of successful donations</div>
              </div>
              <div class="kpi-icon bg-purple">
                <iconify-icon icon="mdi:hand-coin-outline" class="text-white"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xxl-3 col-lg-6">
        <div class="card dash-card kpi-card dash-appear d3">
          <div class="card-body">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Total Devices</div>
                <div class="kpi-value">
                  <span v-if="loadingTotals" class="skeleton sk-w-90"></span>
                  <span v-else>{{ fmtNum(datas.total_devices) }}</span>
                </div>
                <div class="kpi-sub">Registered devices</div>
              </div>
              <div class="kpi-icon bg-info">
                <iconify-icon icon="mdi:devices" class="text-white"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xxl-3 col-lg-6">
        <div class="card dash-card kpi-card dash-appear d4">
          <div class="card-body">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Total Locations</div>
                <div class="kpi-value">
                  <span v-if="loadingTotals" class="skeleton sk-w-90"></span>
                  <span v-else>{{ fmtNum(datas.total_locations) }}</span>
                </div>
                <div class="kpi-sub">Charity locations count</div>
              </div>
              <div class="kpi-icon bg-success-main">
                <iconify-icon icon="mdi:map-marker-radius-outline" class="text-white"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="row gy-3 mt-1">

      <!-- Line chart -->
      <div class="col-12"">
        <div class="card dash-card dash-appear d2">
          <div class="card-body">
            <div class="dash-card-head">
              <div>
                <h6 class="dash-card-title mb-0">Charity Statistics</h6>
                <div class="dash-card-sub">Success vs Failed totals by day</div>
              </div>

              <div class="dash-legend">
                <span class="legend-pill success">
                  <span class="dot"></span> Success
                </span>
                <span class="legend-pill fail">
                  <span class="dot"></span> Failed
                </span>
              </div>
            </div>

            <div class="dash-chart-wrap">
              <div v-if="loadingDaily" class="chart-skel">
                <div class="skeleton sk-h-18 sk-w-220 mb-2"></div>
                <div class="skeleton sk-h-260 sk-w-100"></div>
              </div>

              <div v-else-if="errorDaily" class="alert alert-warning mb-0">
                {{ errorDaily }}
              </div>

              <ClientOnly v-else>
                <apexchart type="line" height="320" :options="chartOptions" :series="series" />
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>

      <!-- Right stack: Top Locations + Top Devices -->
      <div class="col-12">
        <div class="row gy-3">

          <!-- Top Locations -->
          <div class="col-xxl-6 col-xl-6 col-12">
            <div class="card dash-card dash-appear d3">
              <div class="card-body">
                <div class="dash-card-head">
                  <div>
                    <h6 class="dash-card-title mb-0">Top Locations</h6>
                    <div class="dash-card-sub">Success amount share</div>
                  </div>
                </div>

                <div v-if="loadingTopLocations" class="chart-skel">
                  <div class="skeleton sk-h-180 sk-w-100 mb-2"></div>
                  <div class="skeleton sk-h-14 sk-w-100 mb-1"></div>
                  <div class="skeleton sk-h-14 sk-w-80 mb-1"></div>
                  <div class="skeleton sk-h-14 sk-w-90"></div>
                </div>

                <div v-else-if="errorTopLocations" class="alert alert-warning mb-0">
                  {{ errorTopLocations }}
                </div>

                <ClientOnly v-else>
                  <div class="donut-row">
                    <apexchart type="donut" height="230" :options="chartOptionsPieLocations" :series="seriesPieLocations" />
                  </div>

                  <div class="legend-list">
                    <div class="legend-item" v-for="row in pieRowsLocations" :key="row.label">
                      <div class="legend-left">
                        <span class="dot" :style="{ backgroundColor: row.color }"></span>
                        <div class="legend-text">
                          <div class="legend-title">{{ row.label }}</div>
                          <div class="legend-sub">{{ row.percentage.toFixed(1) }}%</div>
                        </div>
                      </div>

                      <div class="legend-right">
                        <div class="legend-value">{{ fmtOMR(row.value) }}</div>
                        <div class="bar">
                          <div class="bar-fill" :style="{ width: `${row.percentage}%`, backgroundColor: row.color }"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ClientOnly>
              </div>
            </div>
          </div>

          <!-- Top Devices -->
          <div class="col-xxl-6 col-xl-6 col-12">
            <div class="card dash-card dash-appear d4">
              <div class="card-body">
                <div class="dash-card-head">
                  <div>
                    <h6 class="dash-card-title mb-0">Top Devices</h6>
                    <div class="dash-card-sub">Device + top contributing location</div>
                  </div>
                </div>

                <div v-if="loadingTopDevices" class="chart-skel">
                  <div class="skeleton sk-h-180 sk-w-100 mb-2"></div>
                  <div class="skeleton sk-h-14 sk-w-100 mb-1"></div>
                  <div class="skeleton sk-h-14 sk-w-80 mb-1"></div>
                  <div class="skeleton sk-h-14 sk-w-90"></div>
                </div>

                <div v-else-if="errorTopDevices" class="alert alert-warning mb-0">
                  {{ errorTopDevices }}
                </div>

                <ClientOnly v-else>
                  <div class="donut-row">
                    <apexchart type="donut" height="230" :options="chartOptionsPie" :series="seriesPie" />
                  </div>

                  <div class="legend-list">
                    <div class="legend-item" v-for="row in pieRows" :key="row.label">
                      <div class="legend-left">
                        <span class="dot" :style="{ backgroundColor: row.color }"></span>
                        <div class="legend-text">
                          <div class="legend-title">{{ row.label }}</div>
                          <!-- <div class="legend-sub">{{ row.location }}</div> -->
                        </div>
                      </div>

                      <div class="legend-right">
                        <div class="legend-value">{{ fmtOMR(row.value) }}</div>
                        <div class="bar">
                          <div class="bar-fill" :style="{ width: `${row.percentage}%`, backgroundColor: row.color }"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ClientOnly>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Heatmap full -->
      <div class="col-12">
        <div class="card dash-card dash-appear d2">
          <div class="card-body">
            <div class="dash-card-head">
              <div>
                <h6 class="dash-card-title mb-0">Charity Heatmap</h6>
                <div class="dash-card-sub">All transactions (success + fail). Toggle amount/count.</div>
              </div>

              <div class="dash-actions">
                <select v-model="heatmapMode" class="form-select form-select-sm dash-select">
                  <option value="amount">Heat by Amount</option>
                  <option value="count">Heat by Count</option>
                </select>

                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" id="hmMarkers" v-model="showHeatmapMarkers" />
                  <label class="form-check-label small" for="hmMarkers">Show Counts</label>
                </div>
              </div>
            </div>

            <ClientOnly>
              <div class="position-relative">
                <div ref="heatmapContainer" class="heatmap-map-wrapper"></div>

                <div v-if="heatmapLoading" class="heatmap-overlay d-flex align-items-center justify-content-center">
                  <div class="d-flex align-items-center gap-2">
                    <span class="spinner-border spinner-border-sm"></span>
                    <span class="text-muted">Loading heatmap…</span>
                  </div>
                </div>

                <div v-if="heatmapError" class="alert alert-warning mt-2 mb-0">
                  {{ heatmapError }}
                </div>
              </div>
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Transactions -->
      <div class="col-xxl-8">
        <div class="card dash-card dash-appear d3">
          <div class="card-body">
            <div class="dash-card-head">
              <div>
                <h6 class="dash-card-title mb-0">Latest Donations</h6>
                <div class="dash-card-sub">Recent donation activity</div>
              </div>

             <span class="dash-count">
  {{ loadingTransactions ? '…' : fmtNum(txMeta.total) }}
</span>
            </div>

            <div v-if="loadingTransactions" class="chart-skel">
              <div class="skeleton sk-h-16 sk-w-240 mb-2"></div>
              <div class="skeleton sk-h-220 sk-w-100"></div>
            </div>

            <div v-else-if="errorTransactions" class="alert alert-warning mb-0">
              {{ errorTransactions }}
            </div>

            <div v-else class="table-wrap">
              <table class="table table-hover sm-table mb-0">
                <thead class="table-head-sticky">
                  <tr>
                    <th>#</th>
                    <th>Device</th>
                    <th>Bank</th>
                    <th class="text-end">Amount</th>
                    <th>Location</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="(transaction, index) in transactions" :key="transaction.id">
                    <td class="text-muted">{{ (txMeta.from || 1) + index }}</td>

                    <td>
                      <div class="cell-main">{{ transaction.device?.devicemodel?.name || '—' }}</div>
                      <div class="cell-sub text-muted">{{ transaction.device?.devicebrand?.name || '' }}</div>
                    </td>

                    <td>
                      <span class="chip">
                        <iconify-icon icon="mdi:bank-outline" class="me-1"></iconify-icon>
                        {{ transaction.bank?.name || '—' }}
                      </span>
                    </td>

                    <td class="text-end fw-semibold">
                      {{ fmtOMR(transaction.total_amount) }}
                    </td>

                    <td>
                      <div class="cell-main">
                        {{ transaction.charity_location?.main_location?.name || '—' }}
                      </div>
                      <div class="cell-sub text-muted">
                        {{ transaction.charity_location?.name || '' }}
                      </div>
                    </td>

                    <td class="text-muted">
                      {{ fmtDateTime(transaction.created_at) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>


            <div v-if="!loadingTransactions && !errorTransactions" class="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3">
  <div class="text-muted small">
    Showing <b>{{ txMeta.from || 0 }}</b>–<b>{{ txMeta.to || 0 }}</b> of <b>{{ txMeta.total || 0 }}</b>
  </div>

  <div class="d-flex align-items-center gap-2">
    <select class="form-select form-select-sm" style="width: 110px" v-model.number="txPerPage">
      <option :value="5">5</option>
      <option :value="10">10</option>
      <option :value="20">20</option>
      <option :value="50">50</option>
    </select>

    <button class="btn btn-sm btn-light"
      :disabled="txPage <= 1"
      @click="txPage--">
      Prev
    </button>

    <span class="small text-muted">
      Page <b>{{ txMeta.current_page }}</b> / <b>{{ txMeta.last_page }}</b>
    </span>

    <button class="btn btn-sm btn-light"
      :disabled="txPage >= txMeta.last_page"
      @click="txPage++">
      Next
    </button>
  </div>
</div>


            

          </div>
        </div>
      </div>

      <!-- Top Banks -->
      <div class="col-xxl-4">
        <div class="card dash-card dash-appear d4">
          <div class="card-body">
            <div class="dash-card-head">
              <div>
                <h6 class="dash-card-title mb-0">Top Banks</h6>
                <div class="dash-card-sub">Success amount share</div>
              </div>
            </div>

            <div v-if="loadingTopBanks" class="chart-skel">
              <div class="skeleton sk-h-180 sk-w-100 mb-2"></div>
              <div class="skeleton sk-h-14 sk-w-100 mb-1"></div>
              <div class="skeleton sk-h-14 sk-w-80 mb-1"></div>
              <div class="skeleton sk-h-14 sk-w-90"></div>
            </div>

            <div v-else-if="errorTopBanks" class="alert alert-warning mb-0">
              {{ errorTopBanks }}
            </div>

            <ClientOnly v-else>
              <div class="donut-row">
                <apexchart type="donut" height="230" :options="chartOptionsPieBanks" :series="seriesPieBanks" />
              </div>

              <div class="legend-list">
                <div class="legend-item" v-for="row in pieRowsBanks" :key="row.label">
                  <div class="legend-left">
                    <span class="dot" :style="{ backgroundColor: row.color }"></span>
                    <div class="legend-text">
                      <div class="legend-title">{{ row.label }}</div>
                      <div class="legend-sub">{{ row.percentage.toFixed(1) }}%</div>
                    </div>
                  </div>

                  <div class="legend-right">
                    <div class="legend-value">{{ fmtOMR(row.value) }}</div>
                    <div class="bar">
                      <div class="bar-fill" :style="{ width: `${row.percentage}%`, backgroundColor: row.color }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </ClientOnly>

          </div>
        </div>
      </div>

    </div>
  </div>
</template>
<style scoped>

.dash-wrap{
  position: relative;
  padding-bottom: 12px;
}

/* subtle background to reduce "empty white feel" */
.dash-wrap::before{
  content:"";
  position:absolute;
  inset: -20px -20px auto -20px;
  height: 320px;
  background: radial-gradient(600px 200px at 15% 20%, rgba(99,102,241,.10), transparent 60%),
              radial-gradient(480px 180px at 70% 10%, rgba(34,197,94,.10), transparent 60%),
              radial-gradient(520px 200px at 95% 60%, rgba(239,68,68,.08), transparent 60%);
  pointer-events:none;
  z-index: 0;
  filter: blur(0px);
}
.dash-wrap > * { position: relative; z-index: 1; }

/* Header */
.dash-header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.dash-title{ margin:0; font-weight: 700; letter-spacing: .2px; }
.dash-title-row{ display:flex; align-items:center; gap:10px; }
.dash-badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15,23,42,.06);
}
.dash-sub{ margin-top: 4px; }
.dash-header-right{ display:flex; align-items:center; gap:10px; }
.dash-btn{ border-radius: 10px; }

/* Cards */
.dash-card{
  border-radius: 16px;
  border: 1px solid rgba(15,23,42,.08);
  box-shadow: 0 10px 30px rgba(15,23,42,.06);
  overflow: hidden;
  transition: transform .18s ease, box-shadow .18s ease;
}
.dash-card:hover{
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(15,23,42,.09);
}
.dash-card .card-body{
  padding: 16px !important;
}

/* KPI */
.kpi-card .card-body{ padding: 16px !important; }
.kpi-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
}
.kpi-label{
  font-size: 12px;
  color: rgba(100,116,139,1);
  margin-bottom: 4px;
}
.kpi-value{
  font-size: 22px;
  font-weight: 800;
  letter-spacing: .2px;
  line-height: 1.2;
}
.kpi-sub{
  font-size: 12px;
  color: rgba(100,116,139,1);
  margin-top: 6px;
}
.kpi-icon{
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.25);
}
.kpi-icon iconify-icon{ font-size: 22px; }

/* Card headers */
.dash-card-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.dash-card-title{ font-weight: 800; }
.dash-card-sub{
  font-size: 12px;
  color: rgba(100,116,139,1);
  margin-top: 3px;
}
.dash-actions{ display:flex; align-items:center; gap: 10px; }
.dash-select{ width: 170px; border-radius: 10px; }

/* Legends */
.dash-legend{ display:flex; align-items:center; gap: 8px; }
.legend-pill{
  display:inline-flex;
  align-items:center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15,23,42,.04);
  border: 1px solid rgba(15,23,42,.06);
}
.legend-pill .dot{
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.legend-pill.success .dot{ background: #22c55e; }
.legend-pill.fail .dot{ background: #ef4444; }

/* Donut + list */
.donut-row{
  display:flex;
  justify-content:center;
  margin-top: 4px;
  margin-bottom: 8px;
}
.legend-list{
  display:flex;
  flex-direction:column;
  gap: 10px;
  max-height: 260px;
  overflow:auto;
  padding-right: 6px;
}
.legend-item{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 12px;
}
.legend-left{
  display:flex;
  align-items:flex-start;
  gap: 10px;
  min-width: 0;
}
.legend-left .dot{
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-top: 5px;
}
.legend-text{ min-width: 0; }
.legend-title{
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 210px;
}
.legend-sub{
  font-size: 12px;
  color: rgba(100,116,139,1);
}
.legend-right{
  min-width: 140px;
  text-align: right;
}
.legend-value{
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 6px;
}
.bar{
  height: 6px;
  background: rgba(15,23,42,.08);
  border-radius: 999px;
  overflow:hidden;
}
.bar-fill{ height: 100%; border-radius: 999px; }

/* Table */
.table-wrap{
  max-height: 420px;
  overflow:auto;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.06);
}
.table-head-sticky{
  position: sticky;
  top: 0;
  background: white;
  z-index: 2;
}
.cell-main{ font-weight: 700; }
.cell-sub{ font-size: 12px; margin-top: 2px; }
.chip{
  display:inline-flex;
  align-items:center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(15,23,42,.04);
  border: 1px solid rgba(15,23,42,.06);
}

/* Count badge */
.dash-count{
  font-weight: 800;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15,23,42,.06);
}

/* Heatmap */
.heatmap-map-wrapper {
  width: 100%;
  height: 380px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(15,23,42,.08);
}
.heatmap-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
  z-index: 10;
  font-size: 0.9rem;
}

/* Skeleton */
.skeleton{
  position: relative;
  display:inline-block;
  border-radius: 10px;
  background: rgba(15,23,42,.08);
  overflow:hidden;
}
.skeleton::after{
  content:"";
  position:absolute;
  inset:0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer{
  100%{ transform: translateX(100%); }
}
.sk-w-120{ width: 120px; height: 18px; }
.sk-w-140{ width: 140px; height: 18px; }
.sk-w-90{ width: 90px; height: 18px; }
.sk-w-100{ width: 100%; }
.sk-w-220{ width: 220px; height: 18px; }
.sk-h-14{ height: 14px; }
.sk-h-16{ height: 16px; }
.sk-h-18{ height: 18px; }
.sk-h-180{ height: 180px; }
.sk-h-220{ height: 220px; }
.sk-h-260{ height: 260px; }

/* Entrance animations (staggered) */
.dash-appear{
  animation: fadeUp .45s ease both;
}
.d1{ animation-delay: .02s; }
.d2{ animation-delay: .06s; }
.d3{ animation-delay: .10s; }
.d4{ animation-delay: .14s; }

@keyframes fadeUp{
  from{ opacity: 0; transform: translateY(10px); }
  to{ opacity: 1; transform: translateY(0); }
}


</style>

