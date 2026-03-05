<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,// adjust to your permission key
})

const { $api } = useNuxtApp() as any

// ---- Types ----
interface Option {
  id: number
  name: string
}

interface MainLocationOption {
  id: number
  name: string
  organization_id: number | null
  country_id: number
  region_id: number | null
  city_id: number | null
  district_id: number | null          // keep as is – main location filtered by city
}


interface CharityLocation {
  id: number
  name: string
  phone: string | null
  email: string | null
  contact_person_name: string | null
  contact_person_phone: string | null
  contact_person_email: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  notes: string | null
  is_active: boolean
  country_id: number
  region_id: number | null
  district_id: number | null        // ⬅️ NEW
  city_id: number | null
  organization_id: number | null
  main_location_id: number | null

  country?: Option | null
  region?: Option | null
  district?: Option | null        // ⬅️ NEW
  city?: Option | null
  organization?: Option | null
  main_location?: { id: number; name: string } | null
}


interface CreateForm {
  country_id: number | null
  region_id: number | null
  district_id: number | null      // ⬅️ NEW
  city_id: number | null
  organization_id: number | null
  main_location_id: number | null
  name: string
  phone: string
  email: string
  contact_person_name: string
  contact_person_phone: string
  contact_person_email: string
  address_line1: string
  address_line2: string
  postal_code: string
  notes: string
  is_active: boolean
}


interface EditForm extends CreateForm {
  id: number | null
}

// ---- State ----
const charityLocations = ref<CharityLocation[]>([])

const organizations = ref<Option[]>([])
const countries = ref<Option[]>([])
const regionsForCreate = ref<Option[]>([])
const districtsForCreate = ref<Option[]>([])
const citiesForCreate = ref<Option[]>([])
const regionsForEdit = ref<Option[]>([])
const districtsForEdit = ref<Option[]>([])
const citiesForEdit = ref<Option[]>([])

const mainLocationsAll = ref<MainLocationOption[]>([])

const createForm = reactive<CreateForm>({
  country_id: null,
  region_id: null,
  city_id: null,
  organization_id: null,
  district_id: null,
  main_location_id: null,
  name: '',
  phone: '',
  email: '',
  contact_person_name: '',
  contact_person_phone: '',
  contact_person_email: '',
  address_line1: '',
  address_line2: '',
  postal_code: '',
  notes: '',
  is_active: true,
})

const editForm = reactive<EditForm>({
  id: null,
  country_id: null,
  region_id: null,
  city_id: null,
  district_id: null,
  organization_id: null,
  main_location_id: null,
  name: '',
  phone: '',
  email: '',
  contact_person_name: '',
  contact_person_phone: '',
  contact_person_email: '',
  address_line1: '',
  address_line2: '',
  postal_code: '',
  notes: '',
  is_active: true,
})

const isSubmit = ref(false)
const isLoading = ref(false)
const isToggle = ref(false)

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc' as 'asc' | 'desc',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

// ---- Computed: filter main locations by organization ----
const mainLocationsForCreate = computed(() => {
  return mainLocationsAll.value.filter((loc) => {
    const matchCountry =
      !createForm.country_id || loc.country_id === createForm.country_id
    const matchRegion =
      !createForm.region_id || loc.region_id === createForm.region_id
    const matchCity =
      !createForm.city_id || loc.city_id === createForm.city_id
    const matchOrg =
      !createForm.organization_id || loc.organization_id === createForm.organization_id

    // must match location selection, and optionally organization
    return matchCountry && matchRegion && matchCity && matchOrg
  })
})


const mainLocationsForEdit = computed(() => {
  return mainLocationsAll.value.filter((loc) => {
    const matchCountry =
      !editForm.country_id || loc.country_id === editForm.country_id
    const matchRegion =
      !editForm.region_id || loc.region_id === editForm.region_id
    const matchCity =
      !editForm.city_id || loc.city_id === editForm.city_id
    const matchOrg =
      !editForm.organization_id || loc.organization_id === editForm.organization_id

    return matchCountry && matchRegion && matchCity && matchOrg
  })
})


