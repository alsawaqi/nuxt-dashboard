<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()

// raw API response from Scalefusion proxy
const devices = ref<any | null>(null)

const loading = ref(false)
const error = ref<string | null>(null)

// simple search box
const searchTerm = ref('')

// ---- STATS ----

// total devices (use API total_count if you want, or length of devices array)
const totalDevices = computed(() => {
  if (!devices.value) return 0
  // prefer length of array to avoid pagination confusion
  return Array.isArray(devices.value.devices) ? devices.value.devices.length : 0
})

// devices with connection_status === "Online"
const activeDevices = computed(() => {
  if (!devices.value?.devices) return 0
  return devices.value.devices.filter(
    (d: any) => d.device?.connection_status === 'Online'
  ).length
})

// everything else = inactive
const inactiveDevices = computed(() => {
  return totalDevices.value - activeDevices.value
})

// filtered list for table
const filteredDevices = computed(() => {
  if (!devices.value?.devices) return []

  const term = searchTerm.value.toLowerCase().trim()
  if (!term) return devices.value.devices

  return devices.value.devices.filter((d: any) => {
    const dev = d.device || {}
    return (
      String(dev.name || '').toLowerCase().includes(term) ||
      String(dev.model || '').toLowerCase().includes(term) ||
      String(dev.make || '').toLowerCase().includes(term) ||
      String(dev.serial_no || '').toLowerCase().includes(term)
    )
  })
})

// ---- LOAD DATA ----
const loadDevices = async () => {
  loading.value = true
  error.value = null

  try {
    const res = await $api.get('/api/scalefusion/devices')
    devices.value = res.data
    console.log('Fetched devices:', devices.value)
  } catch (e: any) {
    console.error('Error fetching devices:', e)
    error.value = 'Failed to load devices.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadDevices()
})
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
                <p class="text-xs text-muted mb-0">
                  All managed devices
                </p>
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
                <p class="text-xs text-muted mb-0">
                  connection_status = Online
                </p>
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
                <p class="text-xs text-muted mb-0">
                  Not online / inactive
                </p>
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

        <!-- Simple search -->
        <div class="d-flex align-items-center gap-2">
          <input
            v-model="searchTerm"
            type="text"
            class="form-control form-control-sm"
            style="max-width: 240px;"
            placeholder="Search by name / model / serial..."
          />
        </div>
      </div>

      <div class="card-body">
        <!-- Error / Loading -->
        <div v-if="error" class="alert alert-danger mb-3">
          {{ error }}
        </div>
        <div v-if="loading" class="text-center py-3">
          Loading devices...
        </div>

        <div v-if="!loading" class="table-responsive">
          <table class="table bordered-table mb-0 w-100" id="dataTable" data-page-length="10">
            <thead>
              <tr>
                <th>#</th>
                <th>Device Name</th>
                <th>Device Make</th>
                <th>Device Model</th>
                <th>OS Type</th>
                <th>OS Version</th>
                <th>Battery Status</th>
                <th>Connection State</th>
                <th>Connection Status</th>
                <th>Last Seen</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(wrapper, index) in filteredDevices"
                :key="wrapper.device?.id"
              >
                <td>{{ index + 1 }}</td>
                <td>{{ wrapper.device?.name }}</td>
                <td>{{ wrapper.device?.make }}</td>
                <td>{{ wrapper.device?.model }}</td>
                <td>{{ wrapper.device?.os_type }}</td>
                <td>{{ wrapper.device?.os_version }}</td>
                <td>{{ wrapper.device?.battery_status }} %</td>
                <td>{{ wrapper.device?.connection_state }}</td>
                <td>
                  <span
                    class="badge"
                    :class="wrapper.device?.connection_status === 'Online'
                      ? 'bg-success-soft text-success'
                      : 'bg-secondary-soft text-secondary'"
                  >
                    {{ wrapper.device?.connection_status }}
                  </span>
                </td>
                <td>
                  <!-- if you want nicer format -->
                  {{ wrapper.device?.last_seen_on }}
                </td>
                <td>
                  <NuxtLink
                    :to="`/dashboard/devices/${wrapper.device?.id}`"
                    class="btn btn-sm btn-primary"
                  >
                    View
                  </NuxtLink>
                </td>
              </tr>

              <tr v-if="!filteredDevices.length && !loading">
                <td colspan="11" class="text-center text-muted py-3">
                  No devices found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>


 