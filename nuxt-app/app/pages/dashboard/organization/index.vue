<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,// adjust to your permission key
})

const { $api } = useNuxtApp() as any

// ---- Types ----
interface Organization {
  id: number
  name: string
  parent_id: number | null
  is_active: boolean
  parent?: { id: number; name: string } | null
  primary_user?: { id: number; name: string; email: string } | null
}

interface Organization {
  id: number
  name: string
  parent_id: number | null
  is_active: boolean
  parent?: { id: number; name: string } | null
  primary_user?: { id: number; name: string; email: string } | null
}


interface NewOrganizationForm {
  parent_id: number | null
  name: string
  is_active: boolean
  create_user: boolean
  user_name: string
  user_email: string
  user_password: string
  user_password_confirmation: string
}

interface EditOrganizationForm {
  id: number | null
  parent_id: number | null
  name: string
  is_active: boolean

  // login edit fields
  has_primary_user: boolean
  edit_login: boolean
  user_name: string
  user_email: string
  user_password: string
  user_password_confirmation: string
}

interface OrgOption { id: number; name: string }

// ---- State ----
const organizations = ref<Organization[]>([])
  const orgOptions = ref<OrgOption[]>([])

const newOrg = reactive<NewOrganizationForm>({
  parent_id: null,
  name: '',
  is_active: true,
  create_user: false,
  user_name: '',
  user_email: '',
  user_password: '',
  user_password_confirmation: '',
})

const editOrg = reactive<EditOrganizationForm>({
  id: null,
  parent_id: null,
  name: '',
  is_active: true,

  has_primary_user: false,
  edit_login: false,
  user_name: '',
  user_email: '',
  user_password: '',
  user_password_confirmation: '',
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

const fetchOrgOptions = async () => {
  try {
    const { data } = await $api.get('/api/organizations/list')
    orgOptions.value = data
  } catch (error) {
    console.error('Error fetching org options:', error)
  }
}

const fetchOrganizations = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/organizations', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    organizations.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }

    console.log(organizations.value)
  } catch (error) {
    console.error('Error fetching organizations:', error)
  } finally {
    isLoading.value = false
  }
}

// ---- Create ----
const handleCreate = async (e: Event) => {
  e.preventDefault()
  isSubmit.value = true

  try {
    const payload: any = {
      name: newOrg.name,
      parent_id: newOrg.parent_id,
      is_active: newOrg.is_active ? 1 : 0,
    }

    if (newOrg.create_user) {
      payload.create_user = true
      payload.user_name = newOrg.user_name
      payload.user_email = newOrg.user_email
      payload.user_password = newOrg.user_password
      payload.user_password_confirmation = newOrg.user_password_confirmation
    }

    await $api.post('/api/organizations', payload)

    // Reset form
    newOrg.parent_id = null
    newOrg.name = ''
    newOrg.is_active = true
    newOrg.create_user = false
    newOrg.user_name = ''
    newOrg.user_email = ''
    newOrg.user_password = ''
    newOrg.user_password_confirmation = ''

    table.page = 1
    await Promise.all([fetchOrganizations(), fetchOrgOptions()])
  } catch (error: any) {
    console.error(error)
    alert('Failed to create organization')
  } finally {
    isSubmit.value = false
  }
}

// ---- Edit / Update ----
const openEditModal = (org: Organization) => {
  isToggle.value = true
  editOrg.id = org.id
  editOrg.name = org.name
  editOrg.parent_id = org.parent_id
  editOrg.is_active = !!org.is_active

  // login info
  if (org.primary_user) {
  editOrg.has_primary_user = true
  editOrg.user_name = org.primary_user.name
  editOrg.user_email = org.primary_user.email
} else {
  editOrg.has_primary_user = false
  editOrg.user_name = ''
  editOrg.user_email = ''
}

  editOrg.edit_login = false
  editOrg.user_password = ''
  editOrg.user_password_confirmation = ''
}


