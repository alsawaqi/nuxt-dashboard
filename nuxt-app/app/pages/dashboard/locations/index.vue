<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()

type RangeKey = '7d' | '30d' | '6m' | 'custom'

 interface CharityLocationOption {
  id: number
  name: string
}

interface MainLocationOption {
  id: number
  name: string
  charity_locations: CharityLocationOption[]
}


interface TopDeviceRow {
  device_id: number
  kiosk_id?: string | null
  status?: string | null
  name?: string | null
  brand?: string | null
  model?: string | null
  success_count: number
  success_amount: number
  last_tx_at?: string | null
}

const topDevices = ref<TopDeviceRow[]>([])

interface CityOption {
  id: number
  name: string
  main_locations: MainLocationOption[]
}

interface DistrictOption {
  id: number
  name: string
  cities: CityOption[]
}

interface RegionOption {
  id: number
  name: string
  districts: DistrictOption[]
}

interface CountryOption {
  id: number
  name: string
  regions: RegionOption[]
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
    DeviceModel?: {
      name?: string | null
      DeviceBrand?: { name?: string | null }
    }
  }
}

// Filters state
const countries = ref<CountryOption[]>([])
const selectedCountryId = ref<number | null>(null)
const selectedRegionId = ref<number | null>(null)
const selectedDistrictId = ref<number | null>(null)
const selectedCityId = ref<number | null>(null)
const selectedMainLocationId = ref<number | null>(null)
const selectedLocationId = ref<number | null>(null) // charity_location_id

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

 const regionsForCountry = computed<RegionOption[]>(() => {
  const c = countries.value.find(c => c.id === selectedCountryId.value)
  return c?.regions ?? []
})

const districtsForRegion = computed<DistrictOption[]>(() => {
  const r = regionsForCountry.value.find(r => r.id === selectedRegionId.value)
  return r?.districts ?? []
})

const citiesForDistrict = computed<CityOption[]>(() => {
  const d = districtsForRegion.value.find(d => d.id === selectedDistrictId.value)
  return d?.cities ?? []
})

const mainLocationsForCity = computed<MainLocationOption[]>(() => {
  const c = citiesForDistrict.value.find(c => c.id === selectedCityId.value)
  return c?.main_locations ?? []
})

const charityLocationsForMainLocation = computed<CharityLocationOption[]>(() => {
  const ml = mainLocationsForCity.value.find(m => m.id === selectedMainLocationId.value)
  return ml?.charity_locations ?? []
})

const selectedLocationLabel = computed(() => {
  const loc = charityLocationsForMainLocation.value.find(l => l.id === selectedLocationId.value)
  return loc?.name ?? ''
})


// Load filters
const loadFilters = async () => {
  try {
    loadingFilters.value = true
    const { data } = await $api.get('/api/stats/charity/locations/filters')
    countries.value = (data.data || []) as CountryOption[]
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load location filters.'
  } finally {
    loadingFilters.value = false
  }
}

const onCountryChange = () => {
  selectedRegionId.value = null
  selectedDistrictId.value = null
  selectedCityId.value = null
  selectedMainLocationId.value = null
  selectedLocationId.value = null
}

const onRegionChange = () => {
  selectedDistrictId.value = null
  selectedCityId.value = null
  selectedMainLocationId.value = null
  selectedLocationId.value = null
}

const onDistrictChange = () => {
  selectedCityId.value = null
  selectedMainLocationId.value = null
  selectedLocationId.value = null
}

const onCityChange = () => {
  selectedMainLocationId.value = null
  selectedLocationId.value = null
}

const onMainLocationChange = () => {
  selectedLocationId.value = null
}


const changeRange = (range: RangeKey) => {
  activeRange.value = range
  if (range !== 'custom') {
    from.value = ''
    to.value = ''
    // auto-fetch if a location is chosen
    if (selectedLocationId.value) {
      fetchStatusByLocation()
    }
  }
}

// Main fetch
const hasAnySelection = computed(() => {
  return !!(
    selectedCountryId.value ||
    selectedRegionId.value ||
    selectedDistrictId.value ||
    selectedCityId.value ||
    selectedMainLocationId.value ||
    selectedLocationId.value
  )
})

