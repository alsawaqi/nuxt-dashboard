<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,// adjust to your permission key
})

const { $api } = useNuxtApp() as any

// ---- Types ----
interface CountryOption {
  id: number
  name: string
}

interface BankRow {
  id: number
  name: string
  short_name: string | null
  country_id: number | null
  swift_code: string | null
  iban_example: string | null
  branch_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  is_active: boolean
  notes: string | null
  country?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

interface BankFormBase {
  country_id: number | null
  name: string
  short_name: string
  swift_code: string
  iban_example: string
  branch_name: string
  phone: string
  email: string
  website: string
  is_active: boolean
  notes: string
}

interface BankCreateForm extends BankFormBase {}

interface BankEditForm extends BankFormBase {
  id: number | null
}

// ---- State ----
const countries = ref<CountryOption[]>([])
const banks = ref<BankRow[]>([])

const createForm = reactive<BankCreateForm>({
  country_id: null,
  name: '',
  short_name: '',
  swift_code: '',
  iban_example: '',
  branch_name: '',
  phone: '',
  email: '',
  website: '',
  is_active: true,
  notes: '',
})

const editForm = reactive<BankEditForm>({
  id: null,
  country_id: null,
  name: '',
  short_name: '',
  swift_code: '',
  iban_example: '',
  branch_name: '',
  phone: '',
  email: '',
  website: '',
  is_active: true,
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
  countryFilter: null as number | null,
  activeFilter: 'all' as 'all' | 'active' | 'inactive',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

const countryNameById = computed(() => {
  const map = new Map<number, string>()
  countries.value.forEach((c) => map.set(c.id, c.name))
  return map
})

// ---- API helpers ----
const fetchCountries = async () => {
  try {
    const { data } = await $api.get('/api/countries', {
      params: {
        page: 1,
        per_page: 9999,
        sortBy: 'name',
        sortDir: 'asc',
      },
    })

    countries.value = (data.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
    }))
  } catch (error) {
    console.error('Error fetching countries:', error)
  }
}

const fetchBanks = async () => {
  isLoading.value = true
  try {
    let isActiveParam: number | undefined

    if (table.activeFilter === 'active') {
      isActiveParam = 1
    } else if (table.activeFilter === 'inactive') {
      isActiveParam = 0
    } else {
      isActiveParam = undefined
    }

    const { data } = await $api.get('/api/banks', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
        country_id: table.countryFilter || undefined,
        is_active: isActiveParam,
      },
    })

    banks.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching banks:', error)
  } finally {
    isLoading.value = false
  }
}

const resetCreateForm = () => {
  createForm.country_id = null
  createForm.name = ''
  createForm.short_name = ''
  createForm.swift_code = ''
  createForm.iban_example = ''
  createForm.branch_name = ''
  createForm.phone = ''
  createForm.email = ''
  createForm.website = ''
  createForm.is_active = true
  createForm.notes = ''
}

// ---- Create ----
const handleCreate = async (e: Event) => {
  e.preventDefault()

  if (!createForm.name) {
    alert('Bank name is required')
    return
  }

  isSubmit.value = true

  try {
    await $api.post('/api/banks', {
      name: createForm.name,
      short_name: createForm.short_name || null,
      country_id: createForm.country_id,
      swift_code: createForm.swift_code || null,
      iban_example: createForm.iban_example || null,
      branch_name: createForm.branch_name || null,
      phone: createForm.phone || null,
      email: createForm.email || null,
      website: createForm.website || null,
      is_active: createForm.is_active,
      notes: createForm.notes || null,
    })

    resetCreateForm()
    table.page = 1
    await fetchBanks()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to create bank')
  } finally {
    isSubmit.value = false
  }
}

// ---- Edit / Update ----
const openEditModal = (row: BankRow) => {
  isToggle.value = true

  editForm.id = row.id
  editForm.country_id = row.country_id
  editForm.name = row.name
  editForm.short_name = row.short_name || ''
  editForm.swift_code = row.swift_code || ''
  editForm.iban_example = row.iban_example || ''
  editForm.branch_name = row.branch_name || ''
  editForm.phone = row.phone || ''
  editForm.email = row.email || ''
  editForm.website = row.website || ''
  editForm.is_active = !!row.is_active
  editForm.notes = row.notes || ''
}

const closeEditModal = () => {
  isToggle.value = false
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()

  if (!editForm.id) {
    alert('Missing bank id')
    return
  }
  if (!editForm.name) {
    alert('Bank name is required')
    return
  }

  isSubmit.value = true

  try {
    await $api.put(`/api/banks/${editForm.id}`, {
      name: editForm.name,
      short_name: editForm.short_name || null,
      country_id: editForm.country_id,
      swift_code: editForm.swift_code || null,
      iban_example: editForm.iban_example || null,
      branch_name: editForm.branch_name || null,
      phone: editForm.phone || null,
      email: editForm.email || null,
      website: editForm.website || null,
      is_active: editForm.is_active,
      notes: editForm.notes || null,
    })

    await fetchBanks()
    isToggle.value = false
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to update bank')
  } finally {
    isSubmit.value = false
  }
}