const closeEditModal = () => {
  isToggle.value = false
  editOrg.edit_login = false
  editOrg.user_password = ''
  editOrg.user_password_confirmation = ''
}

const handleUpdate = async (e: Event) => {
  e.preventDefault()
  if (!editOrg.id) {
    alert('Missing organization id')
    return
  }

  isSubmit.value = true

  try {
    const payload: any = {
      name: editOrg.name,
      parent_id: editOrg.parent_id,
      is_active: editOrg.is_active ? 1 : 0,
    }

    if (editOrg.has_primary_user && editOrg.edit_login) {
      payload.user_name = editOrg.user_name
      payload.user_email = editOrg.user_email

      if (editOrg.user_password) {
        payload.user_password = editOrg.user_password
        payload.user_password_confirmation = editOrg.user_password_confirmation
      }
    }

    await $api.put(`/api/organizations/${editOrg.id}`, payload)

    await fetchOrganizations()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update organization')
  } finally {
    isSubmit.value = false
  }
}


// ---- Delete ----
const deleteOrganization = async (id: number) => {
  if (!confirm('Are you sure you want to delete this organization?')) return

  try {
    await $api.delete(`/api/organizations/${id}`)
    await Promise.all([fetchOrganizations(), fetchOrgOptions()])
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete organization')
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
    fetchOrganizations()
  }
)

