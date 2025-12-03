<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

// ✅ totals
const totalSuccess = ref(0)
const totalFailed = ref(0)

// ✅ bar chart
const barSeries = ref([
    {
        name: 'Total Amount (Success)',
        data: [] as number[],
    },
])

const barOptions = ref<ApexOptions>({
    chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false },
    },
    plotOptions: {
        bar: {
            columnWidth: '55%',
            borderRadius: 6,
        },
    },
    dataLabels: { enabled: false },
    xaxis: {
        type: 'category',
        categories: [] as string[],
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
            formatter: (val) => `${val.toFixed(2)} OMR`,
        },
    },
    grid: {
        borderColor: '#e5e7eb',
    },
    colors: ['#4f46e5'],
})

// ✅ pie colors
const pieColors = ['#22c55e', '#3b82f6', '#6366f1', '#ef4444', '#f97316', '#eab308']

// ✅ top devices
const devicesLabels = ref<string[]>([])
const devicesSeries = ref<number[]>([])

const devicesPieOptions = ref<ApexOptions>({
    chart: { type: 'donut', height: 260 },
    labels: [],
    colors: pieColors,
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
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
                        formatter: () => 'Devices',
                    },
                    value: {
                        show: true,
                        fontSize: '26px',
                        fontWeight: 600,
                        formatter: (val: string) => Number(val).toFixed(0),
                    },
                    total: {
                        show: true,
                        label: 'Total',
                        formatter: (w: any) => {
                            const sum = w.globals.seriesTotals.reduce(
                                (a: number, b: number) => a + b,
                                0,
                            )
                            return sum.toFixed(0)
                        },
                    },
                },
            },
        },
    },
})

// ✅ top locations
const locationsLabels = ref<string[]>([])
const locationsSeries = ref<number[]>([])

const locationsPieOptions = ref<ApexOptions>({
    chart: { type: 'donut', height: 260 },
    labels: [],
    colors: pieColors,
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
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
                        formatter: () => 'Locations',
                    },
                    value: {
                        show: true,
                        fontSize: '26px',
                        fontWeight: 600,
                        formatter: (val: string) => Number(val).toFixed(0),
                    },
                    total: {
                        show: true,
                        label: 'Total',
                        formatter: (w: any) => {
                            const sum = w.globals.seriesTotals.reduce(
                                (a: number, b: number) => a + b,
                                0,
                            )
                            return sum.toFixed(0)
                        },
                    },
                },
            },
        },
    },
})



const salesByHourSeries = ref<{ name: string; data: number[] }[]>([])

const salesByHourOptions = ref<ApexOptions>({
  chart: {
    type: 'heatmap',
    height: 380,
    toolbar: { show: false },
  },
  dataLabels: {
    enabled: true,
    style: {
      fontSize: '10px',
    },
    formatter: (val: number) => (val > 0 ? `OMR ${val.toFixed(1)}` : ''),
  },
  xaxis: {
    type: 'category',
    categories: [] as string[],   // Monday..Sunday from API
  },
  plotOptions: {
    heatmap: {
      shadeIntensity: 0.6,
      // Color ranges similar to your screenshot
      colorScale: {
        ranges: [
          { from: 0, to: 0, color: '#f9fafb', name: 'No sales' },
          { from: 0.01, to: 10, color: '#fed7aa', name: 'Low' },
          { from: 10, to: 50, color: '#fb923c', name: 'Medium' },
          { from: 50, to: 1000000, color: '#f97316', name: 'High' },
        ],
      },
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) => `OMR ${val.toFixed(2)}`,
    },
  },
})

