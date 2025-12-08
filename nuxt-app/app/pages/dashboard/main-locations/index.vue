<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
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

interface MainLocation {
  id: number
  name: string
  country_id: number
  region_id: number | null
  city_id: number | null
  organization_id: number | null
  country?: Option | null
  region?: Option | null
  city?: Option | null
  organization?: Option | null
}

interface CreateForm {
  country_id: number | null
  region_id: number | null
  city_id: number | null
  organization_id: number | null
  name: string
}

interface EditForm extends CreateForm {
  id: number | null
}

// ---- State ----
const mainLocations = ref<MainLocation[]>([])

// dropdown options
const organizations = ref<Option[]>([])
const countries = ref<Option[]>([])
const regionsForCreate = ref<Option[]>([])
const citiesForCreate = ref<Option[]>([])
const regionsForEdit = ref<Option[]>([])
const citiesForEdit = ref<Option[]>([])

const createForm = reactive<CreateForm>({
  country_id: null,
  region_id: null,
  city_id: null,
  organization_id: null,
  name: '',
})

const editForm = reactive<EditForm>({
  id: null,
  country_id: null,
  region_id: null,
  city_id: null,
  organization_id: null,
  name: '',
})

const isSubmit = ref(false)
const isLoading = ref(false)
const isToggle = ref(false) // edit modal

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

const fetchCitiesForCreate = async (regionId: number) => {
  try {
    const { data } = await $api.get('/api/locations/cities', {
      params: { region_id: regionId },
    })
    citiesForCreate.value = data
  } catch (error) {
    console.error('Error fetching cities for create:', error)
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

const fetchCitiesForEdit = async (regionId: number) => {
  try {
    const { data } = await $api.get('/api/locations/cities', {
      params: { region_id: regionId },
    })
    citiesForEdit.value = data
  } catch (error) {
    console.error('Error fetching cities for edit:', error)
  }
}

const fetchMainLocations = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/main-locations', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    mainLocations.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching main locations:', error)
  } finally {
    isLoading.value = false
  }
}

// ---- Create ----
const handleCreate = async (e: Event) => {
  e.preventDefault()
  if (!createForm.country_id || !createForm.name) {
    alert('Country and name are required')
    return
  }

  isSubmit.value = true

  try {
    await $api.post('/api/main-locations', {
      country_id: createForm.country_id,
      region_id: createForm.region_id,
      city_id: createForm.city_id,
      organization_id: createForm.organization_id,
      name: createForm.name,
    })

    // reset form
    createForm.country_id = null
    createForm.region_id = null
    createForm.city_id = null
    createForm.organization_id = null
    createForm.name = ''
    regionsForCreate.value = []
    citiesForCreate.value = []

    table.page = 1
    await fetchMainLocations()
  } catch (error) {
    console.error(error)
    alert('Failed to create main location')
  } finally {
    isSubmit.value = false
  }
}

// ---- Edit / Update ----
const openEditModal = async (loc: MainLocation) => {
  isToggle.value = true
  editForm.id = loc.id
  editForm.name = loc.name
  editForm.country_id = loc.country_id
  editForm.region_id = loc.region_id
  editForm.city_id = loc.city_id
  editForm.organization_id = loc.organization_id

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
    await $api.put(`/api/main-locations/${editForm.id}`, {
      country_id: editForm.country_id,
      region_id: editForm.region_id,
      city_id: editForm.city_id,
      organization_id: editForm.organization_id,
      name: editForm.name,
    })

    await fetchMainLocations()
    isToggle.value = false
  } catch (error) {
    console.error(error)
    alert('Failed to update main location')
  } finally {
    isSubmit.value = false
  }
}

// ---- Delete ----
const deleteMainLocation = async (id: number) => {
  if (!confirm('Are you sure you want to delete this main location?')) return

  try {
    await $api.delete(`/api/main-locations/${id}`)
    await fetchMainLocations()
  } catch (error) {
    console.error(error)
    alert('Failed to delete main location')
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
  async newVal => {
    createForm.region_id = null
    createForm.city_id = null
    regionsForCreate.value = []
    citiesForCreate.value = []

    if (newVal) {
      await fetchRegionsForCreate(newVal)
    }
  }
)

watch(
  () => createForm.region_id,
  async newVal => {
    createForm.city_id = null
    citiesForCreate.value = []
    if (newVal) {
      await fetchCitiesForCreate(newVal)
    }
  }
)

// Edit form cascading
watch(
  () => editForm.country_id,
  async newVal => {
    if (!isToggle.value) return
    editForm.region_id = null
    editForm.city_id = null
    regionsForEdit.value = []
    citiesForEdit.value = []

    if (newVal) {
      await fetchRegionsForEdit(newVal)
    }
  }
)

watch(
  () => editForm.region_id,
  async newVal => {
    if (!isToggle.value) return
    editForm.city_id = null
    citiesForEdit.value = []
    if (newVal) {
      await fetchCitiesForEdit(newVal)
    }
  }
)

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  () => {
    fetchMainLocations()
  }
)