onMounted(async () => {
  await Promise.all([fetchOrganizations(), fetchOrgOptions()])
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header / breadcrumb -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Organizations</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Organizations</li>
      </ul>
    </div>

    <!-- Create form card -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="handleCreate">
          <div class="row">
            <div class="col-sm-12">
              <!-- Parent organization -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Parent Organization
                </label>
                <select
                  v-model="newOrg.parent_id"
                  class="form-select radius-8"
                >
                  <option :value="null">No parent (root)</option>
                  <option
                    v-for="opt in orgOptions"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name }}
                  </option>
                </select>
                <small class="text-muted">
                  Leave as "No parent" to create a top-level organization.
                </small>
              </div>

              <!-- Name -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Organization Name <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="newOrg.name"
                  class="form-control radius-8"
                  placeholder="Enter organization name"
                  required
                />
              </div>

              <!-- Active -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Status
                </label>
                <div class="form-check form-switch">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="isActiveSwitch"
                    v-model="newOrg.is_active"
                  />
                  <label class="form-check-label" for="isActiveSwitch">
                    Active
                  </label>
                </div>
              </div>

              <!-- Organizer login block -->
              <div class="mb-20 border-top pt-3 mt-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <h6 class="fw-semibold mb-0">Organizer Login</h6>
                  <div class="form-check form-switch">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id="createUserSwitch"
                      v-model="newOrg.create_user"
                    />
                    <label class="form-check-label" for="createUserSwitch">
                      Create login for this organization
                    </label>
                  </div>
                </div>

                <div v-if="newOrg.create_user" class="row">
                  <div class="col-md-4 mb-20">
                    <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                      Name <span class="text-danger-600">*</span>
                    </label>
                    <input
                      type="text"
                      v-model="newOrg.user_name"
                      class="form-control radius-8"
                      placeholder="Organizer full name"
                      :required="newOrg.create_user"
                    />
                  </div>

                  <div class="col-md-4 mb-20">
                    <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                      Email (Login) <span class="text-danger-600">*</span>
                    </label>
                    <input
                      type="email"
                      v-model="newOrg.user_email"
                      class="form-control radius-8"
                      placeholder="Organizer email"
                      :required="newOrg.create_user"
                    />
                  </div>

                  <div class="col-md-4 mb-20">
                    <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                      Password <span class="text-danger-600">*</span>
                    </label>
                    <input
                      type="password"
                      v-model="newOrg.user_password"
                      class="form-control radius-8"
                      placeholder="Password"
                      :required="newOrg.create_user"
                    />
                  </div>

                  <div class="col-md-4 mb-20">
                    <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                      Confirm Password <span class="text-danger-600">*</span>
                    </label>
                    <input
                      type="password"
                      v-model="newOrg.user_password_confirmation"
                      class="form-control radius-8"
                      placeholder="Confirm password"
                      :required="newOrg.create_user"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Buttons -->
            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  () => {
                    newOrg.parent_id = null
                    newOrg.name = ''
                    newOrg.is_active = true
                    newOrg.create_user = false
                    newOrg.user_name = ''
                    newOrg.user_email = ''
                    newOrg.user_password = ''
                    newOrg.user_password_confirmation = ''
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
                Save Organization
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
                Organization
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>
              <th scope="col">Parent</th>
              <th scope="col">Organizer Login</th>
              <th scope="col" @click="toggleSort('is_active')" style="cursor:pointer">
                Status
              </th>
              <th scope="col">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(org, index) in organizations" :key="org.id">
              <td>{{ index + 1 }}</td>
              <td>
                <h6 class="text-md mb-0 fw-medium">
                  {{ org.name }}
                </h6>
              </td>
              <td>
                {{ org.parent?.name ?? '—' }}
              </td>
              <td>
                <span v-if="org.primary_user">
  {{ org.primary_user.email }}
</span>
                <span v-else class="text-muted">
                  No login
                </span>
              </td>
              <td>
                <span
                  class="badge"
                  :class="org.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'"
                >
                  {{ org.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="openEditModal(org)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteOrganization(org.id)"
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
            <h6 class="fw-semibold mb-0">Edit Organization</h6>
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
              <label class="form-label fw-semibold text-sm">Parent Organization</label>
              <select
                v-model="editOrg.parent_id"
                class="form-select radius-8"
              >
                <option :value="null">No parent (root)</option>
                <option
                  v-for="opt in orgOptions"
                  :key="opt.id"
                  :value="opt.id"
                  :disabled="opt.id === editOrg.id"
                >
                  {{ opt.name }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                v-model="editOrg.name"
                required
              />
            </div>

            <div class="mb-3">
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="editIsActiveSwitch"
                  v-model="editOrg.is_active"
                />
                <label class="form-check-label" for="editIsActiveSwitch">
                  Active
                </label>
              </div>
            </div>

             <div
  v-if="editOrg.has_primary_user"
  class="mb-3 border-top pt-3 mt-3"
>
  <div class="d-flex align-items-center justify-content-between mb-2">
    <h6 class="fw-semibold mb-0">Organizer Login</h6>
    <div class="form-check form-switch">
      <input
        class="form-check-input"
        type="checkbox"
        id="editLoginSwitch"
        v-model="editOrg.edit_login"
      />
      <label class="form-check-label" for="editLoginSwitch">
        Edit login (email / password)
      </label>
    </div>
  </div>

  <div v-if="editOrg.edit_login" class="row">
    <div class="col-md-6 mb-3">
      <label class="form-label fw-semibold text-sm">
        Name
      </label>
      <input
        type="text"
        class="form-control radius-8"
        v-model="editOrg.user_name"
      />
    </div>

    <div class="col-md-6 mb-3">
      <label class="form-label fw-semibold text-sm">
        Email (Login)
      </label>
      <input
        type="email"
        class="form-control radius-8"
        v-model="editOrg.user_email"
      />
    </div>

    <div class="col-md-6 mb-3">
      <label class="form-label fw-semibold text-sm">
        New Password
      </label>
      <input
        type="password"
        class="form-control radius-8"
        v-model="editOrg.user_password"
        placeholder="Leave empty to keep current password"
      />
    </div>

    <div class="col-md-6 mb-3">
      <label class="form-label fw-semibold text-sm">
        Confirm New Password
      </label>
      <input
        type="password"
        class="form-control radius-8"
        v-model="editOrg.user_password_confirmation"
        :disabled="!editOrg.user_password"
      />
    </div>
  </div>
</div>

<p v-else class="text-muted small mb-3">
  This organization has no login yet. You can create a login from the Organizations
  create form or later from the Users module.
</p>

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
