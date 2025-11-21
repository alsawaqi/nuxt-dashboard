<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ApexOptions } from 'apexcharts'
import { useAuthStore } from '~/stores/auth'
definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})
const { $api } = useNuxtApp()

interface DailyStat {
  date: string
  total_amount: string | number
}

const loading = ref(true)
const error = ref<string | null>(null)
const datas = ref<any>([])
const transactions = ref<any>([])

const categories = ref<string[]>([])
const series = ref([
  {
    name: 'Total Amount',
    data: [] as number[],
  },
])

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

const loadingTopDevices = ref(true)
const errorTopDevices = ref<string | null>(null)

const labels = ref<string[]>([])
const seriesPie = ref<number[]>([])

const chartOptionsPie = ref<ApexOptions>({
  chart: {
    type: 'pie',
    height: 280,
  },
  legend: {
    position: 'bottom',
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => `${val.toFixed(1)}%`,
  },
  tooltip: {
    y: {
      formatter: (val: number) => val.toFixed(2),
    },
  },
  // labels will be injected reactively below
})

const loadTopDevices = async () => {
  loadingTopDevices.value = true
  errorTopDevices.value = null

  try {
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/stats/charity/top-devices')

    const items = (data.data || []) as TopDevice[]

    labels.value = items.map((item) => item.label)
    seriesPie.value = items.map((item) => Number(item.total_amount) || 0)

    // update labels in chart options
    chartOptionsPie.value = {
      ...chartOptionsPie.value,
      labels: labels.value,
    }
  } catch (e) {
    console.error(e)
    errorTopDevices.value = 'Failed to load top devices'
  } finally {
    loadingTopDevices.value = false
  }
}
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

onMounted(async () => {
 
  await loadData()
  await loadTotals()
  await loadTransactions()
  await loadTopDevices()
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
              <select class="form-select bg-base form-select-sm w-auto">
                <option value="today">Today</option>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
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
              <h6 class="mb-2 fw-bold text-lg mb-0">Top Locations (Working Progress)</h6>
              <a href="javascript:void(0)" class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                View All
                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
              </a>
            </div>

            <div class="mt-32">

              <!-- <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                <div class="d-flex align-items-center">
                  <img src="#" alt="" class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                  <div class="flex-grow-1">
                    <h6 class="text-md mb-0 fw-medium">Dianne Russell</h6>
                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                  </div>
                </div>
                <span class="text-primary-light text-md fw-medium">$20</span>
              </div> -->



            </div>

          </div>
        </div>
      </div>


      <div class="col-xxl-3 col-xl-12">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
              <h6 class="mb-2 fw-bold text-lg mb-0">Top Devices (Working Progress)</h6>
              <a href="javascript:void(0)" class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                View All
                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
              </a>
            </div>

            <div class="mt-32">
              <div v-if="loadingTopDevices" class="text-center py-4">
                Loading top devices...
              </div>

              <div v-else-if="errorTopDevices" class="text-danger py-4">
                {{ errorTopDevices }}
              </div>

              <ClientOnly v-else>
                <apexchart type="pie" height="260" :options="chartOptionsPie" :series="series" />
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
              <h6 class="mb-2 fw-bold text-lg mb-0">Top Banks (Working Progress)</h6>
              <a href="javascript:void(0)" class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                View All
                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
              </a>
            </div>

            <div class="mt-32">

              <!-- <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                <div class="d-flex align-items-center">
                  <img src="#" alt="" class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                  <div class="flex-grow-1">
                    <h6 class="text-md mb-0 fw-medium">Dianne Russell</h6>
                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                  </div>
                </div>
                <span class="text-primary-light text-md fw-medium">$20</span>
              </div> -->



            </div>

          </div>
        </div>
      </div>

    </div>
  </div>


</template>