const mainLocationSearch = ref('')
 

const filteredMainLocations = computed(() => {
  const q = mainLocationSearch.value.trim().toLowerCase()
  if (!q) return mainLocationsAll.value
  return mainLocationsAll.value.filter(m => (m.name || '').toLowerCase().includes(q))
})

 

const createRows = ref([
  {
    name: '',
    phone: '',
    email: '',
    contact_person_name: '',
    contact_person_phone: '',
    contact_person_email: '',
    address_line1: '',
    address_line2: '',
    postal_code: '',
    notes: '',
    is_active: true,
  }
])

const addCreateRow = () => createRows.value.push({
  name: '',
  phone: '',
  email: '',
  contact_person_name: '',
  contact_person_phone: '',
  contact_person_email: '',
  address_line1: '',
  address_line2: '',
  postal_code: '',
  notes: '',
  is_active: true,
})

const removeCreateRow = (idx: number) => {
  if (createRows.value.length <= 1) return
  createRows.value.splice(idx, 1)
}


// ---- API helpers ----
const fetchOrganizations = async () => {
  try {
    const { data } = await $api.get('/api/organizations/list')
    organizations.value = data
  } catch (error) {
    console.error('Error fetching organizations:', error)
  }
}

const fetchCountries = async () => {
  try {
    const { data } = await $api.get('/api/locations/countries')
    countries.value = data
  } catch (error) {
    console.error('Error fetching countries:', error)
  }
}

const fetchRegionsForCreate = async (countryId: number) => {
  try {
    const { data } = await $api.get('/api/locations/regions', {
      params: { country_id: countryId },
    })
    regionsForCreate.value = data
  } catch (error) {
    console.error('Error fetching regions for create:', error)
  }
}

const fetchCitiesForCreate = async (districtId: number) => {
  try {
    const { data } = await $api.get('/api/locations/cities', {
      params: { district_id: districtId },   // ⬅️ changed
    })
    citiesForCreate.value = data
  } catch (error) {
    console.error('Error fetching cities for create:', error)
  }
}

const fetchDistrictsForCreate = async (regionId: number) => {
  try {
    const { data } = await $api.get('/api/locations/districts', {
      params: { region_id: regionId },
    })
    districtsForCreate.value = data
  } catch (error) {
    console.error('Error fetching districts for create:', error)
  }
}

const fetchDistrictsForEdit = async (regionId: number) => {
  try {
    const { data } = await $api.get('/api/locations/districts', {
      params: { region_id: regionId },
    })
    districtsForEdit.value = data
  } catch (error) {
    console.error('Error fetching districts for edit:', error)
  }
}


const fetchRegionsForEdit = async (countryId: number) => {
  try {
    const { data } = await $api.get('/api/locations/regions', {
      params: { country_id: countryId },
    })
    regionsForEdit.value = data
  } catch (error) {
    console.error('Error fetching regions for edit:', error)
  }
}

const fetchCitiesForEdit = async (districtId: number) => {
  try {
    const { data } = await $api.get('/api/locations/cities', {
      params: { district_id: districtId },   // ⬅️ changed
    })
    citiesForEdit.value = data
  } catch (error) {
    console.error('Error fetching cities for edit:', error)
  }
}

const fetchMainLocationsList = async () => {
  try {
    const { data } = await $api.get('/api/main-locations/list')
    mainLocationsAll.value = data
  } catch (error) {
    console.error('Error fetching main locations list:', error)
  }
}

const fetchCharityLocations = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/charity-locations', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    charityLocations.value = data.data
    console.log(charityLocations.value)
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching charity locations:', error)
  } finally {
    isLoading.value = false
  }
}

// ---- Create ----
const resetCreateForm = () => {
  createForm.country_id = null
  createForm.region_id = null
  createForm.district_id = null
  createForm.city_id = null
  createForm.organization_id = null
  createForm.main_location_id = null
  createForm.name = ''
  createForm.phone = ''
  createForm.email = ''
  createForm.contact_person_name = ''
  createForm.contact_person_phone = ''
  createForm.contact_person_email = ''
  createForm.address_line1 = ''
  createForm.address_line2 = ''
  createForm.postal_code = ''
  createForm.notes = ''
  createForm.is_active = true
  regionsForCreate.value = []
  districtsForCreate.value = []
  citiesForCreate.value = []
}

