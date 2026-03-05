<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()

type RangeKey = 'today' | '7d' | '30d' | '6m' | 'custom'

const loading = ref(true)
const error = ref<string | null>(null)

const transactions = ref<any[]>([])
const transacationShares = ref<any[]>([])

const showModal = ref(false)

// date range
const activeRange = ref<RangeKey>('7d')
const from = ref('')
const to = ref('')

const successRows = ref<any[]>([])
const failedRows = ref<any[]>([])

const perPage = ref(10)
const successPage = ref(1)
const failedPage = ref(1)

const successMeta = ref({ current_page: 1, last_page: 1, total: 0 })
const failedMeta = ref({ current_page: 1, last_page: 1, total: 0 })

// totals
const totalSuccessAmount = ref(0)
const totalSuccessCount = ref(0)
const totalFailedAmount = ref(0)
const totalFailedCount = ref(0)


const animSuccessAmount = ref(0)
const animFailedAmount = ref(0)
const animSuccessCount = ref(0)
const animFailedCount = ref(0)

const tween = (to: number, setter: (v: number) => void, ms = 600) => {
  // ✅ SSR guard
  if (process.server) {
    setter(to)
    return
  }

  const from = 0
  const start = window.performance.now()

  const raf =
    window.requestAnimationFrame ||
    ((cb: FrameRequestCallback) => window.setTimeout(() => cb(window.performance.now()), 16) as any)

  const step = (t: number) => {
    const p = Math.min(1, (t - start) / ms)
    const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
    setter(from + (to - from) * eased)
    if (p < 1) raf(step)
  }

  raf(step)
}


watch(
  [totalSuccessAmount, totalFailedAmount, totalSuccessCount, totalFailedCount],
  ([sa, fa, sc, fc]) => {
    tween(sa, v => (animSuccessAmount.value = v))
    tween(fa, v => (animFailedAmount.value = v))
    tween(sc, v => (animSuccessCount.value = Math.round(v)))
    tween(fc, v => (animFailedCount.value = Math.round(v)))
  },
  { immediate: true }
)


// ---------- modal ----------
const openModal = (shares: any[]) => {
  transacationShares.value = shares || []
  showModal.value = true
}
const closeModal = () => {
  showModal.value = false
  transacationShares.value = []
}

// ---------- helpers ----------
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

const todayLabel = computed(() => {
  const d = new Date()
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
})

// ---------- split lists (IMPORTANT: statuses successful/failed) ----------
const successfulTx = computed(() =>
  (transactions.value || []).filter(t => t?.status === 'successful')
)

const failedTx = computed(() =>
  (transactions.value || []).filter(t => t?.status === 'failed')
)

// ---------- pagination (client-side) ----------
const pageSize = ref(10)

const pageSuccess = ref(1)
const pageFailed = ref(1)

const totalPagesSuccess = computed(() =>
  Math.max(1, Math.ceil(successfulTx.value.length / pageSize.value))
)
const totalPagesFailed = computed(() =>
  Math.max(1, Math.ceil(failedTx.value.length / pageSize.value))
)
 

// reset pages when list changes
watch([successfulTx, failedTx], () => {
  pageSuccess.value = 1
  pageFailed.value = 1
})

// ---------- api ----------
const loadTransactions = async () => {
  loading.value = true
  error.value = null

  try {
    const params: Record<string, any> = {
      range: activeRange.value,
      per_page: perPage.value,
      success_page: successPage.value,
      failed_page: failedPage.value,
    }

    if (activeRange.value === 'custom') {
      if (!from.value || !to.value) {
        loading.value = false
        error.value = 'Please choose From and To dates.'
        return
      }
      params.from = from.value
      params.to = to.value
    }

    const { data } = await $api.get('/api/stats/charity/transactions', { params })

    // ✅ rows
    successRows.value = data.success?.data || []
    failedRows.value = data.failed?.data || []

    // ✅ meta
    successMeta.value = {
      current_page: data.success?.current_page || 1,
      last_page: data.success?.last_page || 1,
      total: data.success?.total || 0,
    }
    failedMeta.value = {
      current_page: data.failed?.current_page || 1,
      last_page: data.failed?.last_page || 1,
      total: data.failed?.total || 0,
    }

    // totals cards
    totalSuccessAmount.value = Number(data.totals?.success?.amount || 0)
    totalSuccessCount.value = Number(data.totals?.success?.count || 0)
    totalFailedAmount.value = Number(data.totals?.failed?.amount || 0)
    totalFailedCount.value = Number(data.totals?.failed?.count || 0)

  } catch (e) {
    console.error(e)
    error.value = 'Failed to load charity transactions.'
  } finally {
    loading.value = false
  }
}



