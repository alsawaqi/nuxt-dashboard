<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import type { ApexOptions } from 'apexcharts'
import { useAuthStore } from '~/stores/auth'
definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})
const { $api, $google } = useNuxtApp()

interface DailyStat {
  date: string
  total_amount: string | number
}




interface HeatmapPoint {
  lat: number
  lng: number
  weight: number
}




const pieColors = ['#22c55e', '#3b82f6', '#6366f1', '#ef4444', '#f97316', '#eab308']
const loading = ref(true)
const error = ref<string | null>(null)
const datas = ref<any>([])
const transactions = ref<any>([])

const heatmapContainer = ref<HTMLElement | null>(null)

const map = ref<google.maps.Map | null>(null)
const heatmapLayer = ref<google.maps.visualization.HeatmapLayer | null>(null)

const heatmapLoading = ref(false)
const heatmapError = ref<string | null>(null)

const categories = ref<string[]>([])
const series = ref([
  {
    name: 'Total Amount',
    data: [] as number[],
  },
])


interface TopBank {
  bank_transaction_id: number | string
  label: string
  total_amount: number | string
}

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
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    type: 'category',
    labels: {
      rotate: -45,
    },
  },
  yaxis: {
    labels: {
      formatter: (val) => val.toFixed(2),
    },
  },
  tooltip: {
    y: {
      formatter: (val) => `${val.toFixed(2)}`,
    },
  },
  grid: {
    borderColor: '#e5e7eb',
  },
  colors: ['#4f46e5'], // optional: primary line color
})


interface TopDevice {
  device_id: number
  label: string
  total_amount: number | string
}


interface TopLocation {
  charity_location_id: number
  label: string
  total_amount: number | string
}

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

    labels.value = items.map((item) => item.label)
    seriesPie.value = items.map((item) => Number(item.total_amount) || 0)

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
const totalPie = computed(() =>
  seriesPie.value.reduce((sum, v) => sum + (Number(v) || 0), 0)
)

// rows for the table under the chart
const pieRows = computed(() => {
  if (!labels.value.length || !seriesPie.value.length || !totalPie.value) return []

  return labels.value.map((label, idx) => {
    const value = Number(seriesPie.value[idx] || 0)
    const percentage = totalPie.value ? (value / totalPie.value) * 100 : 0

    return {
      label,
      value,
      percentage,
      color: pieColors[idx % pieColors.length],
    }
  })
})


const loadData = async (): Promise<void> => {
  loading.value = true
  error.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/daily')

    const stats = (data.data || []) as DailyStat[]

    // Map dates + totals
    categories.value = stats.map((item) => item.date)
    if (series.value[0]) {
      series.value[0].data = stats.map((item) => Number(item.total_amount) || 0)
    }
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load charity stats.'
  } finally {
    loading.value = false
  }
}


const loadTotals = async (): Promise<void> => {
  loading.value = true
  error.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/totals')

    datas.value = data.data

  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load charity stats.'
  } finally {
    loading.value = false
  }
}



const loadTransactions = async (): Promise<void> => {
  loading.value = true
  error.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/donations')

    transactions.value = data.data

  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load charity stats.'
  } finally {
    loading.value = false
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
  const { data } = await $api.get('/api/stats/charity/heatmap')
  console.log('Heatmap data:', data)
  return (data.data || []) as HeatmapPoint[]
}


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
    console.log('Heatmap points:', points)

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

    const heatmapData = points.map((p) => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      weight: p.weight ?? 1,
    }))

    heatmapLayer.value = new HeatmapLayer({
      data: heatmapData as any,
      map: map.value,
      radius: 30,
      opacity: 0.7,
    })
  } catch (err) {
    console.error(err)
    heatmapError.value = 'Failed to load payment heatmap.'
  } finally {
    heatmapLoading.value = false
  }
}


onMounted(async () => {
  await loadData()
  await loadTotals()
  await loadTransactions()
  await initHeatmap() 
 
  await loadTopDevices()
  await loadTopLocations()
  await loadTopBanks()


});