// ---- Delete ----
const deleteBank = async (id: number) => {
  if (!confirm('Are you sure you want to delete this bank?')) return

  try {
    await $api.delete(`/api/banks/${id}`)
    await fetchBanks()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to delete bank')
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
  () => [
    table.page,
    table.perPage,
    table.search,
    table.sortBy,
    table.sortDir,
    table.countryFilter,
    table.activeFilter,
  ],
  () => {
    fetchBanks()
  }
)

onMounted(async () => {
  await fetchCountries()
  await fetchBanks()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Banks</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Banks</li>
      </ul>
    </div>

    <!-- Create form card -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">
            <!-- Country -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Country
              </label>
              <select
                v-model="createForm.country_id"
                class="form-select radius-8"
              >
                <option :value="null">No country</option>
                <option
                  v-for="c in countries"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </div>

            <!-- Bank Name -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Bank Name <span class="text-danger-600">*</span>
              </label>
              <input
                type="text"
                v-model="createForm.name"
                class="form-control radius-8"
                placeholder="e.g. Bank Muscat"
                required
              />
            </div>

            <!-- Short Name -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Short Name
              </label>
              <input
                type="text"
                v-model="createForm.short_name"
                class="form-control radius-8"
                placeholder="e.g. BMUSCAT"
              />
            </div>

            <!-- SWIFT Code -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                SWIFT Code
              </label>
              <input
                type="text"
                v-model="createForm.swift_code"
                class="form-control radius-8"
                placeholder="e.g. BMUSOMRX"
              />
            </div>

            <!-- IBAN Example -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                IBAN Example
              </label>
              <input
                type="text"
                v-model="createForm.iban_example"
                class="form-control radius-8"
                placeholder="Sample IBAN"
              />
            </div>

            <!-- Branch Name -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Branch Name
              </label>
              <input
                type="text"
                v-model="createForm.branch_name"
                class="form-control radius-8"
                placeholder="Main Branch"
              />
            </div>

            <!-- Phone -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Phone
              </label>
              <input
                type="text"
                v-model="createForm.phone"
                class="form-control radius-8"
                placeholder="Phone number"
              />
            </div>

            <!-- Email -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Email
              </label>
              <input
                type="email"
                v-model="createForm.email"
                class="form-control radius-8"
                placeholder="Email address"
              />
            </div>

            <!-- Website -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Website
              </label>
              <input
                type="text"
                v-model="createForm.website"
                class="form-control radius-8"
                placeholder="https://example.com"
              />
            </div>

            <!-- Notes -->
            <div class="col-lg-8 col-md-12 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Notes
              </label>
              <textarea
                v-model="createForm.notes"
                class="form-control radius-8"
                rows="2"
                placeholder="Any additional notes about this bank"
              ></textarea>
            </div>

            <!-- Active toggle -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20 d-flex align-items-center">
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="isActiveCreate"
                  v-model="createForm.is_active"
                />
                <label class="form-check-label ms-2" for="isActiveCreate">
                  Active
                </label>
              </div>
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
                Save Bank
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
          <!-- Per page -->
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>

          <!-- Country Filter -->
          <div class="d-flex align-items-center gap-2">
            <span>Country</span>
            <select
              v-model="table.countryFilter"
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

          <!-- Active Filter -->
          <div class="d-flex align-items-center gap-2">
            <span>Status</span>
            <select
              v-model="table.activeFilter"
              class="form-select form-select-sm w-auto"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <!-- Search -->
          <div class="icon-field">
            <input
              type="text"
              class="form-control form-control-sm w-auto"
              placeholder="Search bank / short / SWIFT / branch"
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
                Bank Name
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col" @click="toggleSort('country_id')" style="cursor:pointer">
                Country
                <iconify-icon
                  v-if="table.sortBy === 'country_id' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'country_id' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col" @click="toggleSort('swift_code')" style="cursor:pointer">
                SWIFT
                <iconify-icon
                  v-if="table.sortBy === 'swift_code' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'swift_code' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, index) in banks" :key="row.id">
              <td>{{ index + 1 }}</td>
              <td>
                <div class="d-flex flex-column">
                  <span class="fw-semibold">{{ row.name }}</span>
                  <small class="text-muted" v-if="row.short_name">
                    {{ row.short_name }}
                  </small>
                </div>
              </td>
              <td>
                {{ row.country?.name || (row.country_id ? countryNameById.get(row.country_id) : '—') }}
              </td>
              <td>
                {{ row.swift_code || '—' }}
              </td>
              <td>
                <span
                  class="badge"
                  :class="row.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'"
                >
                  {{ row.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
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
                  @click.prevent="deleteBank(row.id)"
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
            <h6 class="fw-semibold mb-0">Edit Bank</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="closeEditModal"
            >
              ✕
            </button>
          </div>

          <form @submit="handleUpdate">
            <!-- Country -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Country
              </label>
              <select
                v-model="editForm.country_id"
                class="form-select radius-8"
              >
                <option :value="null">No country</option>
                <option
                  v-for="c in countries"
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
                Bank Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.name"
                required
              />
            </div>

            <!-- Short Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Short Name
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.short_name"
              />
            </div>

            <!-- SWIFT / IBAN / Branch -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                SWIFT Code
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.swift_code"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                IBAN Example
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.iban_example"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Branch Name
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.branch_name"
              />
            </div>

            <!-- Phone / Email / Website -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Phone
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.phone"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Email
              </label>
              <input
                type="email"
                class="form-control radius-8"
                v-model="editForm.email"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Website
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.website"
              />
            </div>

            <!-- Notes -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Notes
              </label>
              <textarea
                class="form-control radius-8"
                rows="2"
                v-model="editForm.notes"
              ></textarea>
            </div>

            <!-- Active -->
            <div class="mb-3 form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                id="isActiveEdit"
                v-model="editForm.is_active"
              />
              <label class="form-check-label" for="isActiveEdit">
                Active
              </label>
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
