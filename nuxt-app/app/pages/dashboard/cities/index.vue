<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
 
})


const { $api } = useNuxtApp() as any

interface RegionOption {
  id: number
  name: string
  country_name?: string
}

interface City {
  id: number
  region_id: number
  name: string
  postal_code: string | null
  is_active: boolean
  region?: {
    id: number
    name: string
    country?: {
      id: number
      name: string
    }
  }
}

interface EditCity {
  id: number | null
  region_id: number | null
  name: string
  postal_code: string | null
  is_active: boolean
}

// -------- State --------

const regions = ref<RegionOption[]>([])
const cities = ref<City[]>([])

const newRegionId = ref<number | null>(null)
const newName = ref<string>('')
const newPostalCode = ref<string>('')
const newIsActive = ref<boolean>(true)

const isSubmit = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isToggle = ref<boolean>(false)

const editedCity = reactive<EditCity>({
  id: null,
  region_id: null,
  name: '',
  postal_code: null,
  is_active: true,
})

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

// -------- API --------

const loadRegions = async () => {
  try {
    const { data } = await $api.get('/api/regions', {
      params: {
        per_page: 9999,
        page: 1,
      },
    })

    regions.value = data.data.map((r: any) => ({
      id: r.id,
      name: r.name,
      country_name: r.country?.name,
    }))
  } catch (error) {
    console.error('Error loading regions', error)
  }
}

const getCities = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/cities', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    cities.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching cities:', error)
  } finally {
    isLoading.value = false
  }
}

const createCity = async (e: Event) => {
  e.preventDefault()
  if (!newRegionId.value) {
    alert('Please select a region')
    return
  }

  isSubmit.value = true
  try {
    await $api.post('/api/cities', {
      region_id: newRegionId.value,
      name: newName.value,
      postal_code: newPostalCode.value || null,
      is_active: newIsActive.value,
    })

    newRegionId.value = null
    newName.value = ''
    newPostalCode.value = ''
    newIsActive.value = true

    await getCities()
  } catch (error: any) {
    console.error(error)
    alert('Failed to create city')
  } finally {
    isSubmit.value = false
  }
}

const updateCity = async (e: Event) => {
  e.preventDefault()
  if (!editedCity.id || !editedCity.region_id) {
    alert('Missing city id or region')
    return
  }

  isSubmit.value = true
  try {
    await $api.put(`/api/cities/${editedCity.id}`, {
      region_id: editedCity.region_id,
      name: editedCity.name,
      postal_code: editedCity.postal_code || null,
      is_active: editedCity.is_active,
    })

    await getCities()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update city')
  } finally {
    isSubmit.value = false
  }
}

const deleteCity = async (id: number) => {
  if (!confirm('Are you sure you want to delete this city?')) return

  try {
    await $api.delete(`/api/cities/${id}`)
    await getCities()
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete city')
  }
}

// -------- UI logic --------

const TogglePopup = (city?: City) => {
  if (city) {
    isToggle.value = true
    editedCity.id = city.id
    editedCity.region_id = city.region_id
    editedCity.name = city.name
    editedCity.postal_code = city.postal_code
    editedCity.is_active = city.is_active
  } else {
    isToggle.value = false
  }
}

const toggleSort = (column: string) => {
  if (table.sortBy === column) {
    table.sortDir = table.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    table.sortBy = column
    table.sortDir = 'asc'
  }
  table.page = 1
}

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  () => {
    getCities()
  }
)

onMounted(async () => {
  await loadRegions()
  await getCities()
})
</script>


<template>
  <div class="dashboard-main-body">
    <!-- Header / breadcrumb -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Cities</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Cities</li>
      </ul>
    </div>

    <!-- Create form card -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="createCity">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Region <span class="text-danger-600">*</span>
                </label>
                <select
                  v-model.number="newRegionId"
                  class="form-select radius-8"
                  required
                >
                  <option :value="null" disabled>Select region</option>
                  <option v-for="r in regions" :key="r.id" :value="r.id">
                    <!-- Show Country - Region if country_name exists -->
                    {{ r.country_name ? `${r.country_name} - ${r.name}` : r.name }}
                  </option>
                </select>
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  City Name <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="newName"
                  class="form-control radius-8"
                  placeholder="Enter city name"
                  required
                />
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Postal Code
                </label>
                <input
                  type="text"
                  v-model="newPostalCode"
                  class="form-control radius-8"
                  placeholder="Postal code (optional)"
                />
              </div>

              <div class="mb-20 form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="cityActive"
                  v-model="newIsActive"
                />
                <label class="form-check-label" for="cityActive">Active</label>
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  () => {
                    newRegionId = null
                    newName = ''
                    newPostalCode = ''
                    newIsActive = true
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
                Save City
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
                City Name
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
              <th scope="col">Postal Code</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(city, index) in cities" :key="city.id">
              <td>{{ index + 1 }}</td>

              <td>
                <h6 class="text-md mb-0 fw-medium flex-grow-1">
                  {{ city.name }}
                </h6>
              </td>

              <td>{{ city.region?.name || '-' }}</td>
              <td>{{ city.region?.country?.name || '-' }}</td>
              <td>{{ city.postal_code || '-' }}</td>

              <td>
                <span
                  class="badge"
                  :class="city.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'"
                >
                  {{ city.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>

              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="TogglePopup(city)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteCity(city.id)"
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

    <!-- Edit modal -->
    <transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isToggle" class="modal-backdrop" @click.self="TogglePopup()">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
            <h6 class="fw-semibold mb-0">Edit City</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="TogglePopup()"
            >
              ✕
            </button>
          </div>

          <form @submit="updateCity">
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Region <span class="text-danger">*</span>
              </label>
              <select
                v-model.number="editedCity.region_id"
                class="form-select radius-8"
                required
              >
                <option :value="null" disabled>Select region</option>
                <option v-for="r in regions" :key="r.id" :value="r.id">
                  {{ r.country_name ? `${r.country_name} - ${r.name}` : r.name }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                City Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editedCity.name"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Postal Code</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editedCity.postal_code"
              />
            </div>

            <div class="mb-3 form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                id="editCityActive"
                v-model="editedCity.is_active"
              />
              <label class="form-check-label" for="editCityActive">
                Active
              </label>
            </div>

            <div class="d-flex align-items-center justify-content-end gap-2">
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="TogglePopup()"
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

