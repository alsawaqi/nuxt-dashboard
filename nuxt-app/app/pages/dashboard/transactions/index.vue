<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { definePageMeta, useNuxtApp } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp() as any

// ---------------- Types (minimal) ----------------
interface Option { id: number; name: string }

// ---------------- State ----------------
const loading = ref(false)
const error = ref<string | null>(null)

const banks = ref<Option[]>([])
const organizations = ref<Option[]>([])
const companies = ref<Option[]>([])
const countries = ref<Option[]>([])
const regions = ref<any[]>([])
const districts = ref<any[]>([])
const cities = ref<any[]>([])
const mainLocations = ref<any[]>([])
const charityLocations = ref<any[]>([])

const rows = ref<any[]>([])
const pagination = ref({ total: 0, from: 0, to: 0, last_page: 1 })

const showMoreFilters = ref(false)

// Filters
const filters = reactive({
  bank_id: null as number | null,
  from: '' as string,  // YYYY-MM-DD
  to: '' as string,    // YYYY-MM-DD
  status: 'all' as 'all' | 'success' | 'fail' | 'pending',
  search: '' as string,

  // optional filters
  organization_id: null as number | null,
  company_id: null as number | null,

  country_id: null as number | null,
  region_id: null as number | null,
  district_id: null as number | null,
  city_id: null as number | null,
  main_location_id: null as number | null,
  charity_location_id: null as number | null,
})

const table = reactive({
  page: 1,
  perPage: 20,
  sortBy: 'created_at',
  sortDir: 'desc' as 'asc' | 'desc',
})

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}
const eqId = (a: any, b: any) => {
  const na = toNum(a)
  const nb = toNum(b)
  if (na === null || nb === null) return false
  return na === nb
}

const normalizeList = (data: any) => (Array.isArray(data) ? data : data?.data ?? [])

// ---------------- Cascading options (more filters) ----------------
const regionsForFilter = computed(() =>
  regions.value.filter((r: any) => eqId(r.country_id, filters.country_id))
)

const districtsForFilter = computed(() =>
  districts.value.filter((d: any) => eqId(d.region_id, filters.region_id))
)

const citiesForFilter = computed(() =>
  cities.value.filter((c: any) => eqId(c.district_id, filters.district_id))
)

const mainLocationsForFilter = computed(() =>
  mainLocations.value.filter((m: any) => eqId(m.city_id, filters.city_id))
)

const charityLocationsForFilter = computed(() =>
  charityLocations.value.filter((cl: any) => {
    if (filters.main_location_id) return eqId(cl.main_location_id, filters.main_location_id)
    if (filters.city_id) return eqId(cl.city_id, filters.city_id)
    return false
  })
)

// Reset cascades when parent changes (only for extra filters)
watch(() => filters.country_id, () => {
  filters.region_id = null
  filters.district_id = null
  filters.city_id = null
  filters.main_location_id = null
  filters.charity_location_id = null
})
watch(() => filters.region_id, () => {
  filters.district_id = null
  filters.city_id = null
  filters.main_location_id = null
  filters.charity_location_id = null
})
watch(() => filters.district_id, () => {
  filters.city_id = null
  filters.main_location_id = null
  filters.charity_location_id = null
})
watch(() => filters.city_id, () => {
  filters.main_location_id = null
  filters.charity_location_id = null
})
watch(() => filters.main_location_id, () => {
  filters.charity_location_id = null
})

// ---------------- Helpers ----------------
const fmtMoney = (n: any) => `${Number(n || 0).toFixed(2)} OMR`

const fmtDateTime = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusLabel = (s: string) => {
  if (s === 'success') return 'Successful'
  if (s === 'fail') return 'Failed'
  if (s === 'pending') return 'Pending'
  return s || '—'
}

// ---------------- Modal (commission breakdown) ----------------
const showModal = ref(false)
const modalShares = ref<any[]>([])
const openShares = (shares: any[]) => {
  modalShares.value = shares || []
  showModal.value = true
}
const closeShares = () => {
  showModal.value = false
  modalShares.value = []
}

