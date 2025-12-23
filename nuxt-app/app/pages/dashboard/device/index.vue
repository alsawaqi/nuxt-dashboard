<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any, // adjust to your permission key
})
const { $api } = useNuxtApp() as any

type ScalefusionInfo = {
  id?: number | null
  name?: string | null

  battery_status?: number | null
  battery_charging?: boolean | null

  connection_state?: string | null
  connection_status?: string | null // Online / Offline

  device_status?: string | null // Locked, etc
  locked?: boolean | null

  last_connected_at?: string | null
  last_seen_on?: string | null
}

// ---------- Types ----------
interface DeviceBrandOption {
  id: number
  name: string
}

interface DeviceModelOption {
  id: number
  name: string
  device_brand_id: number
}

interface BankOption {
  id: number
  name: string
}

interface CountryOption {
  id: number
  name: string
}

interface RegionOption {
  id: number
  name: string
  country_id: number
}

interface CityOption {
  id: number
  name: string
  region_id: number
  district_id: number | null
}

interface MainLocationOption {
  id: number
  name: string
  city_id: number
  company_id: number | null     // ✅ NEW (from main_locations table)
  company?: { id: number; name: string } | null // optional if API returns it
}


interface DistrictOption {
  id: number
  name: string
  region_id: number
}

interface CharityLocationOption {
  id: number
  name: string
  country_id?: number | null
  region_id?: number | null
  district_id?: number | null
  city_id: number | null
  main_location_id: number | null
}

interface CommissionProfileOption {
  id: number
  name: string
}

interface DeviceForm {
  id?: number | null
  companies_id: number | null   // ✅ NEW

  device_brand_id: number | null
  device_model_id: number | null
  bank_id: number | null
  model_number: string
  country_id: number | null
  region_id: number | null
  district_id: number | null
  city_id: number | null
  main_location_id: number | null
  charity_location_id: number | null
  commission_profile_id: number | null
  kiosk_id: string
  login_generated_token: string
  status: string
  installed_at: string | null
}

interface DeviceRow {
  id: number
  device_brand_id?: number | null
  device_model_id?: number | null
  bank_id?: number | null
  model_number?: string | null
  country_id?: number | null
  region_id?: number | null
  district_id?: number | null
  city_id?: number | null
  charity_location_id?: number | null
  commission_profile_id?: number | null
  kiosk_id?: string | null
  login_generated_token?: string | null
  status?: string
  installed_at?: string | null
  created_at?: string
    scalefusion?: ScalefusionInfo | null
}

// ---------- State ----------
const deviceBrands = ref<DeviceBrandOption[]>([])
const deviceModels = ref<DeviceModelOption[]>([])
const banks = ref<BankOption[]>([])
const countries = ref<CountryOption[]>([])
const regions = ref<RegionOption[]>([])
const districts = ref<DistrictOption[]>([])  // ⬅️ NEW

const cities = ref<CityOption[]>([])
const mainLocations = ref<MainLocationOption[]>([])
const charityLocations = ref<CharityLocationOption[]>([])
const commissionProfiles = ref<CommissionProfileOption[]>([])

const devices = ref<DeviceRow[]>([])

const isLoading = ref(false)
const isSubmit = ref(false)
const isToggle = ref(false) // edit modal open?

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc' as 'asc' | 'desc',
  statusFilter: 'all' as 'all' | 'active' | 'disabled' | 'maintenance',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

// Create form
const createForm = reactive<DeviceForm>({
  companies_id: null,
  device_brand_id: null,
  device_model_id: null,
  bank_id: null,
  model_number: '',
  country_id: null,
  region_id: null,
  district_id: null,
  city_id: null,
  main_location_id: null,
  charity_location_id: null,
  commission_profile_id: null,
  kiosk_id: '',
  login_generated_token: '',
  status: 'active',
  installed_at: null,
})

// Edit form (modal)
const editForm = reactive<DeviceForm>({
  id: null,
  companies_id: null,
  device_brand_id: null,
  device_model_id: null,
  bank_id: null,
  model_number: '',
  country_id: null,
  region_id: null,
  district_id: null,
  city_id: null,
  main_location_id: null,
  charity_location_id: null,
  commission_profile_id: null,
  kiosk_id: '',
  login_generated_token: '',
  status: 'active',
  installed_at: null,
})

// ---------- Computed: filtered dropdowns (create) ----------
const modelsForCreate = computed(() =>
  deviceModels.value.filter(
    (m) => m.device_brand_id === createForm.device_brand_id
  )
)

