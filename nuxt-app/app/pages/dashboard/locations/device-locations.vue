 <script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp() as any

// ---------- Types ----------
type Company = { id: number; name: string }

type MainLocationOption = {
  id: number
  name: string
  company_id?: number | null
  company?: Company | null
}

type CityOption = { id: number; name: string; main_locations: MainLocationOption[] }
type DistrictOption = { id: number; name: string; cities: CityOption[] }
type RegionOption = { id: number; name: string; districts: DistrictOption[] }
type CountryOption = { id: number; name: string; regions: RegionOption[] }

type ScalefusionInfo = {
  id?: number | null
  name?: string | null
  make?: string | null
  model?: string | null
  os_type?: string | null
  os_version?: string | null
  battery_status?: number | null
  battery_charging?: boolean | null
  connection_state?: string | null
  connection_status?: string | null
  device_status?: string | null
  last_seen_on?: string | null
}

type DeviceRow = {
  id: number
  kiosk_id?: string | null
  model_number?: string | null
  login_generated_token?: string | null
  status?: string | null
  installed_at?: string | null

  country_id?: number | null
  region_id?: number | null
  district_id?: number | null
  city_id?: number | null
  main_location_id?: number | null

  device_brand?: { id: number; name: string } | null
  device_model?: { id: number; name: string } | null
  bank?: { id: number; name: string } | null

  country?: { id: number; name: string } | null
  region?: { id: number; name: string } | null
  district?: { id: number; name: string } | null
  city?: { id: number; name: string } | null
  main_location?: { id: number; name: string; company?: Company | null } | null

  scalefusion?: ScalefusionInfo | null
}

type SfSummary = {
  total_devices: number
  online_devices: number
  offline_devices: number
  charging_devices: number
  unknown_devices: number
}

// ---------- State ----------
const countries = ref<CountryOption[]>([])
const loadingFilters = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const selectedCountryId = ref<number | null>(null)
const selectedRegionId = ref<number | null>(null)
const selectedDistrictId = ref<number | null>(null)
const selectedCityId = ref<number | null>(null)
const selectedMainLocationId = ref<number | null>(null)

const table = ref({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc' as 'asc' | 'desc',
  status: 'all' as 'all' | 'active' | 'disabled' | 'maintenance',
})

const devices = ref<DeviceRow[]>([])
const meta = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
  current_page: 1,
  per_page: 10,
})

const sfSummary = ref<SfSummary | null>(null)

// ---------- Computed cascade options ----------
const regionsForCountry = computed(() => {
  const c = countries.value.find(x => x.id === selectedCountryId.value)
  return c?.regions ?? []
})

const districtsForRegion = computed(() => {
  const r = regionsForCountry.value.find(x => x.id === selectedRegionId.value)
  return r?.districts ?? []
})

const citiesForDistrict = computed(() => {
  const d = districtsForRegion.value.find(x => x.id === selectedDistrictId.value)
  return d?.cities ?? []
})

const mainLocationsForCity = computed(() => {
  const c = citiesForDistrict.value.find(x => x.id === selectedCityId.value)
  return c?.main_locations ?? []
})

// Stats (TOTAL based on filter/search)
const totalDevices = computed(() => sfSummary.value?.total_devices ?? meta.value.total)
const onlineDevices = computed(() => sfSummary.value?.online_devices ?? 0)
const offlineDevices = computed(() => sfSummary.value?.offline_devices ?? 0)
const chargingDevices = computed(() => sfSummary.value?.charging_devices ?? 0)

// ---------- API ----------
const loadFilters = async () => {
  loadingFilters.value = true
  error.value = null
  try {
    const { data } = await $api.get('/api/device-locations/filters')
    countries.value = (data.data || []) as CountryOption[]
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load filters.'
  } finally {
    loadingFilters.value = false
  }
}

