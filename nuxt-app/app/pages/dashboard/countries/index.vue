<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
 
})

const { $api } = useNuxtApp() as any

interface Country {
  id: number
  name: string
  iso_code: string
  phone_code: string | null
  is_active: boolean
  created_at: string
}

interface EditCountry {
  id: number | null
  name: string
  iso_code: string
  phone_code: string | null
  is_active: boolean
}

 

const countries = ref<Country[]>([])

const newName = ref<string>('')
const newIsoCode = ref<string>('')
const newPhoneCode = ref<string>('')
const newIsActive = ref<boolean>(true)

const isSubmit = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isToggle = ref<boolean>(false)

const editedCountry = reactive<EditCountry>({
  id: null,
  name: '',
  iso_code: '',
  phone_code: null,
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

const getCountries = async () => {
  isLoading.value = true
  try {
    const { data } = await $api.get('/api/countries', {
      params: {
        page: table.page,
        per_page: table.perPage,
        search: table.search,
        sortBy: table.sortBy,
        sortDir: table.sortDir,
      },
    })

    countries.value = data.data
    pagination.value = {
      total: data.total,
      from: data.from,
      to: data.to,
      last_page: data.last_page,
    }
  } catch (error) {
    console.error('Error fetching countries:', error)
  } finally {
    isLoading.value = false
  }
}

const createCountry = async (e: Event) => {
  e.preventDefault()
  isSubmit.value = true

  try {
    await $api.post('/api/countries', {
      name: newName.value,
      iso_code: newIsoCode.value.toUpperCase(),
      phone_code: newPhoneCode.value || null,
      is_active: newIsActive.value,
    })

    newName.value = ''
    newIsoCode.value = ''
    newPhoneCode.value = ''
    newIsActive.value = true

    await getCountries()
  } catch (error: any) {
    console.error(error.data)
    alert('Failed to create country')
  } finally {
    isSubmit.value = false
  }
}

const updateCountry = async (e: Event) => {
  e.preventDefault()
  if (!editedCountry.id) return

  isSubmit.value = true
  try {
    await $api.put(`/api/countries/${editedCountry.id}`, {
      name: editedCountry.name,
      iso_code: editedCountry.iso_code.toUpperCase(),
      phone_code: editedCountry.phone_code || null,
      is_active: editedCountry.is_active,
    })

    await getCountries()
    isToggle.value = false
  } catch (error: any) {
    console.error(error)
    alert('Failed to update country')
  } finally {
    isSubmit.value = false
  }
}

const deleteCountry = async (id: number) => {
  if (!confirm('Are you sure you want to delete this country?')) return

  try {
    await $api.delete(`/api/countries/${id}`)
    await getCountries()
  } catch (error: any) {
    console.error(error)
    alert('Failed to delete country')
  }
}

// ---------- UI Logic ----------

const TogglePopup = (country?: Country) => {
  if (country) {
    isToggle.value = true
    editedCountry.id = country.id
    editedCountry.name = country.name
    editedCountry.iso_code = country.iso_code
    editedCountry.phone_code = country.phone_code
    editedCountry.is_active = country.is_active
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

// watch table state
watch(
  () => [table.page, table.perPage, table.search, table.sortBy, table.sortDir],
  () => {
    getCountries()
  }
)

onMounted(async () => {
  await getCountries()
})
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header / Breadcrumb -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0" style="color: #6b8629">Countries</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg" />
            Dashboard
          </a>
        </li>
        <li>-</li>
        <li class="fw-medium">Countries</li>
      </ul>
    </div>

    <!-- Create form -->
    <div class="card h-100 p-0 radius-12 overflow-hidden mb-24">
      <div class="card-body p-40">
        <form @submit="createCountry">
          <div class="row">
            <div class="col-sm-12">
              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Name <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="newName"
                  class="form-control radius-8"
                  placeholder="Enter country name"
                  required
                />
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  ISO Code (2 letters) <span class="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  v-model="newIsoCode"
                  class="form-control radius-8"
                  placeholder="OM, AE, SA..."
                  maxlength="2"
                  required
                />
              </div>

              <div class="mb-20">
                <label class="form-label fw-semibold text-primary-light text-sm mb-8">
                  Phone Code
                </label>
                <input
                  type="text"
                  v-model="newPhoneCode"
                  class="form-control radius-8"
                  placeholder="+968"
                />
              </div>

              <div class="mb-20 form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="countryActive"
                  v-model="newIsActive"
                />
                <label class="form-check-label" for="countryActive">
                  Active
                </label>
              </div>
            </div>

            <div class="d-flex align-items-center justify-content-center gap-3 mt-24">
              <button
                type="reset"
                class="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                @click="
                  () => {
                    newName = ''
                    newIsoCode = ''
                    newPhoneCode = ''
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
                Save Country
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
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'name' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col" @click="toggleSort('iso_code')" style="cursor: pointer">
                ISO Code
                <iconify-icon
                  v-if="table.sortBy === 'iso_code' && table.sortDir === 'asc'"
                  icon="mdi:arrow-up"
                />
                <iconify-icon
                  v-if="table.sortBy === 'iso_code' && table.sortDir === 'desc'"
                  icon="mdi:arrow-down"
                />
              </th>

              <th scope="col">Phone Code</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(country, index) in countries" :key="country.id">
              <td>
                <div class="form-check style-check d-flex align-items-center">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :id="`check-${country.id}`"
                  />
                  <label class="form-check-label" :for="`check-${country.id}`">
                    {{ index + 1 }}
                  </label>
                </div>
              </td>

              <td>
                <h6 class="text-md mb-0 fw-medium flex-grow-1">
                  {{ country.name }}
                </h6>
              </td>

              <td>{{ country.iso_code }}</td>
              <td>{{ country.phone_code || '-' }}</td>
              <td>
                <span
                  class="badge"
                  :class="country.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'"
                >
                  {{ country.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>

              <td>
                <a
                  href="javascript:void(0)"
                  @click.prevent="TogglePopup(country)"
                  class="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-1"
                >
                  <iconify-icon icon="lucide:edit"></iconify-icon>
                </a>
                <a
                  href="javascript:void(0)"
                  @click.prevent="deleteCountry(country.id)"
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
                  p === table.page
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-50 text-secondary-light',
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
            <h6 class="fw-semibold mb-0">Edit Country</h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="TogglePopup()"
            >
              ✕
            </button>
          </div>

          <form @submit="updateCountry">
            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                Name <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                placeholder="Enter country name"
                v-model="editedCountry.name"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">
                ISO Code <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control radius-8"
                placeholder="OM, AE, SA..."
                maxlength="2"
                v-model="editedCountry.iso_code"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-sm">Phone Code</label>
              <input
                type="text"
                class="form-control radius-8"
                placeholder="+968"
                v-model="editedCountry.phone_code"
              />
            </div>

            <div class="mb-3 form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                id="editCountryActive"
                v-model="editedCountry.is_active"
              />
              <label class="form-check-label" for="editCountryActive">
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