</script>
<template>

  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">Dashboard</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>


      </ul>
    </div>

    <div class="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
      <!-- Total Charities -->
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Donations</p>
                <h6 class="mb-0">{{ datas.total_transactions }}</h6>
              </div>
              <div class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                <!-- Hand + heart for charities -->
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
                <h6 class="mb-0">{{ datas.total_amount }} OMR</h6>
              </div>
              <div class="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                <!-- Coin in hand = money donated -->
                <iconify-icon icon="mdi:hand-coin-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Total Devices -->
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-3 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Total Devices</p>
                <h6 class="mb-0">{{ datas.total_devices }}</h6>
              </div>
              <div class="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                <!-- Devices instead of people -->
                <iconify-icon icon="mdi:devices" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Total Charity Locations -->
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-4 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Total Locations</p>
                <h6 class="mb-0">{{ datas.total_locations }}</h6>
              </div>
              <div
                class="w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center">
                <!-- Map marker for locations -->
                <iconify-icon icon="mdi:map-marker-radius-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <div class="row gy-4 mt-1">
      <div class="col-xxl-6 col-xl-12">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex flex-wrap align-items-center justify-content-between">
              <h6 class="text-lg mb-0">Charity Statistic</h6>

              <!-- filter select -->
           
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2 mt-8">
              <!-- you can add summary badges here later -->
            </div>

            <div id="chart" class="pt-28 apexcharts-tooltip-style-1">
              <div v-if="loading" class="text-center py-5">
                Loading chart...
              </div>
              <div v-else-if="error" class="text-danger py-5">
                {{ error }}
              </div>
              <ClientOnly v-else>
                <apexchart type="line" height="320" :options="chartOptions" :series="series" />
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
              <div v-if="loadingTopLocations" class="text-center py-4">
                Loading top locations...
              </div>

              <div v-else-if="errorTopLocations" class="text-danger py-4">
                {{ errorTopLocations }}
              </div>

              <ClientOnly v-else>
                <!-- Donut chart -->
                <div class="d-flex justify-content-center mb-3">
                  <apexchart type="donut" height="260" :options="chartOptionsPieLocations"
                    :series="seriesPieLocations" />
                </div>

                <!-- Legend table like your devices donut -->
                <div class="mt-3">
                  <table class="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th class="text-end">Value</th>
                        <th class="text-end">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in pieRowsLocations" :key="row.label">
                        <td>
                          <span class="me-2 rounded-circle d-inline-block" :style="{
                            width: '10px',
                            height: '10px',
                            backgroundColor: row.color,
                          }"></span>
                          {{ row.label }}
                        </td>
                        <td class="text-end">{{ row.value.toFixed(2) }}</td>
                        <td class="text-end">{{ row.percentage.toFixed(1) }}%</td>
                      </tr>
                    </tbody>
                  </table>
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
             
            </div>

            <div class="mt-32">
              <div v-if="loadingTopDevices" class="text-center py-4">
                Loading top devices...
              </div>

              <div v-else-if="errorTopDevices" class="text-danger py-4">
                {{ errorTopDevices }}
              </div>

              <ClientOnly v-else>
                <!-- Donut chart -->
                <div class="d-flex justify-content-center mb-3">
                  <apexchart type="donut" height="260" :options="chartOptionsPie" :series="seriesPie" />
                </div>

                <!-- Legend table (like your screenshot) -->
                <div class="mt-3">
                  <table class="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th class="text-end">Value</th>
                        <th class="text-end">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in pieRows" :key="row.label">
                        <td>
                          <span class="me-2 rounded-circle d-inline-block" :style="{
                            width: '10px',
                            height: '10px',
                            backgroundColor: row.color,
                          }"></span>
                          {{ row.label }}
                        </td>
                        <td class="text-end">{{ row.value.toFixed(2) }}</td>
                        <td class="text-end">{{ row.percentage.toFixed(1) }}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>



 <div class="card radius-16 mt-24">
  <div class="card-header">
    <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
      <h6 class="mb-2 fw-bold text-lg mb-0">Charity Heatmap</h6>
    </div>
  </div>

  <div class="card-body">
    <ClientOnly>
      <div class="position-relative">
        <!-- The map container: ALWAYS rendered -->
        <div
          ref="heatmapContainer"
          class="heatmap-map-wrapper"
        ></div>

        <!-- Loading overlay -->
        <div
          v-if="heatmapLoading"
          class="heatmap-overlay d-flex align-items-center justify-content-center"
        >
          <span class="text-muted">Loading payment heatmap...</span>
        </div>

        <!-- Error message (below the map) -->
        <div
          v-if="heatmapError"
          class="alert alert-warning mt-2 mb-0"
        >
          {{ heatmapError }}
        </div>
      </div>
    </ClientOnly>
  </div>