const fetchDevices = async () => {
  loading.value = true
  error.value = null

  try {
    const params: any = {
      page: table.value.page,
      per_page: table.value.perPage,
      sortBy: table.value.sortBy,
      sortDir: table.value.sortDir,
      search: table.value.search || undefined,
      with_scalefusion: 1,
      with_scalefusion_summary: 1,
    }

    // status filter
    if (table.value.status !== 'all') params.status = table.value.status

    // ANY level filter works
    if (selectedCountryId.value) params.country_id = selectedCountryId.value
    if (selectedRegionId.value) params.region_id = selectedRegionId.value
    if (selectedDistrictId.value) params.district_id = selectedDistrictId.value
    if (selectedCityId.value) params.city_id = selectedCityId.value
    if (selectedMainLocationId.value) params.main_location_id = selectedMainLocationId.value

    const { data } = await $api.get('/api/device-locations/devices', { params })

    devices.value = (data.data || []) as DeviceRow[]
    meta.value = {
      total: data.meta?.total ?? 0,
      from: data.meta?.from ?? 0,
      to: data.meta?.to ?? 0,
      last_page: data.meta?.last_page ?? 1,
      current_page: data.meta?.current_page ?? 1,
      per_page: data.meta?.per_page ?? table.value.perPage,
    }

    sfSummary.value = data.scalefusion_summary ?? null
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load devices.'
  } finally {
    loading.value = false
  }
}

// ---------- cascade resets ----------
watch(selectedCountryId, () => {
  selectedRegionId.value = null
  selectedDistrictId.value = null
  selectedCityId.value = null
  selectedMainLocationId.value = null
  table.value.page = 1
  fetchDevices()
})

watch(selectedRegionId, () => {
  selectedDistrictId.value = null
  selectedCityId.value = null
  selectedMainLocationId.value = null
  table.value.page = 1
  fetchDevices()
})

watch(selectedDistrictId, () => {
  selectedCityId.value = null
  selectedMainLocationId.value = null
  table.value.page = 1
  fetchDevices()
})

watch(selectedCityId, () => {
  selectedMainLocationId.value = null
  table.value.page = 1
  fetchDevices()
})

watch(selectedMainLocationId, () => {
  table.value.page = 1
  fetchDevices()
})

// debounce search (so it doesn’t spam API)
let searchTimer: any = null
watch(() => table.value.search, () => {
  table.value.page = 1
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchDevices(), 350)
})

// perPage/page/status/sort watchers
watch(() => [table.value.page, table.value.perPage, table.value.status, table.value.sortBy, table.value.sortDir], () => {
  fetchDevices()
})

const toggleSort = (col: string) => {
  if (table.value.sortBy === col) {
    table.value.sortDir = table.value.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    table.value.sortBy = col
    table.value.sortDir = 'asc'
  }
  table.value.page = 1
}