watch(perPage, () => {
  successPage.value = 1
  failedPage.value = 1
  loadTransactions()
})


const goSuccessPage = (p: number) => {
  const next = Math.min(Math.max(1, p), successMeta.value.last_page || 1)
  if (next === successPage.value) return
  successPage.value = next
  loadTransactions()
}

const goFailedPage = (p: number) => {
  const next = Math.min(Math.max(1, p), failedMeta.value.last_page || 1)
  if (next === failedPage.value) return
  failedPage.value = next
  loadTransactions()
}



const changeRange = (range: RangeKey) => {
  activeRange.value = range
  successPage.value = 1
  failedPage.value = 1

  if (range !== 'custom') {
    from.value = ''
    to.value = ''
    loadTransactions()
  }
}



onMounted(loadTransactions)

const mounted = ref(false)
onMounted(() => (mounted.value = true))

watch(
  [totalSuccessAmount, totalFailedAmount, totalSuccessCount, totalFailedCount],
  ([sa, fa, sc, fc]) => {
    if (!mounted.value) {
      animSuccessAmount.value = sa
      animFailedAmount.value = fa
      animSuccessCount.value = sc
      animFailedCount.value = fc
      return
    }

    tween(sa, v => (animSuccessAmount.value = v))
    tween(fa, v => (animFailedAmount.value = v))
    tween(sc, v => (animSuccessCount.value = Math.round(v)))
    tween(fc, v => (animFailedCount.value = Math.round(v)))
  },
  { immediate: true }
)
</script>






<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">Charity Transactions</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Charity Transactions</li>
      </ul>
    </div>

    <!-- Totals cards -->
    <div class="row row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4 mb-24 fade-up">
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Total Donations (Success)</p>
               <h6 class="mb-1">{{ animSuccessAmount.toFixed(2) }} OMR</h6>
<p class="text-xs text-muted mb-0">{{ animSuccessCount }} transactions</p>
              </div>
              <div class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                <iconify-icon icon="mdi:hand-heart-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card shadow-none border bg-gradient-start-2 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Total Donations (Failed)</p>
                <h6 class="mb-1">{{ animFailedAmount.toFixed(2) }} OMR</h6>
