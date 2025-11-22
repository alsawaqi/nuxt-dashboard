<script lang="ts" setup>
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()

type RangeKey = '7d' | '30d' | '6m' | 'custom'

const loading = ref(true)
const error = ref<string | null>(null)

const transactions = ref<any[]>([])
const transacationShares = ref<any[]>([])

const showModal = ref(false)

// date range
const activeRange = ref<RangeKey>('7d')
const from = ref('')
const to = ref('')

// totals
const totalSuccessAmount = ref(0)
const totalSuccessCount = ref(0)
const totalFailedAmount = ref(0)
const totalFailedCount = ref(0)

const openModal = (shares: any[]) => {
  transacationShares.value = shares
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  transacationShares.value = []
}

const loadTransactions = async (): Promise<void> => {
  loading.value = true
  error.value = null

  try {
    const params: Record<string, any> = {
      range: activeRange.value,
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

    transactions.value = data.transactions || []

    console.log('Loaded charity transactions:', transactions.value)

    totalSuccessAmount.value = Number(data.totals?.success?.amount || 0)
    totalSuccessCount.value  = Number(data.totals?.success?.count || 0)
    totalFailedAmount.value  = Number(data.totals?.failed?.amount || 0)
    totalFailedCount.value   = Number(data.totals?.failed?.count || 0)
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load charity transactions.'
  } finally {
    loading.value = false
  }
}

const changeRange = (range: RangeKey) => {
  activeRange.value = range
  if (range !== 'custom') {
    from.value = ''
    to.value = ''
    loadTransactions()
  }
}

onMounted(async () => {
  await loadTransactions()
})
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
    <div class="row row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4 mb-24">
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Total Donations (Success)</p>
                <h6 class="mb-1">{{ totalSuccessAmount.toFixed(2) }} OMR</h6>
                <p class="text-xs text-muted mb-0">
                  {{ totalSuccessCount }} transactions
                </p>
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
                <h6 class="mb-1">{{ totalFailedAmount.toFixed(2) }} OMR</h6>
                <p class="text-xs text-muted mb-0">
                  {{ totalFailedCount }} transactions
                </p>
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
    <div class="card basic-data-table">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 class="card-title mb-0">Charity Transactions</h5>

        <!-- Date range buttons -->
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === '7d' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('7d')"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === '30d' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('30d')"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === '6m' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('6m')"
          >
            Last 6 Months
          </button>
          <button
            type="button"
            class="btn rounded-pill radius-8 px-20 py-8"
            :class="activeRange === 'custom' ? 'btn-primary-600' : 'btn-outline-primary-600'"
            @click="changeRange('custom')"
          >
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
            <button
              type="button"
              class="btn btn-primary-600 w-100"
              :disabled="!from || !to || loading"
              @click="loadTransactions"
            >
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

        <!-- Table -->
        <div v-if="!loading" class="table-responsive">
          <table class="table bordered-table mb-0" id="dataTable" data-page-length="10">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Device Name</th>
                <th scope="col">Bank</th>
                <th scope="col">Card Type</th>
                <th scope="col">Card Number</th>
                <th scope="col">Status Code</th>
                <th scope="col">Amount</th>
                <th scope="col" class="text-center">Location</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                <th scope="col">Commissions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(transaction, index) in transactions"
                :key="transaction.id"
              >
                <td>{{ index + 1 }}</td>
                <td>
                    
                   
                  {{ transaction.device?.device_model?.name }}
                   <span class="text-muted d-block text-sm">
                    ({{ transaction.device?.device_model?.device_brand?.name }})
                  </span>
                  
                  </td>
                <td>{{ transaction.bank?.name }}</td>
                <td>{{ transaction.bank_response?.sessionData?.issuer }}</td>
                <td>
                  {{ transaction.bank_response?.sessionData?.binId }}
                  XX
                  {{ transaction.bank_response?.sessionData?.panId }}
                </td>
                <td>
                  {{ transaction.bank_response?.statusCode }}
                </td>
                <td>{{ transaction.total_amount }} OMR</td>
                <td class="text-center">
                  {{ transaction.charity_location?.name }}
                </td>
                <td>{{ new Date(transaction.created_at).toLocaleDateString() }}</td>
                <td>
                  <span
                    class="badge"
                    :class="transaction.status === 'success'
                      ? 'bg-success-soft text-success'
                      : 'bg-danger-soft text-danger'"
                  >
                    {{ transaction.status }}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    @click="openModal(transaction.charitytransactionshares)"
                  >
                    Show Breakdown
                  </button>
                </td>
              </tr>

              <tr v-if="!transactions.length">
                <td colspan="10" class="text-center text-muted py-3">
                  No transactions found for this period.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal backdrop -->
  <div
    v-if="showModal"
    class="modal-backdrop fade show"
    style="z-index: 1040;"
    @click="closeModal"
  ></div>

  <!-- Modal -->
  <div
    v-if="showModal"
    class="modal fade show d-block"
    tabindex="-1"
    style="z-index: 1050;"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Commissions Breakdown</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="closeModal"
          ></button>
        </div>
        <div class="modal-body">
          <p
            v-for="share in transacationShares"
            :key="share.id"
          >
            {{ share.comission_profile_share?.organization?.name }} :
            {{ share.amount }} OMR
          </p>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="closeModal"
          >
            Close
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="closeModal"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
