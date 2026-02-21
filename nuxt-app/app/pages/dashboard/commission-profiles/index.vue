<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,// adjust to your permission key
})

const { $api } = useNuxtApp() as any

// ---- Types ----
interface OrganizationOption {
  id: number
  name: string
}

interface ShareForm {
  id?: number | null
  label: string
  percentage: number | null
  organization_id: number | null
}

interface ProfileForm {
  id?: number | null
  name: string
  description: string
  is_active: boolean
  shares: ShareForm[]
}

interface CommissionProfileRow {
  id: number
  name: string
  description: string | null
  is_active: boolean
  shares_count?: number
  shares_sum_percentage?: string | number
  created_at?: string
  updated_at?: string
}

// ---- State ----
const organizations = ref<OrganizationOption[]>([])
const profiles = ref<CommissionProfileRow[]>([])

const defaultCreateShares: ShareForm[] = [
  { label: '', percentage: 30, organization_id: null },
  { label: 'Siraj Education Endowment Foundation', percentage: 50, organization_id: 2 },
  { label: 'Mithqal', percentage: 18, organization_id: 1 },
  { label: 'Bank Dhofar SAOG', percentage: 2, organization_id: 7 },
  
]

const createForm = reactive<ProfileForm>({
  name: '',
  description: '',
  is_active: true,
  shares: [...defaultCreateShares],
})

const editForm = reactive<ProfileForm>({
  id: undefined,
  name: '',
  description: '',
  is_active: true,
  shares: [],
})

const isLoading = ref(false)
const isSubmit = ref(false)
const isToggle = ref(false) // edit modal

const table = reactive({
  page: 1,
  perPage: 10,
  search: '',
  sortBy: 'id',
  sortDir: 'desc' as 'asc' | 'desc',
  activeFilter: 'all' as 'all' | 'active' | 'inactive',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

// ---- Computed sums ----
const createTotalPercentage = computed(() =>
  createForm.shares.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0)
)

const editTotalPercentage = computed(() =>
  editForm.shares.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0)
)

// ---- Helpers to manage shares ----
const addCreateShareRow = () => {
  createForm.shares.push({
    label: '',
    percentage: null,
    organization_id: null,
  })
}

const removeCreateShareRow = (index: number) => {
  createForm.shares.splice(index, 1)
}

const addEditShareRow = () => {
  editForm.shares.push({
    label: '',
    percentage: null,
    organization_id: null,
  })
}

const removeEditShareRow = (index: number) => {
  editForm.shares.splice(index, 1)
}

const resetCreateForm = () => {
  createForm.name = ''
  createForm.description = ''
  createForm.is_active = true
  createForm.shares = [...defaultCreateShares]
}

// ---- API calls ----
const fetchOrganizations = async () => {
  try {
    const { data } = await $api.get('/api/organizations', {
      params: {
        page: 1,
        per_page: 9999,
        sortBy: 'name',
        sortDir: 'asc',
      },
    })

    organizations.value = (data.data || []).map((org: any) => ({
      id: org.id,
      name: org.name,
    }))
  } catch (error) {
    console.error('Error fetching organizations:', error)
  }
}

const fetchProfiles = async () => {
  isLoading.value = true
  try {
    let isActiveParam: number | undefined

    if (table.activeFilter === 'active') {
      isActiveParam = 1
    } else if (table.activeFilter === 'inactive') {
      isActiveParam = 0
    }

    const { data } = await $api.get('/api/commission-profiles', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
        is_active: isActiveParam,
      },
    })

    profiles.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching commission profiles:', error)
  } finally {
    isLoading.value = false
  }
}

// ---- Create ----
const handleCreate = async (e: Event) => {
  e.preventDefault()

  if (!createForm.name) {
    alert('Profile name is required')
    return
  }
  if (!createForm.shares.length) {
    alert('At least one share is required')
    return
  }

  // basic client-side check: no empty labels, percentages, or missing organization
  for (const s of createForm.shares) {
    const labelTrimmed = typeof s.label === 'string' ? s.label.trim() : ''
    if (!labelTrimmed || s.percentage === null || Number.isNaN(Number(s.percentage))) {
      alert('Each share must have a non-empty label and a percentage')
      return
    }
    if (s.organization_id === null || s.organization_id === undefined) {
      alert('Each share must have an organization selected')
      return
    }
  }

  isSubmit.value = true

  try {
    await $api.post('/api/commission-profiles', {
      name: createForm.name,
      description: createForm.description || null,
      is_active: createForm.is_active,
      shares: createForm.shares.map((s, index) => ({
        label: s.label,
        percentage: s.percentage,
        organization_id: s.organization_id,
        sort_order: index + 1, // backend ignores this but ok to send
      })),
    })

    resetCreateForm()
    table.page = 1
    await fetchProfiles()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to create commission profile')
  } finally {
    isSubmit.value = false
  }
}