const fetchStatusByLocation = async () => {
  if (!hasAnySelection.value) {
    error.value = 'Please select at least Country (or any location level).'
    return
  }

  try {
    loading.value = true
    error.value = null

    const params: Record<string, any> = {
      range: activeRange.value,

      // ✅ send all chosen values (backend will pick most specific)
      country_id: selectedCountryId.value || undefined,
      region_id: selectedRegionId.value || undefined,
      district_id: selectedDistrictId.value || undefined,
      city_id: selectedCityId.value || undefined,
      main_location_id: selectedMainLocationId.value || undefined,
      charity_location_id: selectedLocationId.value || undefined,
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

    const { data } = await $api.get('/api/stats/charity/locations/status', { params })

    totalSuccess.value = Number(data.totals?.success || 0)
    totalFailed.value = Number(data.totals?.failed || 0)

    topDevices.value = (data.top_devices || []) as TopDeviceRow[]

    successTransactions.value = data.success_transactions || []
    failedTransactions.value  = data.failed_transactions || []
  } catch (e: any) {
    console.error(e)
    error.value = e?.response?.data?.message || 'Failed to load location status.'
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
      <h6 class="fw-semibold mb-0">Status by Location</h6>
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
            <!-- Location filters -->
            <!-- Location filters -->
<div class="row g-3 mb-3">
  <div class="col-md-2">
    <label class="form-label mb-1">Country</label>
    <select
      class="form-select"
      v-model="selectedCountryId"
      :disabled="loadingFilters"
      @change="onCountryChange"
    >
      <option :value="null">Select Country</option>
      <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
  </div>

  <div class="col-md-2">
    <label class="form-label mb-1">Region</label>
    <select
      class="form-select"
      v-model="selectedRegionId"
      :disabled="!selectedCountryId || loadingFilters"
      @change="onRegionChange"
    >
      <option :value="null">Select Region</option>
      <option v-for="r in regionsForCountry" :key="r.id" :value="r.id">{{ r.name }}</option>
    </select>
  </div>

  <div class="col-md-2">
    <label class="form-label mb-1">District</label>
    <select
      class="form-select"
      v-model="selectedDistrictId"
      :disabled="!selectedRegionId || loadingFilters"
      @change="onDistrictChange"
    >
      <option :value="null">Select District</option>
      <option v-for="d in districtsForRegion" :key="d.id" :value="d.id">{{ d.name }}</option>
    </select>
  </div>

  <div class="col-md-2">
    <label class="form-label mb-1">City</label>
    <select
      class="form-select"
      v-model="selectedCityId"
      :disabled="!selectedDistrictId || loadingFilters"
      @change="onCityChange"
    >
      <option :value="null">Select City</option>
      <option v-for="c in citiesForDistrict" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
  </div>

  <div class="col-md-2">
    <label class="form-label mb-1">Main Location</label>
    <select
      class="form-select"
      v-model="selectedMainLocationId"
      :disabled="!selectedCityId || loadingFilters"
      @change="onMainLocationChange"
    >
      <option :value="null">Select Main Location</option>
      <option v-for="ml in mainLocationsForCity" :key="ml.id" :value="ml.id">{{ ml.name }}</option>
    </select>
  </div>

  <div class="col-md-2">
    <label class="form-label mb-1">Charity Location</label>
    <select
      class="form-select"
      v-model="selectedLocationId"
      :disabled="!selectedMainLocationId || loadingFilters"
    >
      <option :value="null">Select Charity Location</option>
      <option v-for="loc in charityLocationsForMainLocation" :key="loc.id" :value="loc.id">
        {{ loc.name }}
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
                    :disabled="!from || !to || !hasAnySelection  || loading"
                    @click="fetchStatusByLocation"
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
                :disabled="!hasAnySelection|| loading"
                @click="fetchStatusByLocation"
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
                  <span v-if="selectedLocationLabel" class="d-block text-xs text-muted">
                    {{ selectedLocationLabel }}
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
                  <span v-if="selectedLocationLabel" class="d-block text-xs text-muted">
                    {{ selectedLocationLabel }}
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

      <!-- Add 3rd card later if you like -->
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
                      No successful transactions for this location & period.
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
                      No failed transactions for this location & period.
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


    <div class="row gy-4 mt-4">
  <div class="col-12">
    <div class="card h-100">
      <div class="card-body p-24">
        <div class="d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16">
          <h6 class="mb-0">Top Devices (Success)</h6>
          <span class="badge bg-primary-soft text-primary">
            {{ topDevices.length }} devices
          </span>
        </div>

        <div class="table-responsive scroll-sm">
          <table class="table bordered-table sm-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Device</th>
                <th>Kiosk</th>
                <th>Success Tx</th>
                <th>Success Amount (OMR)</th>
                <th>Last Tx</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(d, index) in topDevices" :key="d.device_id">
                <td>{{ index + 1 }}</td>

                <td>
                  <div class="d-flex flex-column">
                    <span class="fw-semibold">
                      {{ (d.brand || '-') }} - {{ (d.model || '-') }}
                    </span>
                    <small class="text-muted">
                      ID: {{ d.device_id }}
                    </small>
                  </div>
                </td>

                <td>{{ d.kiosk_id || '—' }}</td>

                <td>
                  <span class="badge bg-success-soft text-success">
                    {{ d.success_count }}
                  </span>
                </td>

                <td>{{ Number(d.success_amount || 0).toFixed(2) }}</td>

                <td>{{ d.last_tx_at ? new Date(d.last_tx_at).toLocaleString() : '—' }}</td>

                <td>
                  <NuxtLink
                    :to="`/dashboard/devices/${d.device_id}`"
                    class="btn btn-sm btn-primary"
                  >
                    View
                  </NuxtLink>
                </td>
              </tr>

              <tr v-if="!topDevices.length && !loading">
                <td colspan="7" class="text-center text-muted py-3">
                  No top devices for this scope & period.
                </td>
              </tr>

              <tr v-if="loading">
                <td colspan="7" class="text-center py-3">
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

 
 