</div>






      <div class="col-xxl-9 col-xl-12">
        <div class="card h-100">
          <div class="card-body p-24">

            <div class="d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16">
              <ul class="nav border-gradient-tab nav-pills mb-0" id="pills-tab" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link d-flex align-items-center active" id="pills-to-do-list-tab"
                    data-bs-toggle="pill" data-bs-target="#pills-to-do-list" type="button" role="tab"
                    aria-controls="pills-to-do-list" aria-selected="true">
                    Latest Charities
                    <span
                      class="text-sm fw-semibold py-6 px-12 bg-neutral-500 rounded-pill text-white line-height-1 ms-12 notification-alert">{{
                        transactions.length }}</span>
                  </button>
                </li>

              </ul>
              <a href="javascript:void(0)" class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                View All
                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
              </a>
            </div>

            <div class="tab-content" id="pills-tabContent">
              <div class="tab-pane fade show active" id="pills-to-do-list" role="tabpanel"
                aria-labelledby="pills-to-do-list-tab" tabindex="0">
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


                      <tr v-for="(transaction, index) in transactions" :key="transaction.id">


                        <td>
                          {{ index + 1 }}
                        </td>
                        <td>{{ transaction.device?.devicemodel?.name }}</td>
                        <td>{{ transaction.bank?.name }}</td>
                        <td>{{ transaction.total_amount }}</td>
                        <td class="text-center">
                          {{ transaction.charity_location?.name }}
                        </td>
                        <<td>
  {{
    new Date(transaction.created_at).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }}
</td>
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
              <h6 class="mb-2 fw-bold text-lg mb-0">Top Banks (Working Progress)</h6>
              <a href="javascript:void(0)" class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                View All
                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
              </a>
            </div>

            <div class="mt-32">

             <div class="mt-32">
  <div v-if="loadingTopBanks" class="text-center py-4">
    Loading top banks...
  </div>

  <div v-else-if="errorTopBanks" class="text-danger py-4">
    {{ errorTopBanks }}
  </div>

  <ClientOnly v-else>
    <!-- Donut chart -->
    <div class="d-flex justify-content-center mb-3">
      <apexchart
        type="donut"
        height="260"
        :options="chartOptionsPieBanks"
        :series="seriesPieBanks"
      />
    </div>

    <!-- Legend table -->
    <div class="mt-3">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Bank</th>
            <th class="text-end">Value</th>
            <th class="text-end">%</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pieRowsBanks" :key="row.label">
            <td>
              <span
                class="me-2 rounded-circle d-inline-block"
                :style="{
                  width: '10px',
                  height: '10px',
                  backgroundColor: row.color,
                }"
              ></span>
              {{ row.label }}
            </td>
            <td class="text-end">{{ row.value.toFixed(2) }}</td>
            <td class="text-end">{{ row.percentage.toFixed(1) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </ClientOnly>
</div>




            </div>

          </div>
        </div>
      </div>

    </div>
  </div>


</template>

<style scoped>
.heatmap-map-wrapper {
  width: 100%;
  height: 380px; /* adjust as needed */
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

/* Overlay to show loading on top of the map area */
.heatmap-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 10;
  font-size: 0.9rem;
}

</style>