// ---- Edit ----
const openEditModal = async (id: number) => {
  try {
    const { data } = await $api.get(`/api/commission-profiles/${id}`)

    editForm.id = data.id
    editForm.name = data.name
    editForm.description = data.description || ''
    editForm.is_active = !!data.is_active
    editForm.shares = (data.shares || []).map((s: any) => ({
      id: s.id,
      label: s.label,
      percentage: Number(s.percentage),
      organization_id: s.organization_id,
    }))

    if (!editForm.shares.length) {
      addEditShareRow()
    }

    isToggle.value = true
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to load commission profile')
  }
}

const closeEditModal = () => {
  isToggle.value = false
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()

  if (!editForm.id) {
    alert('Missing profile id')
    return
  }
  if (!editForm.name) {
    alert('Profile name is required')
    return
  }
  if (!editForm.shares.length) {
    alert('At least one share is required')
    return
  }

  for (const s of editForm.shares) {
    const labelTrimmed = typeof s.label === 'string' ? s.label.trim() : ''
    if (!labelTrimmed || s.percentage === null || Number.isNaN(Number(s.percentage))) {
      alert('Each share must have a non-empty label and a percentage')
      return
    }
    if (s.organization_id === null || s.organization_id === undefined) {
      alert('Each share must have an organization selected')
      return
    }
  }

  isSubmit.value = true

  try {
    await $api.put(`/api/commission-profiles/${editForm.id}`, {
      name: editForm.name,
      description: editForm.description || null,
      is_active: editForm.is_active,
      shares: editForm.shares.map((s, index) => ({
        label: s.label,
        percentage: s.percentage,
        organization_id: s.organization_id,
        sort_order: index + 1,
      })),
    })

    await fetchProfiles()
    isToggle.value = false
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to update commission profile')
  } finally {
    isSubmit.value = false
  }
}

// ---- Delete ----
const deleteProfile = async (id: number) => {
  if (!confirm('Are you sure you want to delete this commission profile?')) return

  try {
    await $api.delete(`/api/commission-profiles/${id}`)
    await fetchProfiles()
  } catch (error: any) {
    console.error(error?.response || error)
    alert('Failed to delete commission profile')
  }
}

// ---- Sorting ----
const toggleSort = (column: string) => {
  if (table.sortBy === column) {
    table.sortDir = table.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    table.sortBy = column
    table.sortDir = 'asc'
  }
  table.page = 1
}

// ---- Watch table controls ----
watch(
  () => [
    table.page,
    table.perPage,
    table.search,
    table.sortBy,
    table.sortDir,
    table.activeFilter,
  ],
  () => {
    fetchProfiles()
  }
)