const regionsForCreate = computed(() =>
  regions.value.filter((r) => r.country_id === createForm.country_id)
)

// NEW: Districts under region
const districtsForCreate = computed(() =>
  districts.value.filter((d) => d.region_id === createForm.region_id)
)

// Cities under district
const citiesForCreate = computed(() =>
  cities.value.filter((c) => c.district_id === createForm.district_id)
)

const mainLocationsForCreate = computed(() =>
  mainLocations.value.filter((m) => m.city_id === createForm.city_id)
)

const charityLocationsForCreate = computed(() =>
  charityLocations.value.filter((cl) => {
    if (createForm.main_location_id) {
      return cl.main_location_id === createForm.main_location_id
    }
    if (createForm.city_id) {
      return cl.city_id === createForm.city_id
    }
    return false
  })
)

const sfConnLabel = (row: DeviceRow) => {
  const s = (row.scalefusion?.connection_status || '').toLowerCase()
  if (!s) return '—'
  if (s.includes('online')) return 'Online'
  if (s.includes('offline')) return 'Offline'
  return row.scalefusion?.connection_status ?? '—'
}

const sfConnClass = (row: DeviceRow) => {
  const s = (row.scalefusion?.connection_status || '').toLowerCase()
  if (s.includes('online')) return 'bg-success-subtle text-success'
  if (s.includes('offline')) return 'bg-danger-subtle text-danger'
  return 'bg-secondary-subtle text-secondary'
}

const sfBatteryText = (row: DeviceRow) => {
  const b = row.scalefusion?.battery_status
  if (b === null || b === undefined) return 'Batt: —'
  // Scalefusion sometimes returns % (your sample shows 6). We'll display as-is.
  return `Batt: ${b}${b <= 100 ? '%' : ''}`
}

const sfBatteryClass = (row: DeviceRow) => {
  const b = row.scalefusion?.battery_status
  if (b === null || b === undefined) return 'bg-secondary-subtle text-secondary'
  if (b <= 15) return 'bg-danger-subtle text-danger'
  if (b <= 35) return 'bg-warning-subtle text-warning'
  return 'bg-success-subtle text-success'
}

const sfChargingText = (row: DeviceRow) =>
  row.scalefusion?.battery_charging ? 'Charging' : 'Not charging'

const sfDeviceStatusText = (row: DeviceRow) =>
  row.scalefusion?.device_status ? `SF: ${row.scalefusion.device_status}` : 'SF: —'



const getMainLocationById = (id?: number | null) =>
  mainLocations.value.find(m => m.id === id) ?? null

const selectedCompanyNameForCreate = computed(() => {
  const ml = getMainLocationById(createForm.main_location_id)
  return ml?.company?.name ?? (ml?.company_id ? `#${ml.company_id}` : '—')
})

const selectedCompanyNameForEdit = computed(() => {
  const ml = getMainLocationById(editForm.main_location_id)
  return ml?.company?.name ?? (ml?.company_id ? `#${ml.company_id}` : '—')
})

// ✅ also reset model when brand changes (you were missing this in CREATE)
watch(() => createForm.device_brand_id, () => {
  createForm.device_model_id = null
})



watch(() => createForm.main_location_id, (newVal) => {
  const ml = getMainLocationById(newVal)
  createForm.companies_id = ml?.company_id ?? null
  createForm.charity_location_id = null
})

const isHydratingEdit = ref(false)

watch(() => editForm.main_location_id, (newVal) => {
  if (!isToggle.value || isHydratingEdit.value) return
  const ml = getMainLocationById(newVal)
  editForm.companies_id = ml?.company_id ?? null
  editForm.charity_location_id = null
})



watch(() => editForm.country_id, () => {
  if (!isToggle.value || isHydratingEdit.value) return
  editForm.region_id = null
  editForm.district_id = null
  editForm.city_id = null
  editForm.main_location_id = null
  editForm.charity_location_id = null
  editForm.companies_id = null
})

watch(() => editForm.region_id, () => {
  if (!isToggle.value || isHydratingEdit.value) return
  editForm.district_id = null
  editForm.city_id = null
  editForm.main_location_id = null
  editForm.charity_location_id = null
  editForm.companies_id = null
})

watch(() => editForm.district_id, () => {
  if (!isToggle.value || isHydratingEdit.value) return
  editForm.city_id = null
  editForm.main_location_id = null
  editForm.charity_location_id = null
  editForm.companies_id = null
})

watch(() => editForm.city_id, () => {
  if (!isToggle.value || isHydratingEdit.value) return
  editForm.main_location_id = null
  editForm.charity_location_id = null
  editForm.companies_id = null
})