// ✅ main fetch function
const fetchStatus = async () => {
    try {
        loading.value = true
        error.value = null

        const params: Record<string, any> = {
            range: activeRange.value,
        }

        if (activeRange.value === 'custom') {
            if (!from.value || !to.value) {
                loading.value = false
                return
            }
            params.from = from.value
            params.to = to.value
        }

        const { data } = await $api.get('/api/stats/charity/status', { params })

        // totals
        totalSuccess.value = Number(data.totals?.success || 0)
        totalFailed.value = Number(data.totals?.failed || 0)

        // bar
        const categories = (data.bar?.categories || []) as string[]
        const values = (data.bar?.data || []).map((v: any) => Number(v) || 0)

        if (barSeries.value[0]) {
            barSeries.value[0].data = values
        }
        barOptions.value = {
            ...barOptions.value,
            xaxis: {
                ...(barOptions.value.xaxis || {}),
                type: 'category',
                categories,
                labels: { rotate: -45 },
            },
        }

        // top devices
        const topDevices = (data.top_devices || []) as { label: string; total_amount: number }[]
        devicesLabels.value = topDevices.map((d) => d.label)
        devicesSeries.value = topDevices.map((d) => Number(d.total_amount) || 0)
        devicesPieOptions.value = {
            ...devicesPieOptions.value,
            labels: devicesLabels.value,
            colors: pieColors,
        }

        // top locations
        const topLocations = (data.top_locations || []) as { label: string; total_amount: number }[]
        locationsLabels.value = topLocations.map((d) => d.label)
        locationsSeries.value = topLocations.map((d) => Number(d.total_amount) || 0)
        locationsPieOptions.value = {
            ...locationsPieOptions.value,
            labels: locationsLabels.value,
            colors: pieColors,
        }


            if (data.sales_by_hour) {
      const cats = (data.sales_by_hour.categories || []) as string[]
      const rawSeries = (data.sales_by_hour.series || []) as {
        name: string
        data: (number | string)[]
      }[]

      salesByHourSeries.value = rawSeries.map((row) => ({
        name: row.name,
        data: row.data.map((v) => Number(v) || 0),
      }))

      salesByHourOptions.value = {
        ...salesByHourOptions.value,
        xaxis: {
          ...(salesByHourOptions.value.xaxis || {}),
          type: 'category',
          categories: cats,
        },
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

// ✅ change range from buttons
const changeRange = (range: RangeKey) => {
    activeRange.value = range
    if (range !== 'custom') {
        from.value = ''
        to.value = ''
        fetchStatus()
    }
}

// ✅ initial load
onMounted(() => {
    fetchStatus()
})
</script>

<template>


    <div class="dashboard-main-body">

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0">Status</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                    <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                        <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                        Status
                    </a>
                </li>


            </ul>
        </div>

        <div class="row gy-4">
            <div class="col-lg-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">Status Analysis</h5>
                    </div>

                    <div class="card-body">
                        <div class="card-body p-24">
                            <div class="d-flex flex-wrap align-items-center gap-3">
                                <button type="button" class="btn rounded-pill radius-8 px-20 py-11"
                                    :class="activeRange === '7d' ? 'btn-primary-600' : 'btn-outline-primary-600'"
                                    @click="changeRange('7d')">
                                    Last 7 Days
                                </button>

                                <button type="button" class="btn rounded-pill radius-8 px-20 py-11"
                                    :class="activeRange === '30d' ? 'btn-primary-600' : 'btn-outline-primary-600'"
                                    @click="changeRange('30d')">
                                    Last 30 Days
                                </button>

                                <button type="button" class="btn rounded-pill radius-8 px-20 py-11"
                                    :class="activeRange === '6m' ? 'btn-primary-600' : 'btn-outline-primary-600'"
                                    @click="changeRange('6m')">
                                    Last 6 Months
                                </button>

                                <button type="button" class="btn rounded-pill radius-8 px-20 py-11"
                                    :class="activeRange === 'custom' ? 'btn-primary-600' : 'btn-outline-primary-600'"
                                    @click="changeRange('custom')">
                                    Custom
                                </button>
                            </div>

                            <!-- custom date range -->
                            <div v-if="activeRange === 'custom'" class="row g-2 mt-3">
                                <div class="col-md-4">
                                    <label class="form-label mb-1">From</label>
                                    <input v-model="from" type="date" class="form-control" />
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label mb-1">To</label>
                                    <input v-model="to" type="date" class="form-control" />
                                </div>
                                <div class="col-md-4 d-flex align-items-end">
                                    <button type="button" class="btn btn-primary-600 w-100"
                                        :disabled="!from || !to || loading" @click="fetchStatus">
                                        Apply
                                    </button>
                                </div>
                            </div>

                            <div v-if="error" class="alert alert-danger mt-3 mb-0">
                                {{ error }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>










    </div>


    <div class="dashboard-main-body">
        <div class="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
            <div class="col">
                <div class="card shadow-none border bg-gradient-start-1 h-100">
                    <div class="card-body p-20">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p class="fw-medium text-primary-light mb-1">Total Donations (Successful)</p>
                                <h6 class="mb-0">{{ totalSuccess.toFixed(2) }} OMR</h6>
                            </div>
                            <div
                                class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                                <!-- Hand + heart for charities -->
                                <iconify-icon icon="mdi:hand-heart-outline"
                                    class="text-white text-2xl mb-0"></iconify-icon>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <div class="col">
                <div class="card shadow-none border bg-gradient-start-1 h-100">
                    <div class="card-body p-20">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <p class="fw-medium text-primary-light mb-1">Total Donations (failed)</p>
                                <h6 class="mb-0">{{ totalFailed.toFixed(2) }} OMR</h6>
                            </div>
                            <div
                                class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                                <!-- Hand + heart for charities -->
                                <iconify-icon icon="mdi:hand-heart-outline"
                                    class="text-white text-2xl mb-0"></iconify-icon>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>


    </div>


    <div class="dashboard-main-body">

        <div class="row gy-4">
            <div class="col-lg-12">
                <div class="card">


                    <div class="card radius-16 mt-24">
                        <div class="card-header">
                            <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                                <h6 class="mb-2 fw-bold text-lg mb-0">Bar Chart</h6>
                            </div>
                        </div>

                        <div class="card-body">

                            <div v-if="loading" class="text-center py-5">
                                Loading...
                            </div>
                            <ClientOnly v-else>
                                <apexchart type="bar" height="320" :options="barOptions" :series="barSeries" />
                            </ClientOnly>

                        </div>
                    </div>


                </div>

            </div>
        </div>
    </div>


    <div class="dashboard-main-body">
        <div class="row gy-4 mt-1">
            <div class="col-xxl-6 col-xl-12">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex flex-wrap align-items-center justify-content-between">
                            <h6 class="text-lg mb-0">Top Devices</h6>


                        </div>

                        <div class="d-flex flex-wrap align-items-center gap-2 mt-8">
                            <!-- you can add summary badges here later -->
                        </div>

                        <div id="chart" class="pt-28 apexcharts-tooltip-style-1">

                            <div v-if="loading" class="text-center py-4">Loading...</div>
                            <ClientOnly v-else>
                                <div class="d-flex justify-content-center mb-3">
                                    <apexchart type="donut" height="260" :options="devicesPieOptions"
                                        :series="devicesSeries" />
                                </div>
                            </ClientOnly>

                        </div>
                    </div>
                </div>
            </div>


            <div class="col-xxl-6 col-xl-12">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex flex-wrap align-items-center justify-content-between">
                            <h6 class="text-lg mb-0">Top Locations</h6>


                        </div>

                        <div class="d-flex flex-wrap align-items-center gap-2 mt-8">
                            <!-- you can add summary badges here later -->
                        </div>

                        <div id="chart" class="pt-28 apexcharts-tooltip-style-1">

                            <div v-if="loading" class="text-center py-4">Loading...</div>
                            <ClientOnly v-else>
                                <div class="d-flex justify-content-center mb-3">
                                    <apexchart type="donut" height="260" :options="locationsPieOptions"
                                        :series="locationsSeries" />
                                </div>
                            </ClientOnly>

                        </div>
                    </div>
                </div>
            </div>

        </div>


    </div>



    <div class="dashboard-main-body">
  <div class="row gy-4">
    <div class="col-lg-12">
      <div class="card radius-16 shadow-sm border-0 mt-0">
        <!-- Header -->
        <div
          class="card-header border-0 d-flex align-items-center flex-wrap gap-3 justify-content-between"
        >
          <div class="d-flex align-items-center gap-3">
            <div
              class="w-40-px h-40-px rounded-circle bg-primary-50 d-flex align-items-center justify-content-center"
            >
              <iconify-icon
                icon="mdi:chart-timeline-variant-shimmer"
                class="text-primary-600 text-xl"
              ></iconify-icon>
            </div>
            <div>
              <h6 class="text-lg mb-1">Sales by Hour</h6>
              <p class="mb-0 text-xs text-neutral-500">
                Sum of successful donations grouped by weekday and hour of the day.
              </p>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span
              class="badge bg-primary-50 text-primary-600 text-xxs text-uppercase d-flex align-items-center gap-1"
            >
              <iconify-icon icon="mdi:calendar-range" class="text-xs"></iconify-icon>
              <span>
                Range:
                <span v-if="activeRange === '7d'">Last 7 days</span>
                <span v-else-if="activeRange === '30d'">Last 30 days</span>
                <span v-else-if="activeRange === '6m'">Last 6 months</span>
                <span v-else>Custom</span>
              </span>
            </span>
          </div>
        </div>

        <!-- Body -->
        <div class="card-body pt-0">
          <!-- Loading state -->
          <div
            v-if="loading"
            class="d-flex flex-column align-items-center justify-content-center py-5"
          >
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mb-0 text-xs text-neutral-500">
              Preparing your hourly donations heatmap…
            </p>
          </div>

          <!-- Chart -->
          <ClientOnly v-else>
            <div class="border rounded-3 p-3 bg-light">
              <apexchart
                type="heatmap"
                height="380"
                :options="salesByHourOptions"
                :series="salesByHourSeries"
              />
            </div>
          </ClientOnly>

          <!-- Legend + helper text -->
          <div
            class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3"
          >
            <div class="d-flex flex-wrap align-items-center gap-3 small text-neutral-500">
              <span class="d-inline-flex align-items-center gap-1">
                <span
                  style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#f9fafb;border:1px solid #e5e7eb;"
                ></span>
                No sales
              </span>
              <span class="d-inline-flex align-items-center gap-1">
                <span
                  style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#fed7aa;"
                ></span>
                Low
              </span>
              <span class="d-inline-flex align-items-center gap-1">
                <span
                  style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#fb923c;"
                ></span>
                Medium
              </span>
              <span class="d-inline-flex align-items-center gap-1">
                <span
                  style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#f97316;"
                ></span>
                High
              </span>
            </div>

            <p class="mb-0 text-xs text-neutral-400 text-end">
              Darker cells highlight your peak donation hours. Use this to plan campaigns
              and messaging.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>



</template>