onMounted(async () => {
  await fetchOrganizations()
  resetCreateForm()
  await fetchProfiles()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Commission Profiles</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Commission Profiles</li>
      </ul>
    </div>

    <!-- Create Profile + Shares -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">
            <!-- Profile Name -->
            <div class="col-lg-4 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Profile Name <span class="text-danger-600">*</span>
              </label>
              <input
                type="text"
                v-model="createForm.name"
                class="form-control radius-8"
                placeholder="e.g. Masjid Box Split 40/30/30"
                required
              />
            </div>

            <!-- Description -->
            <div class="col-lg-6 col-md-6 col-sm-12 mb-20">
              <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                Description
              </label>
              <input
                type="text"
                v-model="createForm.description"
                class="form-control radius-8"
                placeholder="Short description"
              />
            </div>

            <!-- Active toggle -->
            <div class="col-lg-2 col-md-6 col-sm-12 mb-20 d-flex align-items-center">
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

            <!-- Shares section -->
            <div class="col-12 mb-12">
              <hr />
              <div class="d-flex align-items-center justify-content-between mb-3">
                <h6 class="fw-semibold mb-0">Commission Profile Shares</h6>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="addCreateShareRow"
                >
                  + Add Share
                </button>
              </div>
              <p class="text-sm text-muted mb-2">
                Define how the commission is split (label, percentage, and optional organization).
              </p>
              <p class="text-sm mb-3">
                Total Percentage:
                <span
                  :class="createTotalPercentage === 100 ? 'text-success' : 'text-danger'"
                >
                  {{ createTotalPercentage.toFixed(3) }}%
                </span>
              </p>
            </div>

            <!-- Share rows -->
            <div
              class="col-12 mb-2"
              v-for="(share, index) in createForm.shares"
              :key="index"
            >
              <div class="row align-items-end gy-2">
                <div class="col-lg-4 col-md-6 col-sm-12">
                  <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                    Label <span class="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    v-model="share.label"
                    class="form-control radius-8"
                    placeholder="e.g. Masjid"
                    required
                  />
                </div>

                <div class="col-lg-3 col-md-4 col-sm-12">
                  <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                    Percentage <span class="text-danger-600">*</span>
                  </label>
                  <div class="input-group">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      v-model.number="share.percentage"
                      class="form-control radius-8"
                      placeholder="e.g. 40"
                      required
                    />
                    <span class="input-group-text">%</span>
                  </div>
                </div>

                <div class="col-lg-4 col-md-6 col-sm-12">
                  <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                    Organization
                  </label>
                  <select
                    v-model="share.organization_id"
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

                <div class="col-lg-1 col-md-2 col-sm-12 d-flex justify-content-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger mt-3"
                    @click="removeCreateShareRow(index)"
                    v-if="createForm.shares.length > 1"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <hr class="mt-3" v-if="index < createForm.shares.length - 1" />
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
                Save Commission Profile
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Table of profiles -->
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <!-- Per Page -->
          <div class="d-flex align-items-center gap-2">
            <span>Show</span>
            <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>

          <!-- Status Filter -->
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
              placeholder="Search name / description"
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
                Profile Name
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col">Description</th>

              <th scope="col">
                Shares Count
              </th>

              <th scope="col">
                Total %
              </th>

              <th scope="col" @click="toggleSort('is_active')" style="cursor:pointer">
                Status
                <iconify-icon
                  v-if="table.sortBy === 'is_active' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'is_active' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, index) in profiles" :key="row.id">
              <td>{{ index + 1 }}</td>
              <td>{{ row.name }}</td>
              <td>
                <span v-if="row.description">{{ row.description }}</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>
                {{ row.shares_count ?? 0 }}
              </td>
              <td>
                <span
                  :class="Number(row.shares_sum_percentage || 0) === 100 ? 'text-success' : 'text-danger'"
                >
                  {{ Number(row.shares_sum_percentage || 0).toFixed(3) }}%
                </span>
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
                  @click.prevent="openEditModal(row.id)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteProfile(row.id)"
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
            <h6 class="fw-semibold mb-0">Edit Commission Profile</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="closeEditModal"
            >
              ✕
            </button>
          </div>

          <form @submit="handleUpdate">
            <!-- Profile Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Profile Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.name"
                required
              />
            </div>

            <!-- Description -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Description
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editForm.description"
              />
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

            <!-- Shares -->
            <hr />
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="fw-semibold mb-0">Commission Profile Shares</h6>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                @click="addEditShareRow"
              >
                + Add Share
              </button>
            </div>
            <p class="text-sm mb-3">
              Total Percentage:
              <span
                :class="editTotalPercentage === 100 ? 'text-success' : 'text-danger'"
              >
                {{ editTotalPercentage.toFixed(3) }}%
              </span>
            </p>

            <div
              class="mb-2"
              v-for="(share, index) in editForm.shares"
              :key="index"
            >
              <div class="row gy-2 align-items-end">
                <div class="col-md-4">
                  <label class="form-label fw-semibold text-sm mb-8">
                    Label <span class="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    class="form-control radius-8"
                    v-model="share.label"
                    required
                  />
                </div>
                <div class="col-md-3">
                  <label class="form-label fw-semibold text-sm mb-8">
                    Percentage <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      class="form-control radius-8"
                      v-model.number="share.percentage"
                      required
                    />
                    <span class="input-group-text">%</span>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold text-sm mb-8">
                    Organization
                  </label>
                  <select
                    v-model="share.organization_id"
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
                <div class="col-md-1 d-flex justify-content-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger mt-3"
                    @click="removeEditShareRow(index)"
                    v-if="editForm.shares.length > 1"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <hr class="mt-3" v-if="index < editForm.shares.length - 1" />
            </div>

            <div class="d-flex align-items-center justify-content-end gap-2 mt-3">
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
  width: min(720px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .18);
  padding: 20px;
}
</style>
