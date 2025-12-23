<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp() as any

// ---------------- Types ----------------
interface Activity {
  id: number
  name: string
  is_active?: boolean
}

interface Company {
  id: number
  name: string
  email: string | null
  phone_number: string | null
  is_active: boolean
  activities?: Activity[]
  activities_count?: number
  created_at?: string
}

interface EditCompany {
  id: number | null
  name: string
  email: string | null
  phone_number: string | null
  is_active: boolean
  activities: Activity[] // for tags UI
}

// ---------------- State ----------------
const companies = ref<Company[]>([])

const newName = ref<string>('')
const newEmail = ref<string>('')
const newPhone = ref<string>('')
const newIsActive = ref<boolean>(true)
const newActivities = ref<Activity[]>([]) // selected tags

const isSubmit = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isToggle = ref<boolean>(false)

const editedCompany = reactive<EditCompany>({
  id: null,
  name: '',
  email: null,
  phone_number: null,
  is_active: true,
  activities: [],
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

// ---------------- Activity Search (Tags) ----------------
const activityQuery = ref<string>('')
const activitySuggestions = ref<Activity[]>([])
const activityLoading = ref<boolean>(false)
const activityDropdownOpen = ref<boolean>(false)

let activitySearchTimer: any = null

const fetchActivitySuggestions = async (q: string) => {
  activityLoading.value = true
  try {
    const { data } = await $api.get('/api/activities', {
      params: {
        page: 1,
        per_page: 20,
        q,         // your ActivityController uses q
        search: q, // extra safety if backend uses search
      },
    })
    activitySuggestions.value = data?.data ?? []
  } catch (err) {
    console.error('Error fetching activities:', err)
    activitySuggestions.value = []
  } finally {
    activityLoading.value = false
  }
}

watch(activityQuery, (val) => {
  clearTimeout(activitySearchTimer)
  const q = val.trim()
  if (!q) {
    activitySuggestions.value = []
    activityDropdownOpen.value = false
    return
  }
  activityDropdownOpen.value = true
  activitySearchTimer = setTimeout(() => fetchActivitySuggestions(q), 250)
})

const addActivityTag = (a: Activity, target: 'new' | 'edit') => {
  const list = target === 'new' ? newActivities.value : editedCompany.activities
  if (!list.find(x => x.id === a.id)) list.push(a)
  activityQuery.value = ''
  activityDropdownOpen.value = false
}

const removeActivityTag = (id: number, target: 'new' | 'edit') => {
  if (target === 'new') {
    newActivities.value = newActivities.value.filter(a => a.id !== id)
  } else {
    editedCompany.activities = editedCompany.activities.filter(a => a.id !== id)
  }
}

// ---------------- API Calls ----------------
const getCompanies = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/companies', {
      params: {
        page: table.page,
        per_page: table.perPage,
        q: table.search,       // CompanyController uses q
        search: table.search,  // extra safety
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    companies.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching companies:', error)
  } finally {
    isLoading.value = false
  }
}

const resetCreateForm = () => {
  newName.value = ''
  newEmail.value = ''
  newPhone.value = ''
  newIsActive.value = true
  newActivities.value = []
}

const createCompany = async (e: Event) => {
  e.preventDefault()
  isSubmit.value = true
  try {
    await $api.post('/api/companies', {
      name: newName.value.trim(),
      email: newEmail.value.trim() || null,
      phone_number: newPhone.value.trim() || null,
      is_active: newIsActive.value,
      activity_ids: newActivities.value.map(a => a.id), // ✅ sync pivot
    })

    resetCreateForm()
    table.page = 1
    await getCompanies()
  } catch (error: any) {
    console.error(error)
    alert('Failed to create company')
  } finally {
    isSubmit.value = false
  }
}

const updateCompany = async (e: Event) => {
  e.preventDefault()
  if (!editedCompany.id) return

  isSubmit.value = true
  try {
    await $api.put(`/api/companies/${editedCompany.id}`, {
      name: editedCompany.name.trim(),
      email: (editedCompany.email || '').trim() || null,
      phone_number: (editedCompany.phone_number || '').trim() || null,
      is_active: editedCompany.is_active,
      activity_ids: editedCompany.activities.map(a => a.id), // ✅ sync pivot
    })

    await getCompanies()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update company')
  } finally {
    isSubmit.value = false
  }
}

const deleteCompany = async (id: number) => {
  if (!confirm('Are you sure you want to delete this company?')) return
  try {
    await $api.delete(`/api/companies/${id}`)
    await getCompanies()
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete company')
  }
}

// ---------------- UI Logic ----------------
const TogglePopup = (company?: Company) => {
  if (company) {
    isToggle.value = true
    editedCompany.id = company.id
    editedCompany.name = company.name
    editedCompany.email = company.email || null
    editedCompany.phone_number = company.phone_number || null
    editedCompany.is_active = !!company.is_active
    editedCompany.activities = [...(company.activities ?? [])] // tags
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
  () => getCompanies()
)

onMounted(() => {
  getCompanies()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header / Breadcrumb -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Companies</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Companies</li>
      </ul>
    </div>

    <!-- Create form -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="createCompany">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Company Name <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="newName"
                  class="form-control radius-8"
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">Email</label>
                <input
                  type="email"
                  v-model="newEmail"
                  class="form-control radius-8"
                  placeholder="Optional email"
                />
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">Phone</label>
                <input
                  type="text"
                  v-model="newPhone"
                  class="form-control radius-8"
                  placeholder="Optional phone number"
                />
              </div>

              <!-- Activities Tag Picker -->
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Activities (Tags)
                </label>

                <!-- Selected tags -->
                <div class="d-flex flex-wrap gap-2 mb-2" v-if="newActivities.length">
                  <span
                    v-for="a in newActivities"
                    :key="a.id"
                    class="badge bg-primary-50 text-secondary-light d-inline-flex align-items-center gap-2 px-10 py-8"
                    style="border-radius: 999px;"
                  >
                    {{ a.name }}
                    <a
                      href="javascript:void(0)"
                      class="text-danger"
                      @click.prevent="removeActivityTag(a.id, 'new')"
                      title="Remove"
                    >✕</a>
                  </span>
                </div>

                <!-- Search input -->
                <div class="position-relative">
                  <input
                    type="text"
                    v-model="activityQuery"
                    class="form-control radius-8"
                    placeholder="Type to search activities..."
                    @focus="activityQuery.trim() && (activityDropdownOpen = true)"
                  />

                  <!-- Dropdown -->
                  <div
                    v-if="activityDropdownOpen"
                    class="border radius-8 bg-white position-absolute w-100 mt-1"
                    style="z-index: 20; max-height: 220px; overflow: auto;"
                  >
                    <div class="p-2 small text-muted" v-if="activityLoading">
                      Loading...
                    </div>

                    <template v-else>
                      <a
                        v-for="a in activitySuggestions"
                        :key="a.id"
                        href="javascript:void(0)"
                        class="d-block px-3 py-2 hover-bg-light"
                        @click.prevent="addActivityTag(a, 'new')"
                      >
                        {{ a.name }}
                      </a>

                      <div class="p-2 small text-muted" v-if="activitySuggestions.length === 0">
                        No results
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <div class="mb-20 form-check form-switch">
                <input class="form-check-input" type="checkbox" id="companyActive" v-model="newIsActive" />
                <label class="form-check-label" for="companyActive">Active</label>
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="button"
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
                <span v-if="isSubmit" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Save Company
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Table -->
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

              <th scope="col" @click="toggleSort('name')" style="cursor: pointer">
                Name
                <iconify-icon v-if="table.sortBy === 'name' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'name' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
              </th>

              <th scope="col" @click="toggleSort('email')" style="cursor: pointer">
                Email
                <iconify-icon v-if="table.sortBy === 'email' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'email' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
              </th>

              <th scope="col">Phone</th>
              <th scope="col">Activities</th>
              <th scope="col">Status</th>
              <th scope="col" style="width: 140px">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(c, index) in companies" :key="c.id">
              <td>{{ index + 1 }}</td>

              <td>
                <h6 class="text-md mb-0 fw-medium flex-grow-1">{{ c.name }}</h6>
              </td>

              <td>{{ c.email || '-' }}</td>
              <td>{{ c.phone_number || '-' }}</td>

              <td>
                <div class="d-flex flex-wrap gap-2">
                  <span
                    v-for="a in (c.activities || [])"
                    :key="a.id"
                    class="badge bg-primary-50 text-secondary-light px-10 py-8"
                    style="border-radius: 999px;"
                  >
                    {{ a.name }}
                  </span>
                  <span v-if="!c.activities || c.activities.length === 0" class="text-muted">-</span>
                </div>
              </td>

              <td>
                <span
                  class="badge"
                  :class="c.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'"
                >
                  {{ c.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>

              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="TogglePopup(c)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>

                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteCompany(c.id)"
                  class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                >
                  <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                </a>
              </td>
            </tr>

            <tr v-if="companies.length === 0">
              <td colspan="7" class="text-center text-muted py-4">
                No companies found.
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
            <li class="page-item" :class="{ disabled: table.page === 1 }">
              <a
                class="page-link text-secondary-light fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px bg-base"
                href="javascript:void(0)"
                @click="table.page > 1 && (table.page -= 1)"
              >
                <iconify-icon icon="ep:d-arrow-left" class="text-xl"></iconify-icon>
              </a>
            </li>

            <li v-for="p in pagination.last_page" :key="p" class="page-item">
              <a
                href="javascript:void(0)"
                @click="table.page = p"
                :class="[
                  'page-link fw-medium radius-4 border-0 px-10 py-10 d-flex align-items-center justify-content-center h-32-px w-32-px',
                  p === table.page ? 'bg-primary-600 text-white' : 'bg-primary-50 text-secondary-light',
                ]"
              >
                {{ p }}
              </a>
            </li>

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
      <div v-if="isToggle" class="modal-backdrop" @click.self="TogglePopup()">
        <div class="modal-card" role="dialog" aria-modal="true">
          <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
            <h6 class="fw-semibold mb-0">Edit Company</h6>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="TogglePopup()">
              ✕
            </button>
          </div>

          <form @submit="updateCompany">
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Company Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control radius-8" v-model="editedCompany.name" required />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Email</label>
              <input type="email" class="form-control radius-8" v-model="editedCompany.email" />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Phone</label>
              <input type="text" class="form-control radius-8" v-model="editedCompany.phone_number" />
            </div>

            <!-- Activities Tag Picker (Edit) -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Activities (Tags)</label>

              <div class="d-flex flex-wrap gap-2 mb-2" v-if="editedCompany.activities.length">
                <span
                  v-for="a in editedCompany.activities"
                  :key="a.id"
                  class="badge bg-primary-50 text-secondary-light d-inline-flex align-items-center gap-2 px-10 py-8"
                  style="border-radius: 999px;"
                >
                  {{ a.name }}
                  <a
                    href="javascript:void(0)"
                    class="text-danger"
                    @click.prevent="removeActivityTag(a.id, 'edit')"
                    title="Remove"
                  >✕</a>
                </span>
              </div>

              <div class="position-relative">
                <input
                  type="text"
                  v-model="activityQuery"
                  class="form-control radius-8"
                  placeholder="Type to search activities..."
                  @focus="activityQuery.trim() && (activityDropdownOpen = true)"
                />

                <div
                  v-if="activityDropdownOpen"
                  class="border radius-8 bg-white position-absolute w-100 mt-1"
                  style="z-index: 20; max-height: 220px; overflow: auto;"
                >
                  <div class="p-2 small text-muted" v-if="activityLoading">
                    Loading...
                  </div>

                  <template v-else>
                    <a
                      v-for="a in activitySuggestions"
                      :key="a.id"
                      href="javascript:void(0)"
                      class="d-block px-3 py-2 hover-bg-light"
                      @click.prevent="addActivityTag(a, 'edit')"
                    >
                      {{ a.name }}
                    </a>

                    <div class="p-2 small text-muted" v-if="activitySuggestions.length === 0">
                      No results
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <div class="mb-3 form-check form-switch">
              <input class="form-check-input" type="checkbox" id="editCompanyActive" v-model="editedCompany.is_active" />
              <label class="form-check-label" for="editCompanyActive">Active</label>
            </div>

            <div class="d-flex align-items-center justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" @click="TogglePopup()">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmit">
                <span v-if="isSubmit" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
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
  width: min(740px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
  padding: 20px;
}

/* optional hover helper if your theme doesn't have it */
.hover-bg-light:hover {
  background: rgba(15, 23, 42, 0.06);
}
</style>