onMounted(async () => {
  await loadFilters()
  await fetchDevices()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">Devices by Location</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
      </ul>
    </div>

    <!-- Stats -->
    <div class="row row-cols-lg-4 row-cols-sm-2 row-cols-1 gy-4 mb-24">
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <p class="fw-medium text-primary-light mb-1">Total Devices</p>
            <h6 class="mb-0">{{ totalDevices }}</h6>
            <p class="text-xs text-muted mb-0">Based on current search/filter</p>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <p class="fw-medium text-primary-light mb-1">Online</p>
            <h6 class="mb-0">{{ onlineDevices }}</h6>
            <p class="text-xs text-muted mb-0">From ScaleFusion</p>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card shadow-none border bg-gradient-start-2 h-100">
          <div class="card-body p-20">
            <p class="fw-medium text-primary-light mb-1">Offline</p>
            <h6 class="mb-0">{{ offlineDevices }}</h6>
            <p class="text-xs text-muted mb-0">From ScaleFusion</p>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card shadow-none border bg-gradient-start-2 h-100">
          <div class="card-body p-20">
            <p class="fw-medium text-primary-light mb-1">Charging</p>
            <h6 class="mb-0">{{ chargingDevices }}</h6>
            <p class="text-xs text-muted mb-0">battery_charging = true</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-24">
      <div class="card-header">
        <h5 class="card-title mb-0">Filters</h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3">
            <label class="form-label mb-1">Country</label>
            <select class="form-select" v-model.number="selectedCountryId" :disabled="loadingFilters">
              <option :value="null">All Countries</option>
              <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label mb-1">Region</label>
            <select class="form-select" v-model.number="selectedRegionId" :disabled="!selectedCountryId || loadingFilters">
              <option :value="null">All Regions</option>
              <option v-for="r in regionsForCountry" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <div class="col-md-2">
            <label class="form-label mb-1">District</label>
            <select class="form-select" v-model.number="selectedDistrictId" :disabled="!selectedRegionId || loadingFilters">
              <option :value="null">All Districts</option>
              <option v-for="d in districtsForRegion" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>

          <div class="col-md-2">
            <label class="form-label mb-1">City</label>
            <select class="form-select" v-model.number="selectedCityId" :disabled="!selectedDistrictId || loadingFilters">
              <option :value="null">All Cities</option>
              <option v-for="c in citiesForDistrict" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="col-md-2">
            <label class="form-label mb-1">Main Location</label>
            <select class="form-select" v-model.number="selectedMainLocationId" :disabled="!selectedCityId || loadingFilters">
              <option :value="null">All Main Locations</option>
              <option v-for="ml in mainLocationsForCity" :key="ml.id" :value="ml.id">{{ ml.name }}</option>
            </select>
          </div>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3">
          <div class="d-flex align-items-center gap-2">
            <span>Status</span>
            <select v-model="table.status" class="form-select form-select-sm w-auto">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div class="icon-field">
            <input v-model="table.search" class="form-control form-control-sm" style="min-width: 260px"
              placeholder="Search (kiosk / model / token)" />
            <span class="icon">
              <iconify-icon icon="ion:search-outline"></iconify-icon>
            </span>
          </div>

          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="card basic-data-table">
      <div class="card-body">
        <div v-if="loading" class="text-center py-3">Loading...</div>

        <div v-else class="table-responsive">
          <table class="table bordered-table mb-0 w-100">
            <thead>
              <tr>
                <th>#</th>
                <th @click="toggleSort('id')" style="cursor:pointer">Device</th>
                <th>SF Status</th>
                <th>Battery</th>
                <th>Last Seen</th>
                <th>DB Status</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(row, index) in devices" :key="row.id">
                <td>{{ (meta.from || 1) + index }}</td>

                <td>
                  <div class="d-flex flex-column">
                    <span class="fw-semibold">
                      {{ row.device_brand?.name || '-' }} - {{ row.device_model?.name || '-' }}
                    </span>
                    <small class="text-muted">
                      Kiosk: {{ row.kiosk_id || '—' }} |
                      Token: {{ row.login_generated_token || '—' }}
                    </small>
                  </div>
                </td>

                <td>
                  <span
                    class="badge"
                    :class="row.scalefusion?.connection_status === 'Online'
                      ? 'bg-success-soft text-success'
                      : 'bg-secondary-soft text-secondary'"
                  >
                    {{ row.scalefusion?.connection_status ?? '—' }}
                  </span>
                </td>

                <td>
                  <div class="d-flex flex-column">
                    <span>{{ row.scalefusion?.battery_status ?? '—' }}%</span>
                    <small class="text-muted">
                      Charging: {{ row.scalefusion?.battery_charging ? 'Yes' : 'No' }}
                    </small>
                  </div>
                </td>

                <td>{{ row.scalefusion?.last_seen_on ?? '—' }}</td>

                <td>
                  <span class="badge"
                    :class="row.status === 'active'
                      ? 'bg-success-subtle text-success'
                      : row.status === 'disabled'
                        ? 'bg-danger-subtle text-danger'
                        : 'bg-warning-subtle text-warning'"
                  >
                    {{ row.status || '—' }}
                  </span>
                </td>

                <td>
                  <NuxtLink :to="`/dashboard/devices/${row.kiosk_id}`" class="btn btn-sm btn-primary">
                    View
                  </NuxtLink>
                </td>
              </tr>

              <tr v-if="!devices.length">
                <td colspan="7" class="text-center text-muted py-3">No devices found.</td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ meta.from || 0 }} to {{ meta.to || 0 }} of {{ meta.total || 0 }} entries
            </span>

            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a class="page-link" href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                  <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
                </a>
              </li>

              <li v-for="p in meta.last_page" :key="p" class="page-item">
                <a href="javascript:void(0)" @click="table.page = p"
                  :class="['page-link', p === table.page ? 'bg-primary-600 text-white' : 'bg-primary-50']">
                  {{ p }}
                </a>
              </li>

              <li class="page-item" :class="{ disabled: table.page === meta.last_page }">
                <a class="page-link" href="javascript:void(0)" @click="table.page < meta.last_page && (table.page += 1)">
                  <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
