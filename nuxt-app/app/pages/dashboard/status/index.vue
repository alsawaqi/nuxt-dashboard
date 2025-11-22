<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()

type RangeKey = '7d' | '30d' | '6m' | 'custom'

interface DeviceOption {
  id: number
  name: string
  serial_number?: string | null
}

interface DeviceModelOption {
  id: number
  name: string
  devices: DeviceOption[]
}

interface DeviceBrandOption {
  id: number
  name: string
  models: DeviceModelOption[]
}

interface CharityTransaction {
  id: number
  total_amount: number | string
  status: string
  created_at: string
  bank?: { name?: string | null }
  charity_location?: { name?: string | null }
  device?: {
    name?: string | null
    device_model?: {
      name?: string | null
      brand?: { name?: string | null }
    }
  }
}

// Filters state
const brands = ref<DeviceBrandOption[]>([])
const selectedBrandId = ref<number | null>(null)
const selectedModelId = ref<number | null>(null)
const selectedDeviceId = ref<number | null>(null)

const activeRange = ref<RangeKey>('7d')
const from = ref('')
const to = ref('')

const loadingFilters = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

// Stats + data
const totalSuccess = ref(0)
const totalFailed = ref(0)
const successTransactions = ref<CharityTransaction[]>([])
const failedTransactions = ref<CharityTransaction[]>([])

// Computed cascaded options
const modelsForBrand = computed<DeviceModelOption[]>(() => {
  const brand = brands.value.find((b) => b.id === selectedBrandId.value)
  return brand?.models ?? []
})

const devicesForModel = computed<DeviceOption[]>(() => {
  const model = modelsForBrand.value.find((m) => m.id === selectedModelId.value)
  return model?.devices ?? []
})

const selectedDeviceLabel = computed(() => {
  const dev = devicesForModel.value.find((d) => d.id === selectedDeviceId.value)
  if (!dev) return ''
  if (dev.serial_number) {
    return `${dev.name} (${dev.serial_number})`
  }
  return dev.name
})

// Load filters
const loadFilters = async () => {
  try {
    loadingFilters.value = true
    const { data } = await $api.get('/api/stats/charity/devices/filters')
    brands.value = (data.data || []) as DeviceBrandOption[]
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load device filters.'
  } finally {
    loadingFilters.value = false
  }
}

// Change handlers
const onBrandChange = () => {
  selectedModelId.value = null
  selectedDeviceId.value = null
}

const onModelChange = () => {
  selectedDeviceId.value = null
}

const changeRange = (range: RangeKey) => {
  activeRange.value = range
  if (range !== 'custom') {
    from.value = ''
    to.value = ''
    // auto-fetch if a device is chosen
    if (selectedDeviceId.value) {
      fetchStatusByDevice()
    }
  }
}

// Main fetch
const fetchStatusByDevice = async () => {
  if (!selectedDeviceId.value) {
    error.value = 'Please select a device first.'
    return
  }

  try {
    loading.value = true
    error.value = null

    const params: Record<string, any> = {
      device_id: selectedDeviceId.value,
      range: activeRange.value,
    }

    if (activeRange.value === 'custom') {
      if (!from.value || !to.value) {
        loading.value = false
        error.value = 'Please choose From and To dates.'
        return
      }
      params.from = from.value
      params.to = to.value
    }

    const { data } = await $api.get('/api/stats/charity/devices/status', { params })

    totalSuccess.value = Number(data.totals?.success || 0)
    totalFailed.value = Number(data.totals?.failed || 0)

    successTransactions.value = (data.success_transactions || []) as CharityTransaction[]
    failedTransactions.value = (data.failed_transactions || []) as CharityTransaction[]
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load device status.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFilters()
})
</script>



