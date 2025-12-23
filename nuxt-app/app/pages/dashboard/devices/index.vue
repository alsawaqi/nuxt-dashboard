<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useNuxtApp, definePageMeta } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp() as any

// ✅ MAIN LIST: from your DB devices endpoint
type ScalefusionInfo = {
  id?: number | null
  name?: string | null

  // ✅ add these (used in search + can be shown in table if you want)
  make?: string | null
  model?: string | null
  model_name?: string | null
  serial_no?: string | null
  os_type?: string | null
  os_version?: string | null

  battery_status?: number | null
  battery_charging?: boolean | null

  connection_state?: string | null
  connection_status?: string | null

  device_status?: string | null
  locked?: boolean | null

  last_connected_at?: string | null
  last_seen_on?: string | null
}

type DeviceRow = {
  id: number
  kiosk_id?: string | null
  model_number?: string | null
  status?: string | null
  created_at?: string | null

  // you can keep other fields if you want, not needed for this table
  scalefusion?: ScalefusionInfo | null
}

const loading = ref(false)
const error = ref<string | null>(null)

// DB devices list + pagination
const rows = ref<DeviceRow[]>([])
const table = ref({
  page: 1,
  perPage: 50, // this page is more "monitor", so bigger default
  search: '',
})

const pagination = ref({
  total: 0,
  from: 0,
  to: 0,
  last_page: 1,
})

// simple search box (client-side)
const searchTerm = ref('')

// -------- Helpers --------
const isOnline = (r: DeviceRow) =>
  (r.scalefusion?.connection_status || '').toLowerCase() === 'online'

const sfBatteryText = (r: DeviceRow) => {
  const b = r.scalefusion?.battery_status
  if (b === null || b === undefined) return '—'
  return `${b}${b <= 100 ? '%' : ''}`
}

const sfConnBadgeClass = (r: DeviceRow) =>
  isOnline(r) ? 'bg-success-soft text-success' : 'bg-secondary-soft text-secondary'

const sfConnLabel = (r: DeviceRow) =>
  r.scalefusion?.connection_status ?? '—'

// -------- STATS (based on DB rows, but status comes from Scalefusion) --------
const totalDevices = computed(() => rows.value.length)

const activeDevices = computed(() =>
  rows.value.filter(r => isOnline(r)).length
)

const inactiveDevices = computed(() =>
  totalDevices.value - activeDevices.value
)

// -------- filtered list for table (client-side) --------
const filteredDevices = computed(() => {
  const term = searchTerm.value.toLowerCase().trim()
  if (!term) return rows.value

  return rows.value.filter((r) => {
    const sf = r.scalefusion || {}
    return (
      String(r.kiosk_id || '').toLowerCase().includes(term) ||
      String(r.model_number || '').toLowerCase().includes(term) ||
      String(sf.name || '').toLowerCase().includes(term) ||
      String(sf.make || '').toLowerCase().includes(term) ||
      String(sf.model_name || sf.model || '').toLowerCase().includes(term) ||
      String(sf.serial_no || '').toLowerCase().includes(term)
    )
  })
})