<p class="text-xs text-muted mb-0">{{ animFailedCount }} transactions</p>
              </div>
              <div class="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                <iconify-icon icon="mdi:alert-circle-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- empty 3rd column for symmetry if you want later -->
    </div>

    <!-- Table card -->
    <div class="card basic-data-table fade-up">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 class="card-title mb-0">Charity Transactions</h5>

        <!-- Date range buttons -->
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button type="button" class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === 'today' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('today')">
            Today ({{ todayLabel }})
          </button>

          <button type="button" class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === '7d' ? 'btn-primary-600' : 'btn-outline-primary-600'" @click="changeRange('7d')">
            Last 7 Days
          </button>
          <button type="button" class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === '30d' ? 'btn-primary-600' : 'btn-outline-primary-600'" @click="changeRange('30d')">
            Last 30 Days
          </button>
          <button type="button" class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === '6m' ? 'btn-primary-600' : 'btn-outline-primary-600'" @click="changeRange('6m')">
            Last 6 Months
          </button>
          <button type="button" class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === 'custom' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('custom')">
            Custom
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Custom date range -->
        <div v-if="activeRange === 'custom'" class="row g-2 mb-3">
          <div class="col-md-3">
            <label class="form-label mb-1">From</label>
            <input v-model="from" type="date" class="form-control" />
          </div>
          <div class="col-md-3">
            <label class="form-label mb-1">To</label>
            <input v-model="to" type="date" class="form-control" />
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button type="button" class="btn btn-primary-600 w-100" :disabled="!from || !to || loading"
              @click="loadTransactions">
              Apply Filter
            </button>
          </div>
        </div>

        <!-- Error / loading -->
        <div v-if="error" class="alert alert-danger mb-3">
          {{ error }}
        </div>
        <div v-if="loading" class="text-center py-3">
          Loading...
        </div>

        <!-- SUCCESS TABLE -->
        <div v-if="!loading" class="mb-4">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-success-soft text-success px-3 py-2">Successful</span>
              <span class="text-muted">({{ successMeta.total }})</span>
            </div>

            <div class="d-flex align-items-center gap-2">
              <small class="text-muted">Rows:</small>
              <select v-model.number="perPage" class="form-select form-select-sm" style="width: 90px;">
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
              </select>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table bordered-table mb-0 pro-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Device</th>
                  <th>Bank</th>
                  <th>Card</th>
                  <th>Status Code</th>
                  <th>Amount</th>
                  <th class="text-center">Location</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Commissions</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(transaction, index) in successRows" :key="transaction.id">
                  <td>{{ (successMeta.current_page - 1) * perPage + index + 1 }}</td>

                  <td>
                    {{ transaction.device?.device_model?.name }}
                    <span class="text-muted d-block text-sm">
                      ({{ transaction.device?.device_model?.device_brand?.name }})
                    </span>
                  </td>

                  <td>{{ transaction.bank?.name }}</td>

                  <td>
                

                  <div v-if="transaction.bank_transaction_id == 2">

                    {{ transaction.bank_response?.receiptResponse?.cardType }} 

                    <span class="text-muted d-block text-sm">
                      {{ transaction.bank_response?.receiptResponse?.cardNumber }} 
                    </span>

                  </div>




                       <div v-else-if="transaction.bank_transaction_id == 1">

                        {{ transaction.bank_response?.sessionData?.issuer }}
                    <span class="text-muted d-block text-sm">
                      {{ transaction.bank_response?.sessionData?.binId }}XXXXXXX{{
                        transaction.bank_response?.sessionData?.panId }}
                    </span>
                       </div>
                   
                    
                  </td>

                  <td>


                    {{ transaction.bank_transaction_id == 2 ? transaction.bank_response?.receiptResponse?.approvalCode + ' -  SOHAR BANK'  : transaction.bank_response?.statusCode + ' -  OMAN BANK' }}
                    
                   
                  
                  </td>

                  <td class="fw-semibold">{{ fmtMoney(transaction.total_amount) }}</td>

                  <td class="text-center">
                    {{ transaction.charity_location?.main_location?.name }} - {{ transaction.charity_location?.name }}
                  </td>

                  <td>{{ fmtDateTime(transaction.created_at) }}</td>

                <td>
  <span class="pill pill-success">
    <span class="pill-dot"></span> Successful
  </span>
</td>

                  <td>
                    <button type="button" class="btn btn-primary btn-sm"
                      @click="openModal(transaction.charitytransactionshares)">
                      Show Breakdown
                    </button>
                  </td>
                </tr>

                <tr v-if="!successRows.length">
                  <td colspan="10" class="text-center text-muted py-3">
                    No successful transactions found for this period.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination (Success) -->
          <nav v-if="successMeta.last_page > 1" class="mt-3">
            <ul class="pagination justify-content-center mb-0">
              <li class="page-item" :class="{ disabled: successMeta.current_page === 1 }">
                <a class="page-link" href="#" @click.prevent="goSuccessPage(successMeta.current_page - 1)">
                  Prev
                </a>
              </li>

              <li class="page-item disabled">
                <span class="page-link">
                  Page {{ successMeta.current_page }} of {{ successMeta.last_page }}
                </span>
              </li>

              <li class="page-item" :class="{ disabled: successMeta.current_page === successMeta.last_page }">
                <a class="page-link" href="#" @click.prevent="goSuccessPage(successMeta.current_page + 1)">
                  Next
                </a>
              </li>
            </ul>
          </nav>

        </div>

        <!-- FAILED TABLE -->
        <div v-if="!loading">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-danger-soft text-danger px-3 py-2">Failed</span>
              <span class="text-muted">({{ failedMeta.total }})</span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table bordered-table mb-0 pro-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Device</th>
                  <th>Bank</th>
           
                  <th>Amount</th>
                  <th class="text-center">Location</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Commissions</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(transaction, index) in failedRows" :key="transaction.id">
                  <td>{{ (failedMeta.current_page - 1) * perPage + index + 1 }}</td>

                  <td>
                    {{ transaction.device?.device_model?.name }}
                    <span class="text-muted d-block text-sm">
                      ({{ transaction.device?.device_model?.device_brand?.name }})
                    </span>
                  </td>

                  <td>{{ transaction.bank?.name }}</td>

                 

               

                  <td class="fw-semibold">{{ fmtMoney(transaction.total_amount) }}</td>

                  <td class="text-center">
                    {{ transaction.charity_location?.main_location?.name }} - {{ transaction.charity_location?.name }}
                  </td>

                  <td>{{ fmtDateTime(transaction.created_at) }}</td>

                  <td><span class="pill pill-failed">
    <span class="pill-dot"></span> Failed
  </span></td>

                  <td>
                    <button type="button" class="btn btn-primary btn-sm btn-micro"
  @click="openModal(transaction.charitytransactionshares)">
  Show Breakdown