// ---------------- API loaders ----------------
const fetchBanks = async () => {
  const { data } = await $api.get('/api/banks', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  banks.value = normalizeList(data)
}
const fetchOrganizations = async () => {
  const { data } = await $api.get('/api/organizations/list')
  organizations.value = normalizeList(data)
}
const fetchCompanies = async () => {
  const { data } = await $api.get('/api/companies', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  companies.value = normalizeList(data)
}
const fetchCountries = async () => {
  const { data } = await $api.get('/api/countries', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  countries.value = normalizeList(data)
}
const fetchRegions = async () => {
  const { data } = await $api.get('/api/regions', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  regions.value = normalizeList(data)
}
const fetchDistricts = async () => {
  const { data } = await $api.get('/api/districts', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  districts.value = normalizeList(data)
}
const fetchCities = async () => {
  const { data } = await $api.get('/api/cities', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  cities.value = normalizeList(data)
}
const fetchMainLocations = async () => {
  const { data } = await $api.get('/api/main-locations', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  mainLocations.value = normalizeList(data)
}
const fetchCharityLocations = async () => {
  const { data } = await $api.get('/api/charity-locations', { params: { page: 1, per_page: 9999, sortBy: 'name', sortDir: 'asc' } })
  charityLocations.value = normalizeList(data)
}


const totals = ref({
  all: { amount: 0, count: 0 },
  success: { amount: 0, count: 0 },
  fail: { amount: 0, count: 0 },
})

const fmtOMR = (n: any) => {
  const num = Number(n || 0)
  // keep 2 decimals like your UI
  return `${num.toFixed(2)} OMR`
}

const selectedBankLabel = computed(() => {
  if (!filters.bank_id) return 'All banks'
  const b = banks.value.find(x => eqId(x.id, filters.bank_id))
  return b?.name ?? `Bank #${filters.bank_id}`
})

const fetchTransactions = async () => {
  loading.value = true
  error.value = null

  try {
    const params: Record<string, any> = {
      page: table.page,
      per_page: table.perPage,
      sortBy: table.sortBy,
      sortDir: table.sortDir,
      search: filters.search || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }

    if (filters.bank_id) params.bank_id = filters.bank_id
    if (filters.status !== 'all') params.status = filters.status

    if (filters.organization_id) params.organization_id = filters.organization_id
    if (filters.company_id) params.company_id = filters.company_id

    if (filters.country_id) params.country_id = filters.country_id
    if (filters.region_id) params.region_id = filters.region_id
    if (filters.district_id) params.district_id = filters.district_id
    if (filters.city_id) params.city_id = filters.city_id
    if (filters.main_location_id) params.main_location_id = filters.main_location_id
    if (filters.charity_location_id) params.charity_location_id = filters.charity_location_id

    const res = await $api.get('/api/charity-transactions', { params })
    const payload = res?.data || {}

    console.log(res);

    // items
    rows.value = payload?.data || []

    // meta (support both shapes)
    const meta = payload?.meta ?? payload

    pagination.value = {
      total: meta?.total || 0,
      from: meta?.from || 0,
      to: meta?.to || 0,
      last_page: meta?.last_page || 1,
    }

    // totals (if API provides them)
    if (payload?.totals) {
      totals.value = payload.totals
    } else {
      // fallback: at least show totals for CURRENT PAGE (optional)
      const pageAll = rows.value.reduce((s, r) => s + Number(r?.total_amount || 0), 0)
      const pageSuccess = rows.value
        .filter(r => r?.status === 'success')
        .reduce((s, r) => s + Number(r?.total_amount || 0), 0)
      const pageFail = rows.value
        .filter(r => r?.status === 'fail')
        .reduce((s, r) => s + Number(r?.total_amount || 0), 0)

      totals.value = {
        all: { amount: pageAll, count: rows.value.length },
        success: { amount: pageSuccess, count: rows.value.filter(r => r?.status === 'success').length },
        fail: { amount: pageFail, count: rows.value.filter(r => r?.status === 'fail').length },
      }
    }
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load transactions.'
  } finally {
    loading.value = false
  }
}


// Search + filter triggers
const applyFilters = () => {
  table.page = 1
  fetchTransactions()
}

const resetFilters = () => {
  filters.bank_id = null
  filters.from = ''
  filters.to = ''
  filters.status = 'all'
  filters.search = ''

  filters.organization_id = null
  filters.company_id = null

  filters.country_id = null
  filters.region_id = null
  filters.district_id = null
  filters.city_id = null
  filters.main_location_id = null
  filters.charity_location_id = null

  table.page = 1
  fetchTransactions()
}

watch(() => [table.page, table.perPage, table.sortBy, table.sortDir], () => {
  fetchTransactions()
})

const toggleSort = (col: string) => {
  if (table.sortBy === col) {
    table.sortDir = table.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    table.sortBy = col
    table.sortDir = 'asc'
  }
  table.page = 1
}

onMounted(async () => {
  await Promise.all([
    fetchBanks(),
    fetchOrganizations(),
    fetchCompanies(),
    fetchCountries(),
    fetchRegions(),
    fetchDistricts(),
    fetchCities(),
    fetchMainLocations(),
    fetchCharityLocations(),
  ])

  // default: last 7 days
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  filters.from = iso(start)
  filters.to = iso(end)

  await fetchTransactions()
})
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">Transactions</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Transactions</li>
      </ul>
    </div>


    <div class="row g-3 mb-24">
  <div class="col-lg-4 col-md-6">
    <div class="card h-100 radius-12">
      <div class="card-body">
        <div class="text-muted small">Total Amount (Success)</div>
        <div class="fs-4 fw-bold">{{ fmtOMR(totals.success.amount) }}</div>
        <div class="text-muted small">{{ selectedBankLabel }} • {{ totals.success.count }} tx</div>
      </div>
    </div>
  </div>

  <div class="col-lg-4 col-md-6">
    <div class="card h-100 radius-12">
      <div class="card-body">
        <div class="text-muted small">Total Amount (All Statuses)</div>
        <div class="fs-4 fw-bold">{{ fmtOMR(totals.all.amount) }}</div>
        <div class="text-muted small">{{ totals.all.count }} tx</div>
      </div>
    </div>
  </div>

  <div class="col-lg-4 col-md-6">
    <div class="card h-100 radius-12">
      <div class="card-body">
        <div class="text-muted small">Failed Transactions</div>
        <div class="fs-4 fw-bold">
          {{ fmtOMR(totals.fail.amount) }} OMR 
             </div>
        <div class="text-muted small">{{ totals.fail.count }} tx</div>
      </div>
    </div>
  </div>
</div>

    <!-- Filters -->
    <div class="card mb-24">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-lg-3 col-md-6">
            <label class="form-label fw-semibold text-sm mb-8">Bank</label>
            <select v-model="filters.bank_id" class="form-select radius-8">
              <option :value="null">All banks</option>
              <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>

          <div class="col-lg-3 col-md-6">
            <label class="form-label fw-semibold text-sm mb-8">From</label>
            <input type="date" v-model="filters.from" class="form-control radius-8" />
          </div>

          <div class="col-lg-3 col-md-6">
            <label class="form-label fw-semibold text-sm mb-8">To</label>
            <input type="date" v-model="filters.to" class="form-control radius-8" />
          </div>

          <div class="col-lg-3 col-md-6">
            <label class="form-label fw-semibold text-sm mb-8">Status</label>
            <select v-model="filters.status" class="form-select radius-8">
              <option value="all">All</option>
              <option value="success">Successful</option>
              <option value="fail">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div class="col-lg-6 col-md-12">
            <label class="form-label fw-semibold text-sm mb-8">Search</label>
            <input
              type="text"
              v-model="filters.search"
              class="form-control radius-8"
              placeholder="Reference / kiosk / terminal / token / model"
              @keyup.enter="applyFilters"
            />
          </div>

          <div class="col-lg-6 col-md-12 d-flex gap-2 justify-content-end">
            <button type="button" class="btn btn-outline-secondary" @click="showMoreFilters = !showMoreFilters">
              <iconify-icon icon="mdi:filter-variant" class="me-1"></iconify-icon>
              {{ showMoreFilters ? 'Hide' : 'More filters' }}
            </button>
            <button type="button" class="btn btn-outline-danger" @click="resetFilters">
              Reset
            </button>
            <button type="button" class="btn btn-primary" @click="applyFilters">
              Apply
            </button>
          </div>
        </div>

        <!-- More filters -->
        <div v-if="showMoreFilters" class="mt-3 pt-3 border-top">
          <div class="row g-3">
            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">Organization</label>
              <select v-model="filters.organization_id" class="form-select radius-8">
                <option :value="null">All organizations</option>
                <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">Company</label>
              <select v-model="filters.company_id" class="form-select radius-8">
                <option :value="null">All companies</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">Country</label>
              <select v-model="filters.country_id" class="form-select radius-8">
                <option :value="null">All</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">Region</label>
              <select v-model="filters.region_id" class="form-select radius-8" :disabled="!filters.country_id">
                <option :value="null">All</option>
                <option v-for="r in regionsForFilter" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">District</label>
              <select v-model="filters.district_id" class="form-select radius-8" :disabled="!filters.region_id">
                <option :value="null">All</option>
                <option v-for="d in districtsForFilter" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">City</label>
              <select v-model="filters.city_id" class="form-select radius-8" :disabled="!filters.district_id">
                <option :value="null">All</option>
                <option v-for="c in citiesForFilter" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">Main Location</label>
              <select v-model="filters.main_location_id" class="form-select radius-8" :disabled="!filters.city_id">
                <option :value="null">All</option>
                <option v-for="ml in mainLocationsForFilter" :key="ml.id" :value="ml.id">{{ ml.name }}</option>
              </select>
            </div>

            <div class="col-lg-3 col-md-6">
              <label class="form-label fw-semibold text-sm mb-8">Charity Location</label>
              <select v-model="filters.charity_location_id" class="form-select radius-8" :disabled="!filters.city_id">
                <option :value="null">All</option>
                <option v-for="cl in charityLocationsForFilter" :key="cl.id" :value="cl.id">{{ cl.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2">
          <span>Show</span>
          <select v-model.number="table.perPage" class="form-select form-select-sm w-auto">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>

        <div class="text-muted">
          Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }}
        </div>
      </div>

      <div class="card-body">
        <div class="spinner-border" role="status" v-if="loading">
          <span class="sr-only">Loading...</span>
        </div>

        <div v-else>
          <div v-if="error" class="alert alert-danger">{{ error }}</div>

          <div class="table-responsive scroll-sm">
            <table class="table bordered-table mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th @click="toggleSort('created_at')" style="cursor:pointer">
                    Date
                    <iconify-icon v-if="table.sortBy === 'created_at' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                    <iconify-icon v-if="table.sortBy === 'created_at' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
                  </th>
                  <th>Reference</th>
                  <th>Status Code</th>
                  <th>Card</th>

                  <th>Device</th>

                  <th>Bank</th>
                  <th @click="toggleSort('total_amount')" style="cursor:pointer">
                    Amount
                    <iconify-icon v-if="table.sortBy === 'total_amount' && table.sortDir === 'asc'" icon="mdi:arrow-up" />
                    <iconify-icon v-if="table.sortBy === 'total_amount' && table.sortDir === 'desc'" icon="mdi:arrow-down" />
                  </th>
                  <th>Status</th>
                 
                  <th>Location</th>
                  <th>Commissions</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(t, i) in rows" :key="t.id">
                  <td>{{ (table.page - 1) * table.perPage + i + 1 }}</td>
         
                  <td>{{ fmtDateTime(t.created_at) }}</td>
                  <td>{{ t.terminal_id || '—' }} </td>

              

                <td>


                  {{ t.bank_transaction_id == 2 ? t.bank_response?.receiptResponse?.approvalCode + ' -  SOHAR BANK'  : t.bank_response?.statusCode + ' -  OMAN BANK' }}
                  
                 
                
                </td>


                <td>
                

                <div v-if="t.bank_transaction_id == 2">

                  {{ t.bank_response?.receiptResponse?.cardType }} 

                  <span class="text-muted d-block text-sm">
                    {{ t.bank_response?.receiptResponse?.cardNumber }} 
                  </span>

                </div>




                     <div v-else-if="t.bank_transaction_id == 1">

                      {{ t.bank_response?.sessionData?.issuer }}
                  <span class="text-muted d-block text-sm">
                    {{ t.bank_response?.sessionData?.binId }}XXXXXXX{{
                      t.bank_response?.sessionData?.panId }}
                  </span>
                     </div>
                 
                  
                </td>
                  <td>
                    <div class="d-flex flex-column">
                      <span class="fw-semibold">
                        {{ t.device?.scalefusion?.name || '—' }}
                      </span>
                      <small class="text-muted">
                        {{ t.device?.device_model?.device_brand?.name || '—' }} {{ t.device?.device_model?.name || '—' }}
                        <span v-if="t.device?.kiosk_id"> • Kiosk: {{ t.device.kiosk_id }}</span>
                        <span v-if="t.device?.terminal_id"> • TID: {{ t.device.terminal_id }}</span>
                      </small>
                    </div>
                  </td>

                  <td>{{ t.bank?.name || '—' }}</td>
                  <td class="fw-semibold">{{ fmtMoney(t.total_amount) }}</td>

                  <td>
                    <span class="badge"
                      :class="{
                        'bg-success-subtle text-success': t.status === 'success',
                        'bg-danger-subtle text-danger': t.status === 'fail',
                        'bg-warning-subtle text-warning': t.status === 'pending',
                      }"
                    >
                      {{ statusLabel(t.status) }}
                    </span>
                  </td>

                

                  <td>
                    <small class="text-muted">
                      {{ t.country?.name || '—' }} /
                      {{ t.region?.name || '—' }} /
                      {{ t.district?.name || '—' }} /
                      {{ t.city?.name || '—' }}
                    </small>
                    <div>
                      {{ t.main_location?.name || t.charity_location?.main_location?.name || '—' }}
                      <span class="text-muted"> - </span>
                      {{ t.charity_location?.name || '—' }}  tx
                    </div>
                  </td>

                  <td>
                    <button type="button" class="btn btn-sm btn-primary" @click="openShares(t.charitytransactionshares)">
                      Show Breakdown
                    </button>
                  </td>
                </tr>

                <tr v-if="!rows.length">
                  <td colspan="10" class="text-center text-muted py-3">
                    No transactions found for these filters.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Page {{ table.page }} / {{ pagination.last_page || 1 }}
            </span>

            <ul class="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
              <li class="page-item" :class="{ disabled: table.page === 1 }">
                <a class="page-link" href="javascript:void(0)" @click="table.page > 1 && (table.page -= 1)">Prev</a>
              </li>

              <li class="page-item" :class="{ disabled: table.page >= (pagination.last_page || 1) }">
                <a class="page-link" href="javascript:void(0)" @click="table.page < (pagination.last_page || 1) && (table.page += 1)">Next</a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>

    <!-- Breakdown modal -->
    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="z-index: 1050;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Commissions Breakdown</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="closeShares"></button>
          </div>
          <div class="modal-body">
            <div v-if="!modalShares.length" class="text-muted">No commission rows.</div>

            <div v-else>
              <div v-for="share in modalShares" :key="share.id" class="d-flex justify-content-between py-1">
                <div>
                  <div class="fw-semibold">{{ share.comission_profile_share?.organization?.name || '—' }}</div>
                  <small class="text-muted" v-if="share.comission_profile_share?.percentage">
                    {{ share.comission_profile_share.percentage }}%
                  </small>
                </div>
                <div class="fw-semibold">{{ fmtMoney(share.amount) }}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeShares">Close</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