// -------- LOAD DATA (DB + Scalefusion enrich) --------
const loadDevices = async () => {
  loading.value = true
  error.value = null

  try {
    const params: any = {
      page: table.value.page,
      per_page: table.value.perPage,
      // server-side search if you want (kiosk/model/token) — optional
      search: table.value.search || undefined,

      // ✅ IMPORTANT: ask backend to enrich each DB device with Scalefusion fields
      with_scalefusion: 1,
    }

    const res = await $api.get('/api/devices', { params })

    rows.value = res.data?.data || []
    pagination.value = {
      total: res.data?.total || 0,
      from: res.data?.from || 0,
      to: res.data?.to || 0,
      last_page: res.data?.last_page || 1,
    }
  } catch (e: any) {
    console.error('Error fetching devices:', e)
    error.value = e?.response?.data?.error || 'Failed to load devices.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDevices)

// optional: if you want auto-refresh every 30s (monitor page)
// setInterval(loadDevices, 30000)

// if you want server-side search too:
watch(
  () => [table.value.page, table.value.perPage, table.value.search],
  () => loadDevices()
)
</script>

<template>
  <div class="dashboard-main-body">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <h6 class="fw-semibold mb-0">Devices</h6>
      <ul class="d-flex align-items-center gap-2">
        <li class="fw-medium">
          <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium">Devices</li>
      </ul>
    </div>

    <!-- STATS CARDS -->
    <div class="row row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4 mb-24">
      <!-- Total Devices -->
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Total Devices</p>
                <h6 class="mb-1">{{ totalDevices }}</h6>
                <p class="text-xs text-muted mb-0">Devices from your database</p>
              </div>
              <div class="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                <iconify-icon icon="mdi:devices" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Devices -->
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-1 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Active Devices</p>
                <h6 class="mb-1">{{ activeDevices }}</h6>
                <p class="text-xs text-muted mb-0">Scalefusion connection_status = Online</p>
              </div>
              <div class="w-50-px h-50-px bg-success rounded-circle d-flex justify-content-center align-items-center">
                <iconify-icon icon="mdi:checkbox-marked-circle-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Inactive Devices -->
      <div class="col">
        <div class="card shadow-none border bg-gradient-start-2 h-100">
          <div class="card-body p-20">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <p class="fw-medium text-primary-light mb-1">Inactive Devices</p>
                <h6 class="mb-1">{{ inactiveDevices }}</h6>
                <p class="text-xs text-muted mb-0">Not Online / missing Scalefusion match</p>
              </div>
              <div class="w-50-px h-50-px bg-danger rounded-circle d-flex justify-content-center align-items-center">
                <iconify-icon icon="mdi:alert-circle-outline" class="text-white text-2xl mb-0"></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DEVICES TABLE -->
    <div class="card basic-data-table">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h5 class="card-title mb-0">Devices</h5>

        <div class="d-flex align-items-center gap-2">
          <!-- Client search -->
          <input
            v-model="searchTerm"
            type="text"
            class="form-control form-control-sm"
            style="max-width: 240px;"
            placeholder="Search (kiosk / name / model / serial...)"
          />
        </div>
      </div>

      <div class="card-body">
        <div v-if="error" class="alert alert-danger mb-3">{{ error }}</div>
        <div v-if="loading" class="text-center py-3">Loading devices...</div>

        <div v-if="!loading" class="table-responsive">
          <table class="table bordered-table mb-0 w-100">
            <thead>
              <tr>
                <th>#</th>
                <th>Kiosk ID</th>
                <th>Scalefusion Name</th>
                <th>Battery</th>
                <th>Charging</th>
                <th>Connection State</th>
                <th>Connection Status</th>
                <th>Last Seen</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(r, index) in filteredDevices" :key="r.id">
                <td>{{ index + 1 }}</td>

                <td>
                  <div class="d-flex flex-column">
                    <span class="fw-semibold">{{ r.kiosk_id || '—' }}</span>
                    <small class="text-muted">DB ID: {{ r.id }}</small>
                  </div>
                </td>

                <td>{{ r.scalefusion?.name || '—' }}</td>

                <td>{{ sfBatteryText(r) }}</td>

                <td>
                  <span class="badge"
                        :class="r.scalefusion?.battery_charging ? 'bg-info-soft text-info' : 'bg-secondary-soft text-secondary'">
                    {{ r.scalefusion ? (r.scalefusion.battery_charging ? 'Charging' : 'Not charging') : '—' }}
                  </span>
                </td>

                <td>{{ r.scalefusion?.connection_state || '—' }}</td>

                <td>
                  <span class="badge" :class="sfConnBadgeClass(r)">
                    {{ sfConnLabel(r) }}
                  </span>
                </td>

                <td>{{ r.scalefusion?.last_seen_on || r.scalefusion?.last_connected_at || '—' }}</td>

                <!-- ✅ keep your View button (but based on YOUR device id) -->
                <td>
                  <NuxtLink
                    :to="`/dashboard/devices/${r.kiosk_id}`"
                    class="btn btn-sm btn-primary"
                  >
                    View
                  </NuxtLink>
                </td>
              </tr>

              <tr v-if="!filteredDevices.length && !loading">
                <td colspan="9" class="text-center text-muted py-3">
                  No devices found.
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Optional: simple pagination controls -->
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-24">
            <span>
              Showing {{ pagination.from || 0 }} to {{ pagination.to || 0 }} of {{ pagination.total || 0 }}
            </span>

            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary"
                      :disabled="table.page <= 1"
                      @click="table.page--">
                Prev
              </button>
              <button class="btn btn-sm btn-outline-secondary"
                      :disabled="table.page >= pagination.last_page"
                      @click="table.page++">
                Next
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
