<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { definePageMeta, useNuxtApp, useRuntimeConfig } from '#imports'

definePageMeta({ layout: 'admin', middleware: 'auth' as any })

const { $api } = useNuxtApp() as any
const config = useRuntimeConfig()

interface CharityLocationOption {
  id: number
  name: string
  main_location_id: number | null
}
interface MainLocationOption {
  id: number
  name: string
  charity_locations: CharityLocationOption[]
}
interface CashCollectionRow {
  id: number
  amount: string | number
  collected_at: string
  witness_name?: string | null
  collector?: { id: number; name: string; email?: string | null } | null
  main_location?: { id: number; name: string } | null
  charity_location?: { id: number; name: string } | null
  collector_signature_url?: string | null
  witness_signature_url?: string | null
}

const loadingFilters = ref(false)
const saving = ref(false)
const loadingRows = ref(false)
const error = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const mainLocations = ref<MainLocationOption[]>([])
const selectedMainLocationId = ref<number | null>(null)
const selectedCharityLocationId = ref<number | null>(null)

const amount = ref<string>('')
const witnessName = ref<string>('')

const collectorSignature = ref<string | null>(null)
const witnessSignature = ref<string | null>(null)

const collectorPadRef = ref<any>(null)
const witnessPadRef = ref<any>(null)

const rows = ref<CashCollectionRow[]>([])
const pagination = ref({ total: 0, from: 0, to: 0, last_page: 1 })
const table = reactive({ page: 1, perPage: 20, from: '', to: '' })

const showModal = ref(false)
const modalRow = ref<CashCollectionRow | null>(null)

const selectedMainLocation = computed(
  () => mainLocations.value.find((m) => m.id === selectedMainLocationId.value) || null
)
const charityLocationsForMain = computed(() => selectedMainLocation.value?.charity_locations || [])

const fmtMoney = (n: any) => `${Number(n || 0).toFixed(3)} OMR`
const fmtDateTime = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
const toAbsoluteUrl = (u?: string | null) => {
  if (!u) return null
  if (u.startsWith('http')) return u
  return (config.public.apiBase || '') + u
}

const loadFilters = async () => {
  try {
    loadingFilters.value = true
    error.value = null
    const { data } = await $api.get('/api/cash-collections/filters')
    mainLocations.value = (Array.isArray(data?.data) ? data.data : []).map((m: any) => ({
      ...m,
      charity_locations: Array.isArray(m.charity_locations) ? m.charity_locations : [],
    }))
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load main/charity locations.'
  } finally {
    loadingFilters.value = false
  }
}

const loadHistory = async () => {
  if (!selectedMainLocationId.value) return
  try {
    loadingRows.value = true
    error.value = null
    const params: Record<string, any> = {
      page: table.page,
      per_page: table.perPage,
      main_location_id: selectedMainLocationId.value,
      charity_location_id: selectedCharityLocationId.value || undefined,
      from: table.from || undefined,
      to: table.to || undefined,
    }
    const { data } = await $api.get('/api/cash-collections', { params })
    rows.value = (data?.data || []).map((r: any) => ({
      ...r,
      collector_signature_url: toAbsoluteUrl(r.collector_signature_url),
      witness_signature_url: toAbsoluteUrl(r.witness_signature_url),
    }))
    pagination.value = { total: data?.total || 0, from: data?.from || 0, to: data?.to || 0, last_page: data?.last_page || 1 }
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load cash collection history.'
  } finally {
    loadingRows.value = false
  }
}

const onMainLocationChange = async () => {
  selectedCharityLocationId.value = null
  table.page = 1
  await loadHistory()
}
const onCharityLocationChange = async () => {
  table.page = 1
  await loadHistory()
}

const submit = async () => {
  successMsg.value = null
  error.value = null

  if (!selectedMainLocationId.value) return (error.value = 'Please select a Main Location.')
  if (!selectedCharityLocationId.value) return (error.value = 'Please select a Charity Location.')

  const amt = Number(amount.value)
  if (!Number.isFinite(amt) || amt < 0) return (error.value = 'Please enter a valid amount.')

  if (!collectorSignature.value || collectorPadRef.value?.isEmpty?.()) return (error.value = 'Collector signature is required.')
  if (!witnessSignature.value || witnessPadRef.value?.isEmpty?.()) return (error.value = 'Witness signature is required.')

  try {
    saving.value = true
    await $api.post('/api/cash-collections', {
      main_location_id: selectedMainLocationId.value,
      charity_location_id: selectedCharityLocationId.value,
      amount: amt,
      witness_name: witnessName.value || null,
      collector_signature: collectorSignature.value,
      witness_signature: witnessSignature.value,
    })

    amount.value = ''
    witnessName.value = ''
    collectorSignature.value = null
    witnessSignature.value = null
    collectorPadRef.value?.clear?.()
    witnessPadRef.value?.clear?.()

    successMsg.value = 'Saved successfully.'
    table.page = 1
    await loadHistory()
  } catch (e: any) {
    console.error(e)
    error.value = e?.response?.data?.message || 'Failed to save.'
  } finally {
    saving.value = false
  }
}