const handleCreate = async (e: Event) => {
  e.preventDefault()

  if (!createForm.main_location_id) {
    alert('Main location is required')
    return
  }

  const locations = createRows.value
    .map(r => ({
      name: (r.name || '').trim(),
      phone: (r.phone || '').trim() || null,
      email: (r.email || '').trim() || null,
      contact_person_name: (r.contact_person_name || '').trim() || null,
      contact_person_phone: (r.contact_person_phone || '').trim() || null,
      contact_person_email: (r.contact_person_email || '').trim() || null,
      address_line1: (r.address_line1 || '').trim() || null,
      address_line2: (r.address_line2 || '').trim() || null,
      postal_code: (r.postal_code || '').trim() || null,
      notes: (r.notes || '').trim() || null,
      is_active: !!r.is_active,
    }))
    .filter(x => x.name.length > 0)

  if (locations.length === 0) {
    alert('Add at least one charity location name')
    return
  }

  isSubmit.value = true
  try {
    await $api.post('/api/charity-locations/bulk', {
      main_location_id: createForm.main_location_id,
      locations,
    })

    // reset
    createForm.main_location_id = null
    mainLocationSearch.value = ''
    createRows.value = [/* same default object */]

    await fetchCharityLocations()
  } catch (err) {
    console.error(err)
    alert('Failed to create charity locations')
  } finally {
    isSubmit.value = false
  }
}

// ---- Edit / Update ----
const openEditModal = async (loc: CharityLocation) => {
  isToggle.value = true

  editForm.id = loc.id
  editForm.country_id = loc.country_id
  editForm.region_id = loc.region_id
  editForm.city_id = loc.city_id
  editForm.organization_id = loc.organization_id
  editForm.main_location_id = loc.main_location_id
  editForm.name = loc.name
  editForm.phone = loc.phone || ''
  editForm.email = loc.email || ''
  editForm.contact_person_name = loc.contact_person_name || ''
  editForm.contact_person_phone = loc.contact_person_phone || ''
  editForm.contact_person_email = loc.contact_person_email || ''
  editForm.address_line1 = loc.address_line1 || ''
  editForm.address_line2 = loc.address_line2 || ''
  editForm.postal_code = loc.postal_code || ''
  editForm.notes = loc.notes || ''
  editForm.is_active = !!loc.is_active

  regionsForEdit.value = []
  citiesForEdit.value = []

  if (editForm.country_id) {
    await fetchRegionsForEdit(editForm.country_id)
  }
  if (editForm.region_id) {
    await fetchCitiesForEdit(editForm.region_id)
  }
}

const closeEditModal = () => {
  isToggle.value = false
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()

  if (!editForm.id || !editForm.country_id || !editForm.name) {
    alert('Missing required fields')
    return
  }

  isSubmit.value = true

  try {
    await $api.put(`/api/charity-locations/${editForm.id}`, {
      country_id: editForm.country_id,
      region_id: editForm.region_id,
      district_id: editForm.district_id,
      city_id: editForm.city_id,
      organization_id: editForm.organization_id,
      main_location_id: editForm.main_location_id,
      name: editForm.name,
      phone: editForm.phone || null,
      email: editForm.email || null,
      contact_person_name: editForm.contact_person_name || null,
      contact_person_phone: editForm.contact_person_phone || null,
      contact_person_email: editForm.contact_person_email || null,
      address_line1: editForm.address_line1 || null,
      address_line2: editForm.address_line2 || null,
      postal_code: editForm.postal_code || null,
      notes: editForm.notes || null,
      is_active: editForm.is_active,
    })

    await fetchCharityLocations()
    isToggle.value = false
  } catch (error) {
    console.error(error)
    alert('Failed to update charity location')
  } finally {
    isSubmit.value = false
  }
}

