<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,// adjust to your permission key
})

const { $api } = useNuxtApp() as any

interface DeviceBrand {
  id: number
  name: string
  slug: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface CreateForm {
  name: string
  slug: string
  notes: string
}

interface EditForm {
  id: number | null
  name: string
  slug: string
  notes: string
}

// ---- State ----
const brands = ref<DeviceBrand[]>([])

const createForm = reactive<CreateForm>({
  name: '',
  slug: '',
  notes: '',
})

const editForm = reactive<EditForm>({
  id: null,
  name: '',
  slug: '',
  notes: '',
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

// ---- API ----
const fetchDeviceBrands = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/device-brands', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    brands.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching device brands:', error)
  } finally {
    isLoading.value = false
  }
}

const resetCreateForm = () => {
  createForm.name = ''
  createForm.slug = ''
  createForm.notes = ''
}

// ---- Create ----
const handleCreate = async (e: Event) => {
  e.preventDefault()

  if (!createForm.name) {
    alert('Brand name is required')
    return
  }

  isSubmit.value = true

  try {
    await $api.post('/api/device-brands', {
      name: createForm.name,
      slug: createForm.slug || null, // backend will generate if null
      notes: createForm.notes || null,
    })

    resetCreateForm()
    table.page = 1
    await fetchDeviceBrands()
  } catch (error: any) {
    console.error(error)
    alert('Failed to create device brand')
  } finally {
    isSubmit.value = false
  }
}

// ---- Edit / Update ----
const openEditModal = (brand: DeviceBrand) => {
  isToggle.value = true

  editForm.id = brand.id
  editForm.name = brand.name
  editForm.slug = brand.slug || ''
  editForm.notes = brand.notes || ''
}

const closeEditModal = () => {
  isToggle.value = false
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()

  if (!editForm.id || !editForm.name) {
    alert('Missing required fields')
    return
  }

  isSubmit.value = true

  try {
    await $api.put(`/api/device-brands/${editForm.id}`, {
      name: editForm.name,
      slug: editForm.slug || null,
      notes: editForm.notes || null,
    })

    await fetchDeviceBrands()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update device brand')
  } finally {
    isSubmit.value = false
  }
}

// ---- Delete ----
const deleteBrand = async (id: number) => {
  if (!confirm('Are you sure you want to delete this device brand?')) return

  try {
    await $api.delete(`/api/device-brands/${id}`)
    await fetchDeviceBrands()
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete device brand')
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

watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  () => {
    fetchDeviceBrands()
  }
)

onMounted(async () => {
  await fetchDeviceBrands()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Device Brands</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Device Brands</li>
      </ul>
    </div>

    <!-- Create form card -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">
            <!-- Name -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Brand Name <span class="text-danger-600">*</span>
              </label>
              <input
                type="text"
                v-model="createForm.name"
                class="form-control radius-8"
                placeholder="e.g. Samsung"
                required
              />
            </div>

            <!-- Slug -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Slug
              </label>
              <input
                type="text"
                v-model="createForm.slug"
                class="form-control radius-8"
                placeholder="e.g. samsung (leave empty to auto-generate)"
              />
            </div>

            <!-- Notes -->
            <div class="col-lg-4 col-md-12 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Notes
              </label>
              <textarea
                v-model="createForm.notes"
                class="form-control radius-8"
                rows="1"
                placeholder="Optional notes"
              ></textarea>
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
                Save Brand
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
                Brand
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>
              <th scope="col" @click="toggleSort('slug')" style="cursor:pointer">
                Slug
                <iconify-icon
                  v-if="table.sortBy === 'slug' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'slug' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>
              <th scope="col">Notes</th>
              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(brand, index) in brands" :key="brand.id">
              <td>{{ index + 1 }}</td>
              <td>{{ brand.name }}</td>
              <td>{{ brand.slug || '—' }}</td>
              <td>
                <span class="text-truncate d-inline-block" style="max-width: 220px;">
                  {{ brand.notes || '—' }}
                </span>
              </td>
              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="openEditModal(brand)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteBrand(brand.id)"
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
            <h6 class="fw-semibold mb-0">Edit Device Brand</h6>
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
              <label class="form-label fw-semibold text-sm">Brand Name <span class="text-danger">*</span></label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.name"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Slug</label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.slug"
                placeholder="Leave empty to re-generate from name"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Notes</label>
              <textarea
                class="form-control radius-8"
                rows="3"
                v-model="editForm.notes"
              ></textarea>
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