<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">Status by Device</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
      </ul>
    </div>

    <!-- Filters card -->
    <div class="row gy-4">
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Filters</h5>
          </div>

          <div class="card-body">
            <!-- Device filters -->
            <div class="row g-3 mb-3">
              <div class="col-md-4">
                <label class="form-label mb-1">Device Brand</label>
                <select
                  class="form-select"
                  v-model.number="selectedBrandId"
                  :disabled="loadingFilters"
                  @change="onBrandChange"
                >
                  <option :value="null">Select Brand</option>
                  <option
                    v-for="brand in brands"
                    :key="brand.id"
                    :value="brand.id"
                  >
                    {{ brand.name }}
                  </option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label mb-1">Device Model</label>
                <select
                  class="form-select"
                  v-model.number="selectedModelId"
                  :disabled="!selectedBrandId || loadingFilters"
                  @change="onModelChange"
                >
                  <option :value="null">Select Model</option>
                  <option
                    v-for="model in modelsForBrand"
                    :key="model.id"
                    :value="model.id"
                  >
                    {{ model.name }}
                  </option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label mb-1">Device</label>
                <select
                  class="form-select"
                  v-model.number="selectedDeviceId"
                  :disabled="!selectedModelId || loadingFilters"
                >
                  <option :value="null">Select Device</option>
                  <option
                    v-for="dev in devicesForModel"
                    :key="dev.id"
                    :value="dev.id"
                  >
                    {{ dev.name }}<span v-if="dev.serial_number"> ({{ dev.serial_number }})</span>
                  </option>
                </select>
              </div>
            </div>

            <!-- Date range buttons -->
            <div class="card-body p-0 pt-3">
              <div class="d-flex flex-wrap align-items-center gap-3">
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

              <!-- Custom date range -->
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
                  <button
                    type="button"
                    class="btn btn-primary-600 w-100"
                    :disabled="!from || !to || !selectedDeviceId || loading"
                    @click="fetchStatusByDevice"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>

            <!-- Search button for non-custom ranges -->
            <div class="mt-3">
              <button
                type="button"
                class="btn btn-primary-600"
                :disabled="!selectedDeviceId || loading"
                @click="fetchStatusByDevice"
              >
                Search
              </button>
            </div>

            <div v-if="error" class="alert alert-danger mt-3 mb-0">
              {{ error }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Totals cards -->
    <div class="row row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4 mt-4">
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">
                  Total Donations (Success)
                  <span v-if="selectedDeviceLabel" class="d-block text-xs text-muted">
                    {{ selectedDeviceLabel }}
                  </span>
                </p>
                <h6 class="mb-0">{{ totalSuccess.toFixed(2) }} OMR</h6>
              </div>
              <div class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                <iconify-icon icon="mdi:hand-heart-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card shadow-none border bg-gradient-start-2 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">
                  Total Donations (Failed)
                  <span v-if="selectedDeviceLabel" class="d-block text-xs text-muted">
                    {{ selectedDeviceLabel }}
                  </span>
                </p>
                <h6 class="mb-0">{{ totalFailed.toFixed(2) }} OMR</h6>
              </div>
              <div class="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                <iconify-icon icon="mdi:alert-circle-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- You can add a 3rd card later if you want -->
    </div>

    <!-- Tables -->
    <div class="row gy-4 mt-4">
      <!-- Success table -->
      <div class="col-xxl-6 col-xl-12">
        <div class="card h-100">
          <div class="card-body p-24">
            <div class="d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16">
              <h6 class="mb-0">Successful Transactions</h6>
              <span class="badge bg-success-soft text-success">
                {{ successTransactions.length }} records
              </span>
            </div>

            <div class="table-responsive scroll-sm">
              <table class="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Bank</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(t, index) in successTransactions"
                    :key="t.id"
                  >
                    <td>{{ index + 1 }}</td>
                    <td>{{ new Date(t.created_at).toLocaleString() }}</td>
                    <td>{{ Number(t.total_amount).toFixed(2) }}</td>
                    <td>{{ t.bank?.name || '-' }}</td>
                    <td>{{ t.charity_location?.name || '-' }}</td>
                  </tr>
                  <tr v-if="!successTransactions.length && !loading">
                    <td colspan="5" class="text-center text-muted py-3">
                      No successful transactions for this device & period.
                    </td>
                  </tr>
                  <tr v-if="loading">
                    <td colspan="5" class="text-center py-3">
                      Loading...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Failed table -->
      <div class="col-xxl-6 col-xl-12">
        <div class="card h-100">
          <div class="card-body p-24">
            <div class="d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16">
              <h6 class="mb-0">Failed Transactions</h6>
              <span class="badge bg-danger-soft text-danger">
                {{ failedTransactions.length }} records
              </span>
            </div>

            <div class="table-responsive scroll-sm">
              <table class="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Bank</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(t, index) in failedTransactions"
                    :key="t.id"
                  >
                    <td>{{ index + 1 }}</td>
                    <td>{{ new Date(t.created_at).toLocaleString() }}</td>
                    <td>{{ Number(t.total_amount).toFixed(2) }}</td>
                    <td>{{ t.bank?.name || '-' }}</td>
                    <td>{{ t.charity_location?.name || '-' }}</td>
                  </tr>
                  <tr v-if="!failedTransactions.length && !loading">
                    <td colspan="5" class="text-center text-muted py-3">
                      No failed transactions for this device & period.
                    </td>
                  </tr>
                  <tr v-if="loading">
                    <td colspan="5" class="text-center py-3">
                      Loading...
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
</template>