// ---- Delete ----
const deleteCharityLocation = async (id: number) => {
  if (!confirm('Are you sure you want to delete this charity location?')) return

  try {
    await $api.delete(`/api/charity-locations/${id}`)
    await fetchCharityLocations()
  } catch (error) {
    console.error(error)
    alert('Failed to delete charity location')
  }
}

// ---- Sort / Watch ----
const toggleSort = (column: string) => {
  if (table.sortBy === column) {
    table.sortDir = table.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    table.sortBy = column
    table.sortDir = 'asc'
  }
  table.page = 1
}

// Create form cascading dropdowns
watch(
  () => createForm.country_id,
  async (newVal) => {
    createForm.region_id = null
    createForm.district_id = null
    createForm.city_id = null

    regionsForCreate.value = []
    districtsForCreate.value = []
    citiesForCreate.value = []

    if (newVal) {
      await fetchRegionsForCreate(newVal)
    }
  }
)

// when region changes, reset district + city, then load districts
watch(
  () => createForm.region_id,
  async (newVal) => {
    createForm.district_id = null
    createForm.city_id = null

    districtsForCreate.value = []
    citiesForCreate.value = []

    if (newVal) {
      await fetchDistrictsForCreate(newVal)
    }
  }
)

// when district changes, reset city, then load cities
watch(
  () => createForm.district_id,
  async (newVal) => {
    createForm.city_id = null
    citiesForCreate.value = []

    if (newVal) {
      await fetchCitiesForCreate(newVal)
    }
  }
)





// Edit form cascading dropdowns
watch(
  () => editForm.country_id,
  async (newVal) => {
    if (!isToggle.value) return
    editForm.region_id = null
    editForm.district_id = null
    editForm.city_id = null

    regionsForEdit.value = []
    districtsForEdit.value = []
    citiesForEdit.value = []

    if (newVal) {
      await fetchRegionsForEdit(newVal)
    }
  }
)

watch(
  () => editForm.region_id,
  async (newVal) => {
    if (!isToggle.value) return
    editForm.district_id = null
    editForm.city_id = null

    districtsForEdit.value = []
    citiesForEdit.value = []

    if (newVal) {
      await fetchDistrictsForEdit(newVal)
    }
  }
)

watch(
  () => editForm.district_id,
  async (newVal) => {
    if (!isToggle.value) return
    editForm.city_id = null
    citiesForEdit.value = []

    if (newVal) {
      await fetchCitiesForEdit(newVal)
    }
  }
)


// Reset main_location_id when organization changes
watch(
  () => createForm.organization_id,
  () => {
    createForm.main_location_id = null
  }
)

watch(
  () => editForm.organization_id,
  () => {
    editForm.main_location_id = null
  }
)

// Table watcher
watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  () => {
    fetchCharityLocations()
  }
)