// ---------- Computed: filtered dropdowns (edit) ----------
const modelsForEdit = computed(() =>
  deviceModels.value.filter(
    (m) => m.device_brand_id === editForm.device_brand_id
  )
)

const regionsForEdit = computed(() =>
  regions.value.filter((r) => r.country_id === editForm.country_id)
)

// NEW
const districtsForEdit = computed(() =>
  districts.value.filter((d) => d.region_id === editForm.region_id)
)

const citiesForEdit = computed(() =>
  cities.value.filter((c) => c.district_id === editForm.district_id)
)

const mainLocationsForEdit = computed(() =>
  mainLocations.value.filter((m) => m.city_id === editForm.city_id)
)

const charityLocationsForEdit = computed(() =>
  charityLocations.value.filter((cl) => {
    if (editForm.main_location_id) {
      return cl.main_location_id === editForm.main_location_id
    }
    if (editForm.city_id) {
      return cl.city_id === editForm.city_id
    }
    return false
  })
)


// ---------- Watchers: cascade resets (create) ----------
watch(
  () => createForm.country_id,
  () => {
    createForm.region_id = null
    createForm.district_id = null
    createForm.city_id = null
    createForm.main_location_id = null
    createForm.charity_location_id = null
  }
)

watch(
  () => createForm.region_id,
  () => {
    createForm.district_id = null
    createForm.city_id = null
    createForm.main_location_id = null
    createForm.charity_location_id = null
  }
)

// NEW: when district changes ⇒ reset city & below
watch(
  () => createForm.district_id,
  () => {
    createForm.city_id = null
    createForm.main_location_id = null
    createForm.charity_location_id = null
  }
)

watch(
  () => createForm.city_id,
  () => {
    createForm.main_location_id = null
    createForm.charity_location_id = null
  }
)

watch(
  () => createForm.main_location_id,
  () => {
    createForm.charity_location_id = null
  }
)


// ---------- Watchers: cascade resets (edit) ----------
watch(
  () => editForm.device_brand_id,
  () => {
    editForm.device_model_id = null
  }
)

watch(
  () => editForm.country_id,
  () => {
    editForm.region_id = null
    editForm.district_id = null
    editForm.city_id = null
    editForm.main_location_id = null
    editForm.charity_location_id = null
  }
)

watch(
  () => editForm.region_id,
  () => {
    editForm.district_id = null
    editForm.city_id = null
    editForm.main_location_id = null
    editForm.charity_location_id = null
  }
)

// NEW
watch(
  () => editForm.district_id,
  () => {
    editForm.city_id = null
    editForm.main_location_id = null
    editForm.charity_location_id = null
  }
)

watch(
  () => editForm.city_id,
  () => {
    editForm.main_location_id = null
    editForm.charity_location_id = null
  }
)

watch(
  () => editForm.main_location_id,
  () => {
    editForm.charity_location_id = null
  }
)


// ---------- Helpers: name lookups for table ----------
const getBrandName = (id?: number | null) =>
  deviceBrands.value.find((b) => b.id === id)?.name ?? '-'

const getModelName = (id?: number | null) =>
  deviceModels.value.find((m) => m.id === id)?.name ?? '-'

const getBankName = (id?: number | null) =>
  banks.value.find((b) => b.id === id)?.name ?? '-'

const getCountryName = (id?: number | null) =>
  countries.value.find((c) => c.id === id)?.name ?? '-'

const getRegionName = (id?: number | null) =>
  regions.value.find((r) => r.id === id)?.name ?? '-'


// NEW
const getDistrictName = (id?: number | null) =>
  districts.value.find((d) => d.id === id)?.name ?? '-'

const getCityName = (id?: number | null) =>
  cities.value.find((c) => c.id === id)?.name ?? '-'

const getCharityLocationName = (id?: number | null) =>
  charityLocations.value.find((cl) => cl.id === id)?.name ?? '-'

const getMainLocationNameByCharity = (charityId?: number | null) => {
  const cl = charityLocations.value.find((c) => c.id === charityId)
  if (!cl?.main_location_id) return '-'
  const ml = mainLocations.value.find((m) => m.id === cl.main_location_id)
  return ml?.name ?? '-'
}

const getCommissionProfileName = (id?: number | null) =>
  commissionProfiles.value.find((p) => p.id === id)?.name ?? '-'

const formatDate = (d?: string | null) => (d ? d : '—')

