<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,// adjust to your permission key
})

const { $api } = useNuxtApp() as any

// ---- Types ----
interface DeviceBrandOption {
  id: number
  name: string
}

interface DeviceModelRow {
  id: number
  device_brand_id: number
  name: string
  brand?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

interface CreateForm {
  device_brand_id: number | null
  name: string
}

interface EditForm {
  id: number | null
  device_brand_id: number | null
  name: string
}

// ---- State ----
const brands = ref<DeviceBrandOption[]>([])
const models = ref<DeviceModelRow[]>([])

const createForm = reactive<CreateForm>({
  device_brand_id: null,
  name: '',
})

const editForm = reactive<EditForm>({
  id: null,
  device_brand_id: null,
  name: '',
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
  brandFilter: null as number | null,
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

// For showing brand name safely
const brandNameById = computed(() => {
  const map = new Map<number, string>()
  brands.value.forEach((b) => map.set(b.id, b.name))
  return map
})

// ---- API helpers ----
const fetchBrands = async () => {
  try {
    const { data } = await $api.get('/api/device-brands', {
      params: {
        page: 1,
        per_page: 9999,
        sortBy: 'name',
        sortDir: 'asc',
      },
    })

    brands.value = (data.data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
    }))
  } catch (error) {
    console.error('Error fetching device brands:', error)
  }
}

const fetchDeviceModels = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/device-models', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
        brand_id: table.brandFilter || undefined,
      },
    })

    models.value = data.data
    
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching device models:', error)
  } finally {
    isLoading.value = false
  }
}

const resetCreateForm = () => {
  createForm.device_brand_id = null
  createForm.name = ''
}

// ---- Create ----
const handleCreate = async (e: Event) => {
  e.preventDefault()

  if (!createForm.device_brand_id) {
    alert('Please select a brand')
    return
  }

  if (!createForm.name) {
    alert('Model name is required')
    return
  }

  isSubmit.value = true

  try {
    await $api.post('/api/device-models', {
      device_brand_id: createForm.device_brand_id,
      name: createForm.name,
    })

    resetCreateForm()
    table.page = 1
    await fetchDeviceModels()
  } catch (error: any) {
    console.error(error)
    alert('Failed to create device model')
  } finally {
    isSubmit.value = false
  }
}

// ---- Edit / Update ----
const openEditModal = (row: DeviceModelRow) => {
  isToggle.value = true

  editForm.id = row.id
  editForm.device_brand_id = row.device_brand_id
  editForm.name = row.name
}

const closeEditModal = () => {
  isToggle.value = false
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()

  if (!editForm.id) {
    alert('Missing model id')
    return
  }

  if (!editForm.device_brand_id) {
    alert('Please select a brand')
    return
  }

  if (!editForm.name) {
    alert('Model name is required')
    return
  }

  isSubmit.value = true

  try {
    await $api.put(`/api/device-models/${editForm.id}`, {
      device_brand_id: editForm.device_brand_id,
      name: editForm.name,
    })

    await fetchDeviceModels()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update device model')
  } finally {
    isSubmit.value = false
  }
}

// ---- Delete ----
const deleteModel = async (id: number) => {
  if (!confirm('Are you sure you want to delete this device model?')) return

  try {
    await $api.delete(`/api/device-models/${id}`)
    await fetchDeviceModels()
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete device model')
  }
}

// ---- Sort ----
const toggleSort = (column: string) => {
  if (table.sortBy === column) {
    table.sortDir = table.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    table.sortBy = column
    table.sortDir = 'asc'
  }
  table.page = 1
}

// ---- Watch table state ----
watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir, table.brandFilter],
  () => {
    fetchDeviceModels()
  }
)

onMounted(async () => {
  await fetchBrands()
  await fetchDeviceModels()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Device Models</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Device Models</li>
      </ul>
    </div>

    <!-- Create form card -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">
            <!-- Brand -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Brand <span class="text-danger-600">*</span>
              </label>
              <select
                v-model="createForm.device_brand_id"
                class="form-select radius-8"
                required
              >
                <option :value="null" disabled>Select brand</option>
                <option
                  v-for="b in brands"
                  :key="b.id"
                  :value="b.id"
                >
                  {{ b.name }}
                </option>
              </select>
            </div>

            <!-- Model Name -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Model Name <span class="text-danger-600">*</span>
              </label>
              <input
                type="text"
                v-model="createForm.name"
                class="form-control radius-8"
                placeholder="e.g. Galaxy S24"
                required
              />
            </div>

            <!-- (Reserved third cell for future fields) -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <!-- empty for now or add notes/description later -->
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
                ></span>
                Save Model
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

          <!-- Filter by brand -->
          <div class="d-flex align-items-center gap-2">
            <span>Brand</span>
            <select
              v-model="table.brandFilter"
              class="form-select form-select-sm w-auto"
            >
              <option :value="null">All</option>
              <option
                v-for="b in brands"
                :key="b.id"
                :value="b.id"
              >
                {{ b.name }}
              </option>
            </select>
          </div>

          <!-- Search -->
          <div class="icon-field">
            <input
              type="text"
              class="form-control form-control-sm w-auto"
              placeholder="Search model or brand"
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

              <th scope="col" @click="toggleSort('device_brand_id')" style="cursor:pointer">
                Brand
                <iconify-icon
                  v-if="table.sortBy === 'device_brand_id' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'device_brand_id' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col" @click="toggleSort('name')" style="cursor:pointer">
                Model
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, index) in models" :key="row.id">
              <td>{{ index + 1 }}</td>
              <td>
                {{ row.brand?.name || brandNameById.get(row.device_brand_id) || '—' }}
              </td>
              <td>{{ row.name }}</td>
              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="openEditModal(row)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteModel(row.id)"
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
            <h6 class="fw-semibold mb-0">Edit Device Model</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="closeEditModal"
            >
              ✕
            </button>
          </div>

          <form @submit="handleUpdate">
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Brand <span class="text-danger">*</span></label>
              <select
                v-model="editForm.device_brand_id"
                class="form-select radius-8"
                required
              >
                <option :value="null" disabled>Select brand</option>
                <option
                  v-for="b in brands"
                  :key="b.id"
                  :value="b.id"
                >
                  {{ b.name }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Model Name <span class="text-danger">*</span></label>
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
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
