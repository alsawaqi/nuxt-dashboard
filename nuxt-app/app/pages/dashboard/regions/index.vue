<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
 
})

const { $api } = useNuxtApp() as any

interface CountryOption {
  id: number
  name: string
}

interface Region {
  id: number
  country_id: number
  name: string
  type: string | null
  code: string | null
  is_active: boolean
  country?: {
    id: number
    name: string
  }
}

interface EditRegion {
  id: number | null
  country_id: number | null
  name: string
  type: string | null
  code: string | null
  is_active: boolean
}

// ------------ State ------------

const countries = ref<CountryOption[]>([])
const regions = ref<Region[]>([])

const newCountryId = ref<number | null>(null)
const newName = ref<string>('')
const newType = ref<string>('')
const newCode = ref<string>('')
const newIsActive = ref<boolean>(true)

const isSubmit = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isToggle = ref<boolean>(false)

const editedRegion = reactive<EditRegion>({
  id: null,
  country_id: null,
  name: '',
  type: null,
  code: null,
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

// ------------ API ------------

const loadCountries = async () => {
  try {
    const { data } = await $api.get('/api/countries', {
      params: {
        per_page: 9999,
      },
    })

    // assuming same paginator structure
    countries.value = data.data.map((c: any) => ({
      id: c.id,
      name: c.name,
    }))
  } catch (error) {
    console.error('Error loading countries', error)
  }
}

const getRegions = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/regions', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    regions.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching regions:', error)
  } finally {
    isLoading.value = false
  }
}

const createRegion = async (e: Event) => {
  e.preventDefault()
  if (!newCountryId.value) {
    alert('Please select a country')
    return
  }

  isSubmit.value = true
  try {
    await $api.post('/api/regions', {
      country_id: newCountryId.value,
      name: newName.value,
      type: newType.value || null,
      code: newCode.value || null,
      is_active: newIsActive.value,
    })

    newCountryId.value = null
    newName.value = ''
    newType.value = ''
    newCode.value = ''
    newIsActive.value = true

    await getRegions()
  } catch (error: any) {
    console.error(error)
    alert('Failed to create region')
  } finally {
    isSubmit.value = false
  }
}

const updateRegion = async (e: Event) => {
  e.preventDefault()
  if (!editedRegion.id || !editedRegion.country_id) {
    alert('Missing region id or country')
    return
  }

  isSubmit.value = true
  try {
    await $api.put(`/api/regions/${editedRegion.id}`, {
      country_id: editedRegion.country_id,
      name: editedRegion.name,
      type: editedRegion.type || null,
      code: editedRegion.code || null,
      is_active: editedRegion.is_active,
    })

    await getRegions()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update region')
  } finally {
    isSubmit.value = false
  }
}

const deleteRegion = async (id: number) => {
  if (!confirm('Are you sure you want to delete this region?')) return

  try {
    await $api.delete(`/api/regions/${id}`)
    await getRegions()
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete region')
  }
}

// ------------ UI ------------

const TogglePopup = (region?: Region) => {
  if (region) {
    isToggle.value = true
    editedRegion.id = region.id
    editedRegion.country_id = region.country_id
    editedRegion.name = region.name
    editedRegion.type = region.type
    editedRegion.code = region.code
    editedRegion.is_active = region.is_active
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
    getRegions()
  }
)

onMounted(async () => {
  await loadCountries()
  await getRegions()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Regions</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Regions</li>
      </ul>
    </div>

    <!-- Create form (card) -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="createRegion">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Country <span class="text-danger-600">*</span>
                </label>
                <select
                  v-model.number="newCountryId"
                  class="form-select radius-8"
                  required
                >
                  <option :value="null" disabled>Select country</option>
                  <option v-for="c in countries" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </option>
                </select>
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Region Name <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="newName"
                  class="form-control radius-8"
                  placeholder="Muscat, Dubai, Riyadh..."
                  required
                />
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Type
                </label>
                <input
                  type="text"
                  v-model="newType"
                  class="form-control radius-8"
                  placeholder="Governorate, Emirate, State..."
                />
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Code
                </label>
                <input
                  type="text"
                  v-model="newCode"
                  class="form-control radius-8"
                  placeholder="Internal code"
                />
              </div>

              <div class="mb-20 form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="regionActive"
                  v-model="newIsActive"
                />
                <label class="form-check-label" for="regionActive">Active</label>
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  () => {
                    newCountryId = null
                    newName = ''
                    newType = ''
                    newCode = ''
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
                Save Region
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Table card (same structure as your department table) -->
    <!-- ... header with Show per page + search ... -->

    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <!-- perPage + search same as your template -->
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
                Region Name
                <!-- icons same as your template -->
              </th>
              <th scope="col">Country</th>
              <th scope="col">Type</th>
              <th scope="col">Code</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(region, index) in regions" :key="region.id">
              <td>{{ index + 1 }}</td>
              <td>{{ region.name }}</td>
              <td>{{ region.country?.name || '-' }}</td>
              <td>{{ region.type || '-' }}</td>
              <td>{{ region.code || '-' }}</td>
              <td>
                <span
                  class="badge"
                  :class="region.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'"
                >
                  {{ region.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="TogglePopup(region)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteRegion(region.id)"
                  class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                >
                  <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination block = same as your department template -->
      </div>
    </div>

    <!-- Edit modal (same style as yours) -->
    <transition>
      <div v-if="isToggle" class="modal-backdrop" @click.self="TogglePopup()">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
            <h6 class="fw-semibold mb-0">Edit Region</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="TogglePopup()"
            >
              ✕
            </button>
          </div>

          <form @submit="updateRegion">
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Country <span class="text-danger">*</span>
              </label>
              <select
                v-model.number="editedRegion.country_id"
                class="form-select radius-8"
                required
              >
                <option :value="null" disabled>Select country</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Region Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editedRegion.name"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Type</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editedRegion.type"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Code</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editedRegion.code"
              />
            </div>

            <div class="mb-3 form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                id="editRegionActive"
                v-model="editedRegion.is_active"
              />
              <label class="form-check-label" for="editRegionActive">
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