onMounted(async () => {
  await Promise.all([
    fetchOrganizations(),
    fetchCountries(),
    fetchMainLocationsList(),
    fetchCharityLocations(),
  ])
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Charity Locations</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Charity Locations</li>
      </ul>
    </div>

    <!-- Create form card -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">


            <div class="col-lg-6 mb-20">
  <label class="form-label fw-semibold text-primary-light text-sm mb-8">Search Main Location</label>
  <input v-model="mainLocationSearch" class="form-control radius-8" placeholder="Type to search..." />
</div>

<div class="col-lg-6 mb-20">
  <label class="form-label fw-semibold text-primary-light text-sm mb-8">
    Main Location <span class="text-danger-600">*</span>
  </label>
  <select v-model="createForm.main_location_id" class="form-select radius-8" required>
    <option :value="null" disabled>Select main location</option>
    <option v-for="ml in filteredMainLocations" :key="ml.id" :value="ml.id">
      {{ ml.name }}
    </option>
  </select>
  <small class="text-muted">
    Country / Region / District / City / Organization will be taken automatically from the selected main location.
  </small>
</div>
         

       



            <div v-for="(row, idx) in createRows" :key="idx" class="card mb-3">
  <div class="card-header d-flex justify-content-between align-items-center">
    <div class="fw-semibold">Charity Location {{ idx + 1 }}</div>
    <button type="button" class="btn btn-sm btn-outline-danger"
      @click="removeCreateRow(idx)" :disabled="createRows.length <= 1">
      Remove
    </button>
  </div>

  <div class="card-body">
    <div class="row">
      <!-- Name -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">
          Charity Location Name <span class="text-danger-600">*</span>
        </label>
        <input type="text" v-model="row.name" class="form-control radius-8" placeholder="Enter location name" />
      </div>

      <!-- Phone -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Phone</label>
        <input type="text" v-model="row.phone" class="form-control radius-8" placeholder="Enter phone number" />
      </div>

      <!-- Email -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Email</label>
        <input type="email" v-model="row.email" class="form-control radius-8" placeholder="Enter email" />
      </div>

      <!-- Contact Person Name -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Contact Person Name</label>
        <input type="text" v-model="row.contact_person_name" class="form-control radius-8" placeholder="Contact person name" />
      </div>

      <!-- Contact Person Phone -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Contact Person Phone</label>
        <input type="text" v-model="row.contact_person_phone" class="form-control radius-8" placeholder="Contact person phone" />
      </div>

      <!-- Contact Person Email -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Contact Person Email</label>
        <input type="email" v-model="row.contact_person_email" class="form-control radius-8" placeholder="Contact person email" />
      </div>

      <!-- Address Line 1 -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Address Line 1</label>
        <input type="text" v-model="row.address_line1" class="form-control radius-8" placeholder="Address line 1" />
      </div>

      <!-- Address Line 2 -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Address Line 2</label>
        <input type="text" v-model="row.address_line2" class="form-control radius-8" placeholder="Address line 2" />
      </div>

      <!-- Postal Code -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Postal Code</label>
        <input type="text" v-model="row.postal_code" class="form-control radius-8" placeholder="Postal code" />
      </div>

      <!-- Notes -->
      <div class="col-lg-8 col-md-12 col-sm-12 mb-20">
        <label class="form-label fw-semibold text-primary-light text-sm mb-8">Notes</label>
        <textarea v-model="row.notes" class="form-control radius-8" rows="3"
          placeholder="Additional notes about this location"></textarea>
      </div>

      <!-- Active toggle -->
      <div class="col-lg-4 col-md-6 col-sm-12 mb-20 d-flex align-items-center">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" :id="'isActiveCreate_' + idx" v-model="row.is_active" />
          <label class="form-check-label ms-2" :for="'isActiveCreate_' + idx">
            Active
          </label>
        </div>
      </div>
    </div>
  </div>
</div>

<button type="button" class="btn btn-sm btn-outline-primary" @click="addCreateRow">
  + Add another location
</button>



         
 

            <!-- Buttons full width -->
            <div class="col-12 d-flex align-items-center justify-content-center gap-3 mt-24">
              <button type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="resetCreateForm">
                Reset
              </button>
              <button type="submit" class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                :disabled="isSubmit">
                <span v-if="isSubmit" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Save Charity Location
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>



    <!-- Table card -->
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>
          <div class="icon-field">
            <input type="text" class="form-control form-control-sm w-auto" placeholder="Search"
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
              <th scope="col" @click="toggleSort('name')" style="cursor:pointer">
                Charity Location
                <iconify-icon v-if="table.sortBy === 'name' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'name' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
              </th>
              <th scope="col">Organization</th>
              <th scope="col">Main Location</th>
              <th scope="col">Country</th>
              <th scope="col">Region</th>
              <th scope="col">Districts</th>
              <th scope="col">City</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(loc, index) in charityLocations" :key="loc.id">
              <td>{{ index + 1 }}</td>
              <td>
                <h6 class="text-md mb-0 fw-medium">
                  {{ loc.name }}
                </h6>
                <small class="text-muted">
                  {{ loc.address_line1 || '' }}
                </small>
              </td>
              <td>{{ loc.organization?.name ?? '—' }}</td>
              <td>{{ loc.main_location?.name ?? '—' }}</td>
              <td>{{ loc.country?.name ?? '—' }}</td>
              <td>{{ loc.region?.name ?? '—' }}</td>
              <td>{{ loc.district?.name ?? '—' }}</td>
              <td>{{ loc.city?.name ?? '—' }}</td>
              <td>
                <span class="badge"
                  :class="loc.is_active ? 'bg-success-subtle text-success-main' : 'bg-danger-subtle text-danger-main'">
                  {{ loc.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <a href="javascript:void(0)" @click.prevent="openEditModal(loc)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1">
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a href="javascript:void(0)" @click.prevent="deleteCharityLocation(loc.id)"
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

            <!-- Pages -->
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

    <!-- Edit modal -->
    <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isToggle" class="modal-backdrop" @click.self="closeEditModal">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
            <h6 class="fw-semibold mb-0">Edit Charity Location</h6>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="closeEditModal">
              ✕
            </button>
          </div>

          <form @submit="handleUpdate">
            <!-- Organization -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Organization</label>
              <select v-model="editForm.organization_id" class="form-select radius-8">
                <option :value="null">No organization</option>
                <option v-for="org in organizations" :key="org.id" :value="org.id">
                  {{ org.name }}
                </option>
              </select>
            </div>

            <!-- Main Location -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Main Location</label>
              <select v-model="editForm.main_location_id" class="form-select radius-8">
                <option :value="null">No main location</option>
                <option v-for="ml in mainLocationsForEdit" :key="ml.id" :value="ml.id">
                  {{ ml.name }}
                </option>
              </select>
            </div>

            <!-- Country -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
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
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Region</label>
              <select v-model="editForm.region_id" class="form-select radius-8" :disabled="!editForm.country_id">
                <option :value="null">No region</option>
                <option v-for="r in regionsForEdit" :key="r.id" :value="r.id">
                  {{ r.name }}
                </option>
              </select>
            </div>


            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">District</label>
              <select v-model="editForm.district_id" class="form-select radius-8" :disabled="!editForm.region_id">
                <option :value="null">No district</option>
                <option v-for="d in districtsForEdit" :key="d.id" :value="d.id">
                  {{ d.name }}
                </option>
              </select>
            </div>

            <!-- City -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">City</label>
              <select v-model="editForm.city_id" class="form-select radius-8" :disabled="!editForm.district_id">
                <option :value="null">No city</option>
                <option v-for="c in citiesForEdit" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>

            <!-- Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Charity Location Name <span class="text-danger">*</span>
              </label>
              <input type="text" class="form-control radius-8" v-model="editForm.name" required />
            </div>

            <!-- Phone / Email -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Phone</label>
              <input type="text" class="form-control radius-8" v-model="editForm.phone" />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Email</label>
              <input type="email" class="form-control radius-8" v-model="editForm.email" />
            </div>

            <!-- Contact person -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Contact Person Name
              </label>
              <input type="text" class="form-control radius-8" v-model="editForm.contact_person_name" />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Contact Person Phone
              </label>
              <input type="text" class="form-control radius-8" v-model="editForm.contact_person_phone" />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Contact Person Email
              </label>
              <input type="email" class="form-control radius-8" v-model="editForm.contact_person_email" />
            </div>

            <!-- Address -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Address Line 1</label>
              <input type="text" class="form-control radius-8" v-model="editForm.address_line1" />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Address Line 2</label>
              <input type="text" class="form-control radius-8" v-model="editForm.address_line2" />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Postal Code</label>
              <input type="text" class="form-control radius-8" v-model="editForm.postal_code" />
            </div>

            <!-- Notes -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Notes</label>
              <textarea class="form-control radius-8" rows="3" v-model="editForm.notes"></textarea>
            </div>

            <!-- Active toggle -->
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="isActiveEdit" v-model="editForm.is_active" />
              <label class="form-check-label" for="isActiveEdit">
                Active
              </label>
            </div>

            <div class="d-flex align-items-center justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" @click="closeEditModal">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmit">
                <span v-if="isSubmit" class="spinner-border spinner-border-sm me-1" role="status"
                  aria-hidden="true"></span>
                Save
              </button>
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
  width: min(640px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
  padding: 20px;
}
</style>
