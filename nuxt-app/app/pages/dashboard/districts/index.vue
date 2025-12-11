<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp() as any

// ---------- Types ----------
interface CountryOption {
  id: number
  name: string
}

interface RegionOption {
  id: number
  name: string
  country_id: number
}

interface DistrictRow {
  id: number
  name: string
  region_id: number
  created_at?: string
}

interface DistrictForm {
  id?: number | null
  country_id: number | null
  region_id: number | null
  name: string
}

// ---------- State ----------
const countries = ref<CountryOption[]>([])
const regions = ref<RegionOption[]>([])
const districts = ref<DistrictRow[]>([])

const isLoading = ref(false)
const isSubmit = ref(false)
const isToggle = ref(false) // edit modal

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc' as 'asc' | 'desc',
})

const filters = reactive({
  country_id: null as number | null,
  region_id: null as number | null,
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

// Create form
const createForm = reactive<DistrictForm>({
  country_id: null,
  region_id: null,
  name: '',
})

// Edit form
const editForm = reactive<DistrictForm>({
  id: null,
  country_id: null,
  region_id: null,
  name: '',
})

// ---------- Computed: regions cascades ----------
const regionsForCreate = computed(() => {
  if (!createForm.country_id) return []
  const cid = Number(createForm.country_id)
  return regions.value.filter((r) => r.country_id === cid)
})

const regionsForEdit = computed(() => {
  if (!editForm.country_id) return []
  const cid = Number(editForm.country_id)
  return regions.value.filter((r) => r.country_id === cid)
})

const regionsForFilter = computed(() => {
  if (!filters.country_id) return regions.value
  const cid = Number(filters.country_id)
  return regions.value.filter((r) => r.country_id === cid)
})

// ---------- Watchers (cascade resets) ----------
watch(
  () => createForm.country_id,
  () => {
    createForm.region_id = null
  }
)

watch(
  () => editForm.country_id,
  () => {
    editForm.region_id = null
  }
)

watch(
  () => filters.country_id,
  () => {
    filters.region_id = null
  }
)

// ---------- Helpers ----------
const getCountryNameByRegionId = (regionId?: number | null) => {
  if (!regionId) return '-'
  const region = regions.value.find((r) => r.id === Number(regionId))
  if (!region) return '-'
  const country = countries.value.find((c) => c.id === region.country_id)
  return country?.name ?? '-'
}

const getRegionName = (id?: number | null) => {
  if (!id) return '-'
  const region = regions.value.find((r) => r.id === Number(id))
  return region?.name ?? '-'
}

const formatDate = (d?: string | null) => (d ? d : '—')

const normalizeList = (data: any) =>
  Array.isArray(data) ? data : data?.data ?? []

// ---------- API: dropdowns ----------
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

// ---------- API: districts list ----------
const fetchDistricts = async () => {
  isLoading.value = true
  try {
    const params: any = {
      page: table.page,
      per_page: table.perPage,
      search: table.search || undefined,
      sortBy: table.sortBy,
      sortDir: table.sortDir,
    }

    if (filters.country_id) params.country_id = filters.country_id
    if (filters.region_id) params.region_id = filters.region_id

    const { data } = await $api.get('/api/districts', { params })

    districts.value = data.data || []
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (e) {
    console.error('Error fetching districts', e)
  } finally {
    isLoading.value = false
  }
}

// ---------- Create ----------
const resetCreateForm = () => {
  createForm.country_id = null
  createForm.region_id = null
  createForm.name = ''
}

const handleCreate = async (e: Event) => {
  e.preventDefault()

  if (!createForm.country_id) {
    alert('Country is required')
    return
  }
  if (!createForm.region_id) {
    alert('Region is required')
    return
  }
  if (!createForm.name.trim()) {
    alert('District name is required')
    return
  }

  isSubmit.value = true
  try {
    await $api.post('/api/districts', {
      name: createForm.name.trim(),
      region_id: createForm.region_id,
    })

    resetCreateForm()
    table.page = 1
    await fetchDistricts()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to create district')
  } finally {
    isSubmit.value = false
  }
}

// ---------- Edit ----------
const openEditModal = async (id: number) => {
  try {
    const { data } = await $api.get(`/api/districts/${id}`)

    editForm.id = data.id
    editForm.name = data.name
    editForm.region_id = data.region_id

    // derive country from region
    const region = regions.value.find((r) => r.id === data.region_id)
    editForm.country_id = region ? region.country_id : null

    isToggle.value = true
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to load district')
  }
}

const closeEditModal = () => {
  isToggle.value = false
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()

  if (!editForm.id) {
    alert('Missing district id')
    return
  }
  if (!editForm.country_id) {
    alert('Country is required')
    return
  }
  if (!editForm.region_id) {
    alert('Region is required')
    return
  }
  if (!editForm.name.trim()) {
    alert('District name is required')
    return
  }

  isSubmit.value = true
  try {
    await $api.put(`/api/districts/${editForm.id}`, {
      name: editForm.name.trim(),
      region_id: editForm.region_id,
    })

    await fetchDistricts()
    isToggle.value = false
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to update district')
  } finally {
    isSubmit.value = false
  }
}

// ---------- Delete ----------
const deleteDistrict = async (id: number) => {
  if (!confirm('Are you sure you want to delete this district?')) return

  try {
    await $api.delete(`/api/districts/${id}`)
    await fetchDistricts()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to delete district')
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

// ---------- Watch table + filters ----------
watch(
  () => [
    table.page,
    table.perPage,
    table.search,
    table.sortBy,
    table.sortDir,
    filters.country_id,
    filters.region_id,
  ],
  () => {
    fetchDistricts()
  }
)

// ---------- Mounted ----------
onMounted(async () => {
  await Promise.all([fetchCountries(), fetchRegions()])
  await fetchDistricts()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Districts</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Districts</li>
      </ul>
    </div>

    <!-- Create District -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">
            <!-- Country -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
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
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Region <span class="text-danger-600">*</span>
              </label>
              <select
                v-model="createForm.region_id"
                class="form-select radius-8"
                :disabled="!createForm.country_id"
                required
              >
                <option :value="null" disabled>
                  {{ createForm.country_id ? 'Select region' : 'Select country first' }}
                </option>
                <option
                  v-for="r in regionsForCreate"
                  :key="r.id"
                  :value="r.id"
                >
                  {{ r.name }}
                </option>
              </select>
            </div>

            <!-- District Name -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                District Name <span class="text-danger-600">*</span>
              </label>
              <input
                type="text"
                v-model="createForm.name"
                class="form-control radius-8"
                placeholder="e.g. Bawshar"
                required
              />
            </div>

            <!-- Buttons -->
            <div class="col-12 d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="resetCreateForm"
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
                />
                Save District
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Districts table -->
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

          <!-- Filter Country -->
          <div class="d-flex align-items-center gap-2">
            <span>Country</span>
            <select
              v-model="filters.country_id"
              class="form-select form-select-sm w-auto"
            >
              <option :value="null">All</option>
              <option
                v-for="c in countries"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
            </select>
          </div>

          <!-- Filter Region -->
          <div class="d-flex align-items-center gap-2">
            <span>Region</span>
            <select
              v-model="filters.region_id"
              class="form-select form-select-sm w-auto"
            >
              <option :value="null">All</option>
              <option
                v-for="r in regionsForFilter"
                :key="r.id"
                :value="r.id"
              >
                {{ r.name }}
              </option>
            </select>
          </div>

          <!-- Search -->
          <div class="icon-field">
            <input
              type="text"
              class="form-control form-control-sm w-auto"
              placeholder="Search district name"
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

              <th
                scope="col"
                @click="toggleSort('name')"
                style="cursor:pointer"
              >
                District
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col">Region</th>
              <th scope="col">Country</th>

              <th
                scope="col"
                @click="toggleSort('created_at')"
                style="cursor:pointer"
              >
                Created At
                <iconify-icon
                  v-if="table.sortBy === 'created_at' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'created_at' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, index) in districts" :key="row.id">
              <td>{{ index + 1 }}</td>
              <td>{{ row.name }}</td>
              <td>{{ getRegionName(row.region_id) }}</td>
              <td>{{ getCountryNameByRegionId(row.region_id) }}</td>
              <td>{{ formatDate(row.created_at) }}</td>
              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="openEditModal(row.id)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteDistrict(row.id)"
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

            <!-- Page numbers -->
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

    <!-- Edit Modal -->
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
            <h6 class="fw-semibold mb-0">Edit District #{{ editForm.id }}</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="closeEditModal"
            >
              ✕
            </button>
          </div>

          <form @submit="handleUpdate">
            <div class="row">
              <!-- Country -->
              <div class="col-md-6 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
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
              <div class="col-md-6 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  Region <span class="text-danger">*</span>
                </label>
                <select
                  v-model="editForm.region_id"
                  class="form-select radius-8"
                  :disabled="!editForm.country_id"
                  required
                >
                  <option :value="null" disabled>
                    {{ editForm.country_id ? 'Select region' : 'Select country first' }}
                  </option>
                  <option
                    v-for="r in regionsForEdit"
                    :key="r.id"
                    :value="r.id"
                  >
                    {{ r.name }}
                  </option>
                </select>
              </div>

              <!-- District name -->
              <div class="col-md-12 mb-3">
                <label class="form-label fw-semibold text-sm mb-8">
                  District Name <span class="text-danger">*</span>
                </label>
                <input
                  type="text"
                  class="form-control radius-8"
                  v-model="editForm.name"
                  required
                />
              </div>

              <div class="col-12 d-flex align-items-center justify-content-end gap-2 mt-3">
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
                  />
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
  width: min(720px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
  padding: 20px;
}
</style>