const openRow = (r: CashCollectionRow) => { modalRow.value = r; showModal.value = true }
const closeModal = () => { showModal.value = false; modalRow.value = null }

onMounted(loadFilters)
</script>

<template>
  <div class="dashboard-main-body">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="mb-0">Cash Collection</h5>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Main Location</label>
            <select class="form-select" v-model.number="selectedMainLocationId" @change="onMainLocationChange" :disabled="loadingFilters">
              <option :value="null" disabled>Select main location...</option>
              <option v-for="ml in mainLocations" :key="ml.id" :value="ml.id">{{ ml.name }}</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="form-label">Charity Location</label>
            <select class="form-select" v-model.number="selectedCharityLocationId" @change="onCharityLocationChange" :disabled="!selectedMainLocationId">
              <option :value="null" disabled>Select charity location...</option>
              <option v-for="loc in charityLocationsForMain" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
            </select>
          </div>

          <div class="col-md-4">
            <label class="form-label">Collected Amount (OMR)</label>
            <input type="number" step="0.001" min="0" class="form-control" v-model="amount" placeholder="0.000" />
          </div>

          <div class="col-md-8">
            <label class="form-label">Witness Name (optional)</label>
            <input type="text" class="form-control" v-model="witnessName" placeholder="Witness full name" />
          </div>

          <div class="col-md-6">
            <label class="form-label">Collector Signature</label>
            <SignaturePad ref="collectorPadRef" v-model="collectorSignature" :height="170" />
          </div>

          <div class="col-md-6">
            <label class="form-label">Witness Signature</label>
            <SignaturePad ref="witnessPadRef" v-model="witnessSignature" :height="170" />
          </div>
        </div>

        <div class="d-flex justify-content-end mt-3">
          <button class="btn btn-primary" type="button" @click="submit" :disabled="saving">
            {{ saving ? 'Saving...' : 'Submit' }}
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div class="fw-semibold">History</div>
        <div class="d-flex flex-wrap gap-2">
          <input type="date" class="form-control form-control-sm" style="width:160px" v-model="table.from" />
          <input type="date" class="form-control form-control-sm" style="width:160px" v-model="table.to" />
          <button class="btn btn-sm btn-outline-primary" @click="() => { table.page = 1; loadHistory() }">Apply</button>
        </div>
      </div>

      <div class="card-body">
        <div v-if="!selectedMainLocationId" class="text-muted">Select a Main Location to view history.</div>

        <div v-else>
          <div v-if="loadingRows" class="text-muted">Loading...</div>

          <div v-else>
            <div class="table-responsive">
              <table class="table table-sm table-bordered align-middle">
                <thead>
                  <tr>
                    <th style="width:70px">#</th>
                    <th>Date</th>
                    <th>Main Location</th>
                    <th>Charity Location</th>
                    <th>Amount</th>
                    <th>Collector</th>
                    <th>Witness</th>
                    <th style="width:110px">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in rows" :key="r.id">
                    <td>{{ r.id }}</td>
                    <td>{{ fmtDateTime(r.collected_at) }}</td>
                    <td>{{ r.main_location?.name || '-' }}</td>
                    <td>{{ r.charity_location?.name || '-' }}</td>
                    <td>{{ fmtMoney(r.amount) }}</td>
                    <td>{{ r.collector?.name || '-' }}</td>
                    <td>{{ r.witness_name || '-' }}</td>
                    <td><button class="btn btn-sm btn-outline-secondary" @click="openRow(r)">View</button></td>
                  </tr>
                  <tr v-if="rows.length === 0">
                    <td colspan="8" class="text-center text-muted">No data</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="d-flex align-items-center justify-content-between mt-2">
              <div class="text-muted">Showing {{ pagination.from }} - {{ pagination.to }} of {{ pagination.total }}</div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary" :disabled="table.page <= 1" @click="() => { table.page -= 1; loadHistory() }">Prev</button>
                <button class="btn btn-sm btn-outline-secondary" :disabled="table.page >= pagination.last_page" @click="() => { table.page += 1; loadHistory() }">Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Modal -->
    <div class="modal fade show" tabindex="-1" role="dialog" style="display:block" v-if="showModal">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cash Collection Details</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>

          <div class="modal-body" v-if="modalRow">
            <div class="row g-3">
              <div class="col-md-6">
                <div class="text-muted">Date</div>
                <div class="fw-semibold">{{ fmtDateTime(modalRow.collected_at) }}</div>
              </div>
              <div class="col-md-6">
                <div class="text-muted">Amount</div>
                <div class="fw-semibold">{{ fmtMoney(modalRow.amount) }}</div>
              </div>

              <div class="col-md-6">
                <div class="text-muted mb-1">Collector Signature</div>
                <img v-if="modalRow.collector_signature_url" :src="modalRow.collector_signature_url" class="img-fluid border rounded" />
              </div>

              <div class="col-md-6">
                <div class="text-muted mb-1">Witness Signature</div>
                <img v-if="modalRow.witness_signature_url" :src="modalRow.witness_signature_url" class="img-fluid border rounded" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">Close</button>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>
  </div>
</template>