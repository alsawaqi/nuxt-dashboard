<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp() as any

interface Activity {
  id: number
  name: string
  is_active: boolean
  companies_count?: number
  created_at?: string
}

interface EditActivity {
  id: number | null
  name: string
  is_active: boolean
}

const activities = ref<Activity[]>([])

const newName = ref<string>('')
const newIsActive = ref<boolean>(true)

const isSubmit = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isToggle = ref<boolean>(false)

const editedActivity = reactive<EditActivity>({
  id: null,
  name: '',
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

// ---------- API Calls ----------

const getActivities = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/activities', {
      params: {
        page: table.page,
        per_page: table.perPage,
        q: table.search, // backend should read q
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    activities.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching activities:', error)
  } finally {
    isLoading.value = false
  }
}

const resetCreateForm = () => {
  newName.value = ''
  newIsActive.value = true
}

const createActivity = async (e: Event) => {
  e.preventDefault()
  isSubmit.value = true

  try {
    await $api.post('/api/activities', {
      name: newName.value.trim(),
      is_active: newIsActive.value,
    })

    resetCreateForm()
    table.page = 1
    await getActivities()
  } catch (error: any) {
    console.error(error)
    alert('Failed to create activity')
  } finally {
    isSubmit.value = false
  }
}

const updateActivity = async (e: Event) => {
  e.preventDefault()
  if (!editedActivity.id) return

  isSubmit.value = true
  try {
    await $api.put(`/api/activities/${editedActivity.id}`, {
      name: editedActivity.name.trim(),
      is_active: editedActivity.is_active,
    })

    await getActivities()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update activity')
  } finally {
    isSubmit.value = false
  }
}

const deleteActivity = async (id: number) => {
  if (!confirm('Are you sure you want to delete this activity?')) return

  try {
    await $api.delete(`/api/activities/${id}`)
    await getActivities()
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete activity')
  }
}

// ---------- UI Logic ----------

const TogglePopup = (activity?: Activity) => {
  if (activity) {
    isToggle.value = true
    editedActivity.id = activity.id
    editedActivity.name = activity.name
    editedActivity.is_active = !!activity.is_active
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
  () => getActivities()
)

onMounted(() => {
  getActivities()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header / Breadcrumb -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Activities</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Activities</li>
      </ul>
    </div>

    <!-- Create form -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="createActivity">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Activity Name <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="newName"
                  class="form-control radius-8"
                  placeholder="Supermarket, Charity, Shopping Mall..."
                  required
                />
              </div>

              <div class="mb-20 form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="activityActive"
                  v-model="newIsActive"
                />
                <label class="form-check-label" for="activityActive">
                  Active
                </label>
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
                <span
                  v-if="isSubmit"
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                Save Activity
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
              <th scope="col">
                <div class="form-check style-check d-flex align-items-center">
                  <input class="form-check-input" type="checkbox" id="checkAll" />
                  <label class="form-check-label" for="checkAll"> S.L </label>
                </div>
              </th>

              <th scope="col" @click="toggleSort('name')" style="cursor: pointer">
                Name
                <iconify-icon v-if="table.sortBy === 'name' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'name' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
              </th>

              <th scope="col" style="width: 140px" @click="toggleSort('companies_count')" v-if="activities?.[0]?.companies_count !== undefined" :style="{ cursor: 'pointer' }">
                Companies
                <iconify-icon v-if="table.sortBy === 'companies_count' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                <iconify-icon v-if="table.sortBy === 'companies_count' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
              </th>

              <th scope="col">Status</th>
              <th scope="col" style="width: 140px">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(activity, index) in activities" :key="activity.id">
              <td>
                <div class="form-check style-check d-flex align-items-center">
                  <input class="form-check-input" type="checkbox" :id="`check-${activity.id}`" />
                  <label class="form-check-label" :for="`check-${activity.id}`">
                    {{ index + 1 }}
                  </label>
                </div>
              </td>

              <td>
                <h6 class="text-md mb-0 fw-medium flex-grow-1">
                  {{ activity.name }}
                </h6>
              </td>

              <td v-if="activity.companies_count !== undefined">
                {{ activity.companies_count }}
              </td>

              <td>
                <span
                  class="badge"
                  :class="activity.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'"
                >
                  {{ activity.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>

              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="TogglePopup(activity)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>

                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteActivity(activity.id)"
                  class="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                >
                  <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                </a>
              </td>
            </tr>

            <tr v-if="activities.length === 0">
              <td colspan="5" class="text-center text-muted py-4">
                No activities found.
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
            <h6 class="fw-semibold mb-0">Edit Activity</h6>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="TogglePopup()">
              ✕
            </button>
          </div>

          <form @submit="updateActivity">
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Activity Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                placeholder="Enter activity name"
                v-model="editedActivity.name"
                required
              />
            </div>

            <div class="mb-3 form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                id="editActivityActive"
                v-model="editedActivity.is_active"
              />
              <label class="form-check-label" for="editActivityActive">
                Active
              </label>
            </div>

            <div class="d-flex align-items-center justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" @click="TogglePopup()">
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