</button>
                  </td>
                </tr>

               <tr v-if="!failedRows.length">
                  <td colspan="10" class="text-center text-muted py-3">
                    No failed transactions found for this period.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination (Failed) -->
         <nav v-if="failedMeta.last_page > 1" class="mt-3">
  <ul class="pagination justify-content-center mb-0">
    <li class="page-item" :class="{ disabled: failedMeta.current_page === 1 }">
      <a class="page-link" href="#"
         @click.prevent="goFailedPage(failedMeta.current_page - 1)">
        Prev
      </a>
    </li>

    <li class="page-item disabled">
      <span class="page-link">
        Page {{ failedMeta.current_page }} of {{ failedMeta.last_page }}
      </span>
    </li>

    <li class="page-item" :class="{ disabled: failedMeta.current_page === failedMeta.last_page }">
      <a class="page-link" href="#"
         @click.prevent="goFailedPage(failedMeta.current_page + 1)">
        Next
      </a>
    </li>
  </ul>
</nav>

        </div>





      </div>
    </div>
  </div>

  <!-- Modal backdrop -->
  <div v-if="showModal" class="modal-backdrop fade show" style="z-index: 1040;" @click="closeModal"></div>

  <!-- Modal -->
  <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="z-index: 1050;">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Commissions Breakdown</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <p v-for="share in transacationShares" :key="share.id">
            {{ share.comission_profile_share?.organization?.name }} :
            {{ share.amount }} OMR
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            Close
          </button>
          <button type="button" class="btn btn-primary" @click="closeModal">
            Save changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* ---------- Section entrance ---------- */
.fade-up {
  animation: fadeUp .35s ease-out both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---------- Table row micro-interactions ---------- */
.pro-table tbody tr {
  transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease;
}
.pro-table tbody tr:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0,0,0,.06);
  background: rgba(59,130,246,.04);
}

/* ---------- Status pills ---------- */
.pill {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  padding: .32rem .65rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: .78rem;
  letter-spacing: .2px;
}
.pill-dot {
  width: .45rem;
  height: .45rem;
  border-radius: 999px;
}
.pill-success { background: rgba(34,197,94,.12); color: rgb(22,163,74); }
.pill-success .pill-dot { background: rgb(34,197,94); }
.pill-failed { background: rgba(239,68,68,.12); color: rgb(220,38,38); }
.pill-failed .pill-dot { background: rgb(239,68,68); }

/* ---------- Buttons micro ---------- */
.btn-micro {
  transition: transform .12s ease, box-shadow .12s ease;
}
.btn-micro:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(0,0,0,.08); }
.btn-micro:active { transform: translateY(0); box-shadow: none; }

/* ---------- Modal list ---------- */
.breakdown-item {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:.6rem .75rem;
  border: 1px solid rgba(0,0,0,.06);
  border-radius: .75rem;
  margin-bottom: .5rem;
}
.breakdown-name { font-weight: 600; }
.breakdown-amt { font-weight: 700; }

/* ---------- Optional skeleton shimmer ---------- */
.skel {
  border-radius: .75rem;
  background: linear-gradient(90deg, rgba(0,0,0,.05), rgba(0,0,0,.08), rgba(0,0,0,.05));
  background-size: 200% 100%;
  animation: shimmer 1.1s linear infinite;
}
@keyframes shimmer { 0% {background-position:200% 0} 100% {background-position:-200% 0} }
</style>