onMounted(async () => {
  await Promise.all([
    fetchOrganizations(),
    fetchCountries(),
    fetchMainLocations(),
  ])
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header / breadcrumb -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Main Locations</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Main Locations</li>
      </ul>
    </div>

    <!-- Create form card -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">
            <div class="col-sm-12">
              <!-- Organization -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Organization
                </label>
                <select
                  v-model="createForm.organization_id"
                  class="form-select radius-8"
                >
                  <option :value="null">No organization</option>
                  <option
                    v-for="org in organizations"
                    :key="org.id"
                    :value="org.id"
                  >
                    {{ org.name }}
                  </option>
                </select>
              </div>

              <!-- Country -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Country <span class="text-danger-600">*</span>
                </label>
                <select
                  v-model="createForm.country_id"
                  class="form-select radius-8"
                  required
                >
                  <option :value="null" disabled>Select country</option>
                  <option
                    v-for="c in countries"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </option>
                </select>
              </div>

              <!-- Region -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Region
                </label>
                <select
                  v-model="createForm.region_id"
                  class="form-select radius-8"
                  :disabled="!createForm.country_id"
                >
                  <option :value="null">No region</option>
                  <option
                    v-for="r in regionsForCreate"
                    :key="r.id"
                    :value="r.id"
                  >
                    {{ r.name }}
                  </option>
                </select>
              </div>

              <!-- City -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  City
                </label>
                <select
                  v-model="createForm.city_id"
                  class="form-select radius-8"
                  :disabled="!createForm.region_id"
                >
                  <option :value="null">No city</option>
                  <option
                    v-for="c in citiesForCreate"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </option>
                </select>
              </div>

              <!-- Name -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Main Location Name <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="createForm.name"
                  class="form-control radius-8"
                  placeholder="Enter main location name"
                  required
                />
              </div>
            </div>

            <!-- Buttons -->
            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  () => {
                    createForm.organization_id = null
                    createForm.country_id = null
                    createForm.region_id = null
                    createForm.city_id = null
                    createForm.name = ''
                    regionsForCreate = []
                    citiesForCreate = []
                  }
                "
              >
                Reset
              </button>
              <button
                type="submit"
                class="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8"
                :disabled="isSubmit"
              >
                <span
                  v-if="isSubmit"
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                Save Main Location
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
            <input
              type="text"
              class="form-control form-control-sm w-auto"
              placeholder="Search"
              v-model="table.search"
            />
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
                Main Location
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>
              <th scope="col">Organization</th>
              <th scope="col">Country</th>
              <th scope="col">Region</th>
              <th scope="col">City</th>
              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(loc, index) in mainLocations" :key="loc.id">
              <td>{{ index + 1 }}</td>
              <td>
                <h6 class="text-md mb-0 fw-medium">
                  {{ loc.name }}
                </h6>
              </td>
              <td>
                {{ loc.organization?.name ?? '—' }}
              </td>
              <td>
                {{ loc.country?.name ?? '—' }}
              </td>
              <td>
                {{ loc.region?.name ?? '—' }}
              </td>
              <td>
                {{ loc.city?.name ?? '—' }}
              </td>
              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="openEditModal(loc)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteMainLocation(loc.id)"
                  class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                >
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
              <a
                class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                href="javascript:void(0)"
                @click="table.page > 1 && (table.page -= 1)"
              >
                <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
              </a>
            </li>

            <!-- Pages -->
            <li v-for="p in pagination.last_page" :key="p" class="page-item">
              <a
                href="javascript:void(0)"
                @click="table.page = p"
                :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-50 text-secondary-light',
                ]"
              >
                {{ p }}
              </a>
            </li>

            <!-- Next -->
            <li class="page-item" :class="{ disabled: table.page === pagination.last_page }">
              <a
                class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                href="javascript:void(0)"
                @click="table.page < pagination.last_page && (table.page += 1)"
              >
                <iconify-icon icon="ep:d-arrow-right" class="text-xl"></iconify-icon>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isToggle" class="modal-backdrop" @click.self="closeEditModal">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
            <h6 class="fw-semibold mb-0">Edit Main Location</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="closeEditModal"
            >
              ✕
            </button>
          </div>

          <form @submit="handleUpdate">
            <!-- Organization -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Organization</label>
              <select
                v-model="editForm.organization_id"
                class="form-select radius-8"
              >
                <option :value="null">No organization</option>
                <option
                  v-for="org in organizations"
                  :key="org.id"
                  :value="org.id"
                >
                  {{ org.name }}
                </option>
              </select>
            </div>

            <!-- Country -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Country <span class="text-danger">*</span>
              </label>
              <select
                v-model="editForm.country_id"
                class="form-select radius-8"
                required
              >
                <option :value="null" disabled>Select country</option>
                <option
                  v-for="c in countries"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </div>

            <!-- Region -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Region
              </label>
              <select
                v-model="editForm.region_id"
                class="form-select radius-8"
                :disabled="!editForm.country_id"
              >
                <option :value="null">No region</option>
                <option
                  v-for="r in regionsForEdit"
                  :key="r.id"
                  :value="r.id"
                >
                  {{ r.name }}
                </option>
              </select>
            </div>

            <!-- City -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                City
              </label>
              <select
                v-model="editForm.city_id"
                class="form-select radius-8"
                :disabled="!editForm.region_id"
              >
                <option :value="null">No city</option>
                <option
                  v-for="c in citiesForEdit"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </div>

            <!-- Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Main Location Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.name"
                required
              />
            </div>

            <div class="d-flex align-items-center justify-content-end gap-2">
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="closeEditModal"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmit">
                <span
                  v-if="isSubmit"
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
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