// ---------- API: small helper to normalize list responses ----------
const normalizeList = (data: any) =>
  (Array.isArray(data) ? data : data?.data ?? [])

// ---------- API: fetch dropdown data ----------
const fetchDeviceBrands = async () => {
  try {
    const { data } = await $api.get('/api/device-brands', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    deviceBrands.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching device brands', e)
  }
}

const fetchDeviceModels = async () => {
  try {
    const { data } = await $api.get('/api/device-models', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    deviceModels.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching device models', e)
  }
}

const fetchBanks = async () => {
  try {
    const { data } = await $api.get('/api/banks', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    banks.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching banks', e)
  }
}

const fetchCountries = async () => {
  try {
    const { data } = await $api.get('/api/countries', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    countries.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching countries', e)
  }
}


const fetchDistricts = async () => {
  try {
    const { data } = await $api.get('/api/districts', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    districts.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching districts', e)
  }
}


const fetchRegions = async () => {
  try {
    const { data } = await $api.get('/api/regions', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    regions.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching regions', e)
  }
}

const fetchCities = async () => {
  try {
    const { data } = await $api.get('/api/cities', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    cities.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching cities', e)
  }
}

const fetchMainLocations = async () => {
  try {
    const { data } = await $api.get('/api/main-locations', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    mainLocations.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching main locations', e)
  }
}

const fetchCharityLocations = async () => {
  try {
    const { data } = await $api.get('/api/charity-locations', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    charityLocations.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching charity locations', e)
  }
}

const fetchCommissionProfiles = async () => {
  try {
    const { data } = await $api.get('/api/commission-profiles', {
      params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' },
    })
    commissionProfiles.value = normalizeList(data)
  } catch (e) {
    console.error('Error fetching commission profiles', e)
  }
}

// ---------- API: devices list ----------
const fetchDevices = async () => {
  isLoading.value = true
  try {
    const params: any = {
      page: table.page,
      per_page: table.perPage,
      search: table.search || undefined,
      sortBy: table.sortBy,
      sortDir: table.sortDir,
      with_scalefusion: 1,
    }

    if (table.statusFilter !== 'all') {
      params.status = table.statusFilter
    }

    const { data } = await $api.get('/api/devices', { params })

    devices.value = data.data || []
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (e) {
    console.error('Error fetching devices', e)
  } finally {
    isLoading.value = false
  }
}

// ---------- Create ----------
const resetCreateForm = () => {
  createForm.device_brand_id = null
  createForm.device_model_id = null
  createForm.bank_id = null
  createForm.model_number = ''
  createForm.country_id = null
  createForm.region_id = null
  createForm.district_id = null
  createForm.city_id = null
  createForm.main_location_id = null
  createForm.companies_id = null

  createForm.charity_location_id = null
  createForm.commission_profile_id = null
  createForm.kiosk_id = ''
  createForm.login_generated_token = ''
  createForm.status = 'active'
  createForm.installed_at = null
}

const handleCreate = async (e: Event) => {
  e.preventDefault()

  if (!createForm.device_brand_id || !createForm.device_model_id) {
    alert('Device brand and model are required')
    return
  }
  if (!createForm.country_id) {
    alert('Country is required')
    return
  }

  isSubmit.value = true
  try {
    await $api.post('/api/devices', {
      device_brand_id: createForm.device_brand_id,
      device_model_id: createForm.device_model_id,
      companies_id: createForm.companies_id || null,       // ✅ NEW
      main_location_id: createForm.main_location_id || null,
      bank_id: createForm.bank_id || null,
      model_number: createForm.model_number || null,
      country_id: createForm.country_id,
      region_id: createForm.region_id || null,
      district_id: createForm.district_id || null,
      city_id: createForm.city_id || null,
      charity_location_id: createForm.charity_location_id || null,
      commission_profile_id: createForm.commission_profile_id || null,
      kiosk_id: createForm.kiosk_id || null,
      login_generated_token: createForm.login_generated_token || null,
      status: createForm.status,
      installed_at: createForm.installed_at || null,
    })

    resetCreateForm()
    table.page = 1
    await fetchDevices()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to create device')
  } finally {
    isSubmit.value = false
  }
}

// ---------- Edit ----------
const openEditModal = async (id: number) => {
  try {
    const { data } = await $api.get(`/api/devices/${id}`)

    isHydratingEdit.value = true
    isToggle.value = true

    editForm.id = data.id
    editForm.device_brand_id = data.device_brand_id ?? null
    editForm.device_model_id = data.device_model_id ?? null
    editForm.bank_id = data.bank_id ?? null
    editForm.model_number = data.model_number ?? ''

    editForm.country_id = data.country_id ?? null
    editForm.region_id = data.region_id ?? null
    editForm.district_id = data.district_id ?? null   // ✅ FIX
    editForm.city_id = data.city_id ?? null

    editForm.main_location_id = data.main_location_id ?? null  // ✅ NEW
    editForm.companies_id = data.companies_id ?? null          // ✅ NEW

    editForm.charity_location_id = data.charity_location_id ?? null

    editForm.commission_profile_id = data.commission_profile_id ?? null
    editForm.kiosk_id = data.kiosk_id ?? ''
    editForm.login_generated_token = data.login_generated_token ?? ''
    editForm.status = data.status ?? 'active'
    editForm.installed_at = data.installed_at ?? null

    // fallback: if API didn’t return main_location_id but charity_location has it
    if (!editForm.main_location_id && data.charity_location?.main_location_id) {
      editForm.main_location_id = data.charity_location.main_location_id
    }

    // ensure companies_id matches selected main location
    const ml = getMainLocationById(editForm.main_location_id)
    if (ml?.company_id) editForm.companies_id = ml.company_id

  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to load device')
    isToggle.value = false
  } finally {
    isHydratingEdit.value = false
  }
}


const closeEditModal = () => {
  isToggle.value = false
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()

  if (!editForm.id) {
    alert('Missing device id')
    return
  }
  if (!editForm.device_brand_id || !editForm.device_model_id) {
    alert('Device brand and model are required')
    return
  }
  if (!editForm.country_id) {
    alert('Country is required')
    return
  }

  isSubmit.value = true
  try {
    await $api.put(`/api/devices/${editForm.id}`, {
      device_brand_id: editForm.device_brand_id,
      device_model_id: editForm.device_model_id,
      companies_id: editForm.companies_id || null,         // ✅ NEW
      main_location_id: editForm.main_location_id || null,
      bank_id: editForm.bank_id || null,
      model_number: editForm.model_number || null,
      country_id: editForm.country_id,
      region_id: editForm.region_id || null,
      district_id: editForm.district_id || null,
      city_id: editForm.city_id || null,
      charity_location_id: editForm.charity_location_id || null,
      commission_profile_id: editForm.commission_profile_id || null,
      kiosk_id: editForm.kiosk_id || null,
      login_generated_token: editForm.login_generated_token || null,
      status: editForm.status,
      installed_at: editForm.installed_at || null,
    })

    await fetchDevices()
    isToggle.value = false
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to update device')
  } finally {
    isSubmit.value = false
  }
}

// ---------- Delete ----------
const deleteDevice = async (id: number) => {
  if (!confirm('Are you sure you want to delete this device?')) return

  try {
    await $api.delete(`/api/devices/${id}`)
    await fetchDevices()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to delete device')
  }
}

// ---------- Sorting ----------
const toggleSort = (column: string) => {
  if (table.sortBy === column) {
    table.sortDir = table.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    table.sortBy = column
    table.sortDir = 'asc'
  }
  table.page = 1
}

// ---------- Watch table controls ----------
watch(
  () => [
    table.page,
    table.perPage,
    table.search,
    table.sortBy,
    table.sortDir,
    table.statusFilter,
  ],
  () => {
    fetchDevices()
  }
)

// ---------- Mounted ----------
onMounted(async () => {
  await Promise.all([
    fetchDeviceBrands(),
    fetchDeviceModels(),
    fetchBanks(),
    fetchCountries(),
    fetchRegions(),
    fetchDistricts(),
    fetchCities(),
    fetchMainLocations(),
    fetchCharityLocations(),
    fetchCommissionProfiles(),
  ])
  await fetchDevices()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Devices</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Devices</li>
      </ul>
    </div>

    <!-- Create Device (4x4 grid) -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">



            <!-- Row 1: Brand / Model / Model Number / Kiosk ID -->
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Device Brand <span class="text-danger-600">*</span>
              </label>
              <select v-model="createForm.device_brand_id" class="form-select radius-8" required>
                <option :value="null" disabled>Select brand</option>
                <option v-for="b in deviceBrands" :key="b.id" :value="b.id">
                  {{ b.name }}
                </option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Device Model <span class="text-danger-600">*</span>
              </label>
              <select v-model="createForm.device_model_id" class="form-select radius-8"
                :disabled="!createForm.device_brand_id" required>
                <option :value="null" disabled>
                  {{ createForm.device_brand_id ? 'Select model' : 'Select brand first' }}
                </option>
                <option v-for="m in modelsForCreate" :key="m.id" :value="m.id">
                  {{ m.name }}
                </option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Model Number
              </label>
              <input type="text" v-model="createForm.model_number" class="form-control radius-8"
                placeholder="e.g. SM-T500" />
            </div>

            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Kiosk ID
              </label>
              <input type="text" v-model="createForm.kiosk_id" class="form-control radius-8"
                placeholder="External kiosk ID" />
            </div>

            <!-- Row 2: Country / Region / City / Main Location -->
            <!-- Country -->
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Country <span class="text-danger-600">*</span>
              </label>
              <select v-model="createForm.country_id" class="form-select radius-8" required>
                <option :value="null" disabled>Select country</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>

            <!-- Region -->
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Region
              </label>
              <select v-model="createForm.region_id" class="form-select radius-8" :disabled="!createForm.country_id">
                <option :value="null">No region</option>
                <option v-for="r in regionsForCreate" :key="r.id" :value="r.id">
                  {{ r.name }}
                </option>
              </select>
            </div>

            <!-- District (NEW) -->
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                District
              </label>
              <select v-model="createForm.district_id" class="form-select radius-8" :disabled="!createForm.region_id">
                <option :value="null">No district</option>
                <option v-for="d in districtsForCreate" :key="d.id" :value="d.id">
                  {{ d.name }}
                </option>
              </select>
            </div>

            <!-- City -->
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                City
              </label>
              <select v-model="createForm.city_id" class="form-select radius-8" :disabled="!createForm.district_id">
                <option :value="null">No city</option>
                <option v-for="c in citiesForCreate" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>


            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Main Location
              </label>
              <select v-model="createForm.main_location_id" class="form-select radius-8"
                :disabled="!createForm.city_id">
                <option :value="null">No main location</option>
                <option v-for="ml in mainLocationsForCreate" :key="ml.id" :value="ml.id">
                  {{ ml.name }}
                </option>
              </select>
            </div>
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Company (auto)
              </label>
              <input class="form-control radius-8" :value="selectedCompanyNameForCreate" disabled />
            </div>

            <!-- Row 3: Charity Location / Bank / Commission / Status -->
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Charity Location
              </label>
              <select v-model="createForm.charity_location_id" class="form-select radius-8"
                :disabled="!createForm.city_id">
                <option :value="null">No charity location</option>
                <option v-for="cl in charityLocationsForCreate" :key="cl.id" :value="cl.id">
                  {{ cl.name }}
                </option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Bank
              </label>
              <select v-model="createForm.bank_id" class="form-select radius-8">
                <option :value="null">No bank</option>
                <option v-for="b in banks" :key="b.id" :value="b.id">
                  {{ b.name }}
                </option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Commission Profile
              </label>
              <select v-model="createForm.commission_profile_id" class="form-select radius-8">
                <option :value="null">No profile</option>
                <option v-for="p in commissionProfiles" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Status
              </label>
              <select v-model="createForm.status" class="form-select radius-8">
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <!-- Row 4: Installed At / Login token -->
            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Installed At
              </label>
              <input type="date" v-model="createForm.installed_at" class="form-control radius-8" />
            </div>

            <div class="col-lg-3 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Login Token
              </label>
              <input type="text" v-model="createForm.login_generated_token" class="form-control radius-8"
                placeholder="Optional login token" />
            </div>

            <!-- Buttons -->
            <div class="col-12 d-flex align-items-center justify-content-center gap-3 mt-24">
              <button type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="resetCreateForm">
                Reset
              </button>
              <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                :disabled="isSubmit">
                <span v-if="isSubmit" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Save Device
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Devices table -->
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <!-- Per page -->
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>

          <!-- Status filter -->
          <div class="d-flex align-items-center gap-2">
            <span>Status</span>
            <select v-model="table.statusFilter" class="form-select form-select-sm w-auto">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <!-- Search -->
          <div class="icon-field">
            <input type="text" class="form-control form-control-sm w-auto" placeholder="Search (kiosk / model / token)"
              v-model="table.search" />
            <span class="icon">
              <iconify-icon icon="ion:search-outline"></iconify-icon>
            </span>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="spinner-border" role="status" v-if="isLoading">
          <span class="sr-only">Loading...</span>
        </div>

        <table class="table bordered-table mb-0" v-else>
          <thead>
            <tr>
              <th scope="col">S.L</th>

              <th scope="col" @click="toggleSort('id')" style="cursor:pointer">
                Device
                <iconify-icon v-if="table.sortBy === 'id' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'id' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
              </th>
              <th>Details</th>

              <th scope="col">
                Location
              </th>

              <th scope="col">
                Bank
              </th>

              <th scope="col">
                Commission Profile
              </th>

              <th scope="col" @click="toggleSort('status')" style="cursor:pointer">
                Status
                <iconify-icon v-if="table.sortBy === 'status' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'status' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
              </th>

              <th scope="col" @click="toggleSort('installed_at')" style="cursor:pointer">
                Installed At
                <iconify-icon v-if="table.sortBy === 'installed_at' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'installed_at' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down" />
              </th>

              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, index) in devices" :key="row.id">
              <td>{{ index + 1 }}</td>

              <td>
                <div class="d-flex flex-column">
                  <span class="fw-semibold">
                    {{ getBrandName(row.device_brand_id) }} - {{ getModelName(row.device_model_id) }}
                  </span>
                  <small class="text-muted">
                    Model#: {{ row.model_number || '—' }} |
                    Kiosk: {{ row.kiosk_id || '—' }}<br>
                    Token: {{ row.login_generated_token || '—' }}
                  </small>
                </div>
              </td>

              <td>
                <small class="text-muted">
  Model#: {{ row.model_number || '—' }} |
  Kiosk: {{ row.kiosk_id || '—' }}<br>
  Token: {{ row.login_generated_token || '—' }}
</small>

<!-- ✅ NEW: Scalefusion quick status -->
<div class="d-flex flex-wrap gap-2 mt-2">
  <span class="badge" :class="sfConnClass(row)">
    {{ sfConnLabel(row) }}
  </span>

  <span class="badge" :class="sfBatteryClass(row)">
    {{ sfBatteryText(row) }}
  </span>

  <span class="badge bg-info-subtle text-info" v-if="row.scalefusion">
    {{ sfChargingText(row) }}
  </span>

  <span class="badge bg-secondary-subtle text-secondary">
    {{ sfDeviceStatusText(row) }}
  </span>
</div>

<small class="text-muted d-block mt-1" v-if="row.scalefusion?.last_seen_on || row.scalefusion?.last_connected_at">
  Last seen: {{ row.scalefusion?.last_seen_on || row.scalefusion?.last_connected_at }}
</small>
              </td>

              <td>
                <div class="d-flex flex-column">
                  <span class="fw-semibold">
                    {{ getCharityLocationName(row.charity_location_id) }}
                  </span>
                  <small class="text-muted">
                    {{ getCountryName(row.country_id) }} /
                    {{ getRegionName(row.region_id) }} /
                    {{ getDistrictName(row.district_id) }} /
                    {{ getCityName(row.city_id) }} /
                    {{ getMainLocationNameByCharity(row.charity_location_id) }}
                  </small>

                </div>
              </td>

              <td>
                {{ getBankName(row.bank_id) }}
              </td>

              <td>
                {{ getCommissionProfileName(row.commission_profile_id) }}
              </td>

              <td>
                <span class="badge" :class="{
                  'bg-success-subtle text-success': row.status === 'active',
                  'bg-danger-subtle text-danger': row.status === 'disabled',
                  'bg-warning-subtle text-warning': row.status === 'maintenance',
                }">
                  {{ row.status || 'unknown' }}
                </span>
              </td>

              <td>
                {{ formatDate(row.installed_at) }}
              </td>

              <td>
                <a href="javascript:void(0)" @click.prevent="openEditModal(row.id)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1">
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a href="javascript:void(0)" @click.prevent="deleteDevice(row.id)"
                  class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center">
                  <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
          <span>
            Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of
            {{ pagination.total || 0 }} entries
          </span>
          <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
            <!-- Prev -->
            <li class="page-item" :class="{ disabled: table.page === 1 }">
              <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">
                <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
              </a>
            </li>

            <!-- Page numbers -->
            <li v-for="p in pagination.last_page" :key="p" class="page-item">
              <a href="javascript:void(0)" @click="table.page = p" :class="[
                'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                p === table.page
                  ? 'bg-primary-600 text-white'
                  : 'bg-primary-50 text-secondary-light',
              ]">
                {{ p }}
              </a>
            </li>

            <!-- Next -->
            <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
              <a class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                href="javascript:void(0)" @click="table.page < pagination.last_page && (table.page += 1)">
                <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isToggle" class="modal-backdrop" @click.self="closeEditModal">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
            <h6 class="fw-semibold mb-0">Edit Device #{{ editForm.id }}</h6>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeEditModal">
              ✕
            </button>
          </div>

          <form @submit="handleUpdate">
            <div class="row">
              <!-- Brand / Model -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Device Brand <span class="text-danger">*</span>
                </label>
                <select v-model="editForm.device_brand_id" class="form-select radius-8" required>
                  <option :value="null" disabled>Select brand</option>
                  <option v-for="b in deviceBrands" :key="b.id" :value="b.id">
                    {{ b.name }}
                  </option>
                </select>
              </div>

              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Device Model <span class="text-danger">*</span>
                </label>
                <select v-model="editForm.device_model_id" class="form-select radius-8"
                  :disabled="!editForm.device_brand_id" required>
                  <option :value="null" disabled>
                    {{ editForm.device_brand_id ? 'Select model' : 'Select brand first' }}
                  </option>
                  <option v-for="m in modelsForEdit" :key="m.id" :value="m.id">
                    {{ m.name }}
                  </option>
                </select>
              </div>

              <!-- Model / Kiosk -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Model Number
                </label>
                <input type="text" class="form-control radius-8" v-model="editForm.model_number" />
              </div>

              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Kiosk ID
                </label>
                <input type="text" class="form-control radius-8" v-model="editForm.kiosk_id" />
              </div>

              <!-- Country -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Country <span class="text-danger">*</span>
                </label>
                <select v-model="editForm.country_id" class="form-select radius-8" required>
                  <option :value="null" disabled>Select country</option>
                  <option v-for="c in countries" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </option>
                </select>
              </div>

              <!-- Region -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Region
                </label>
                <select v-model="editForm.region_id" class="form-select radius-8" :disabled="!editForm.country_id">
                  <option :value="null">No region</option>
                  <option v-for="r in regionsForEdit" :key="r.id" :value="r.id">
                    {{ r.name }}
                  </option>
                </select>
              </div>

              <!-- District (NEW) -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  District
                </label>
                <select v-model="editForm.district_id" class="form-select radius-8" :disabled="!editForm.region_id">
                  <option :value="null">No district</option>
                  <option v-for="d in districtsForEdit" :key="d.id" :value="d.id">
                    {{ d.name }}
                  </option>
                </select>
              </div>

              <!-- City -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  City
                </label>
                <select v-model="editForm.city_id" class="form-select radius-8" :disabled="!editForm.district_id">
                  <option :value="null">No city</option>
                  <option v-for="c in citiesForEdit" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </option>
                </select>
              </div>


              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Main Location
                </label>
                <select v-model="editForm.main_location_id" class="form-select radius-8" :disabled="!editForm.city_id">
                  <option :value="null">No main location</option>
                  <option v-for="ml in mainLocationsForEdit" :key="ml.id" :value="ml.id">
                    {{ ml.name }}
                  </option>
                </select>
              </div>

              <!-- Charity Location -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Charity Location
                </label>
                <select v-model="editForm.charity_location_id" class="form-select radius-8"
                  :disabled="!editForm.city_id">
                  <option :value="null">No charity location</option>
                  <option v-for="cl in charityLocationsForEdit" :key="cl.id" :value="cl.id">
                    {{ cl.name }}
                  </option>
                </select>
              </div>

              <!-- Bank / Commission -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Bank
                </label>
                <select v-model="editForm.bank_id" class="form-select radius-8">
                  <option :value="null">No bank</option>
                  <option v-for="b in banks" :key="b.id" :value="b.id">
                    {{ b.name }}
                  </option>
                </select>
              </div>

              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Commission Profile
                </label>
                <select v-model="editForm.commission_profile_id" class="form-select radius-8">
                  <option :value="null">No profile</option>
                  <option v-for="p in commissionProfiles" :key="p.id" :value="p.id">
                    {{ p.name }}
                  </option>
                </select>
              </div>

              <!-- Status / Installed at -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Status
                </label>
                <select v-model="editForm.status" class="form-select radius-8">
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Installed At
                </label>
                <input type="date" class="form-control radius-8" v-model="editForm.installed_at" />
              </div>

              <!-- Token -->
              <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Login Token
                </label>
                <input type="text" class="form-control radius-8" v-model="editForm.login_generated_token" />
              </div>

              <div class="col-12 d-flex align-items-center justify-content-end gap-2 mt-3">
                <button type="button" class="btn btn-outline-secondary" @click="closeEditModal">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" :disabled="isSubmit">
                  <span v-if="isSubmit" class="spinner-border spinner-border-sm me-1" role="status"
                    aria-hidden="true"></span>
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: grid;
  place-items: center;
  z-index: 1050;
}

.modal-card {
  width: min(900px, 95vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
