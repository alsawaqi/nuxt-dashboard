<script setup lang="ts">
import { onMounted } from 'vue'

const id = useParam('id');


definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()
const device = ref<any>(null)


 
const url = `https://app.scalefusion.com/cloud/dashboard/remote_mirror/${id}`

const open = () => window.open(url, '_blank', 'noopener,noreferrer')


const RebootDevice = async () => {
  try {
    await $api.post('/api/scalefusion/device/reboot', {
      device_id: id,
    })
    alert('Reboot command sent successfully.')
  } catch (error) {
    console.error('Error sending reboot command:', error)
    alert('Failed to send reboot command.')
  }
}


const sendAlarm = async () => {
  try {
    await $api.post('/api/scalefusion/device/alarm', {
      device_id: id,
    })
    alert('Alarm command sent successfully.')
  } catch (error) {
    console.error('Error sending alarm command:', error)
    alert('Failed to send alarm command.')
  }
}


onMounted(async () => {
  try {
    const res = await $api.get('/api/scalefusion/device',{params: { device_id: id }})
       
    device.value =  res.data
     
  } catch (error) {
    console.error('Error fetching device:', error)
  }
})

</script>

 <template>
  <div class="dashboard-main-body">
    <!-- Page Header -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
      <div>
        <h6 class="fw-semibold mb-1">Device Wizard</h6>
        <p class="text-muted mb-0 small">
          Review device details, manage actions, and view current location.
        </p>
      </div>
      <ul class="d-flex align-items-center gap-2 mb-0">
        <li class="fw-medium">
          <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
            Dashboard
          </NuxtLink>
        </li>
        <li>-</li>
        <li class="fw-medium text-muted">Device Wizard</li>
      </ul>
    </div>

    <div class="row gy-4">
      <!-- Left column: Device information -->
      <div class="col-xxl-6 col-xl-6 col-lg-12">
        <div class="card h-100 shadow-sm border-0 radius-16">
          <div class="card-body p-24">
            <!-- Card header with device name + actions -->
            <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-20">
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <iconify-icon
                    icon="mdi:tablet-cellphone"
                    class="text-primary text-2xl"
                  ></iconify-icon>
                  <h6 class="mb-0 text-lg">
                    {{ device?.name || 'Device Information' }}
                  </h6>
                </div>
                <div class="d-flex flex-wrap align-items-center gap-2 mt-1">
                  <!-- Connection status badge -->
                  <span
                    v-if="device?.connection_status"
                    class="badge rounded-pill px-3 py-1 text-xs"
                    :class="device.connection_status === 'Online'
                      ? 'bg-success-soft text-success'
                      : 'bg-danger-soft text-danger'"
                  >
                    <iconify-icon
                      :icon="device.connection_status === 'Online'
                        ? 'mdi:check-circle-outline'
                        : 'mdi:alert-circle-outline'"
                      class="me-1"
                    ></iconify-icon>
                    {{ device.connection_status }}
                  </span>

                  <!-- Device status badge -->
                  <span
                    v-if="device?.device_status"
                    class="badge rounded-pill px-3 py-1 text-xs bg-primary-soft text-primary"
                  >
                    {{ device.device_status }}
                  </span>

                  <!-- Battery badge -->
                  <span
                    v-if="device?.battery_status !== undefined"
                    class="badge rounded-pill px-3 py-1 text-xs bg-warning-soft text-warning d-inline-flex align-items-center gap-1"
                  >
                    <iconify-icon icon="mdi:battery" class="text-sm"></iconify-icon>
                    {{ device.battery_status }}%
                    <span v-if="device.battery_charging" class="ms-1">(Charging)</span>
                  </span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                  @click="RebootDevice"
                >
                  <iconify-icon icon="mdi:restart" class="text-sm"></iconify-icon>
                  <span>Reboot</span>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                  @click="sendAlarm"
                >
                  <iconify-icon icon="mdi:bell-ring-outline" class="text-sm"></iconify-icon>
                  <span>Send Alarm</span>
                </button>
              </div>
            </div>

            <hr class="mb-20 mt-0" />

            <!-- Device details grid -->
            <div class="form-wizard">
              <fieldset class="wizard-fieldset show border-0 p-0">
                <h6 class="text-md text-muted mb-3">Technical Details</h6>

                <div class="row gy-3">
                  <div class="col-sm-6">
                    <label class="form-label text-xs text-muted mb-1">Model &amp; OS</label>
                    <div class="position-relative">
                      <input
                        type="text"
                        class="form-control bg-light-subtle border-0"
                        :value="device ? `${device.model} · ${device.app_version_name} · Android ${device.os_version}` : ''"
                        readonly
                      />
                    </div>
                  </div>

                  <div class="col-sm-6">
                    <label class="form-label text-xs text-muted mb-1">Connected Wi-Fi</label>
                    <div class="position-relative">
                      <input
                        type="text"
                        class="form-control bg-light-subtle border-0"
                        :value="device?.connected_wifi_ssid || 'Not available'"
                        readonly
                      />
                    </div>
                  </div>

                  <div class="col-sm-6">
                    <label class="form-label text-xs text-muted mb-1">IP Address</label>
                    <div class="position-relative">
                      <input
                        type="text"
                        class="form-control bg-light-subtle border-0"
                        :value="device?.ip_address || 'Not available'"
                        readonly
                      />
                    </div>
                  </div>

                  <div class="col-sm-6">
                    <label class="form-label text-xs text-muted mb-1">Serial Number</label>
                    <div class="position-relative">
                      <input
                        type="text"
                        class="form-control bg-light-subtle border-0"
                        :value="device?.build_serial_no || device?.serial_no || ''"
                        readonly
                      />
                    </div>
                  </div>

                  <div class="col-sm-6">
                    <label class="form-label text-xs text-muted mb-1">App Version</label>
                    <div class="position-relative">
                      <input
                        type="text"
                        class="form-control bg-light-subtle border-0"
                        :value="device?.app_version_name || ''"
                        readonly
                      />
                    </div>
                  </div>

                  <div class="col-sm-6">
                    <label class="form-label text-xs text-muted mb-1">IMEI</label>
                    <div class="position-relative">
                      <input
                        type="text"
                        class="form-control bg-light-subtle border-0"
                        :value="device?.imei_no || ''"
                        readonly
                      />
                    </div>
                  </div>
                </div>

                <!-- Last seen info -->
                <div class="mt-4 d-flex align-items-center gap-2 text-xs text-muted">
                  <iconify-icon icon="mdi:clock-outline" class="text-sm"></iconify-icon>
                  <span>
                    Last seen:
                    <strong>{{ device?.last_seen_on || 'N/A' }}</strong>
                  </span>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column: Location -->
      <div class="col-xxl-6 col-xl-6 col-lg-12">
        <div class="card h-100 shadow-sm border-0 radius-16">
          <div class="card-body p-24">
            <div class="d-flex align-items-start justify-content-between mb-16">
              <div>
                <h6 class="mb-1 text-lg">Device Location</h6>
                <p class="text-muted mb-0 small">
                  Current reported location from Scalefusion (approximate).
                </p>
              </div>
              <span
                v-if="device?.location?.date_time"
                class="badge bg-light text-xs text-muted fw-normal"
              >
                Updated at: {{ device.location.created_at }}
              </span>
            </div>

            <div class="mb-3">
              <label class="form-label text-xs text-muted mb-1">Address</label>
              <div class="d-flex align-items-start gap-2">
                <iconify-icon
                  icon="mdi:map-marker-outline"
                  class="text-danger text-lg mt-1"
                ></iconify-icon>
                <p class="mb-0 text-sm">
                  {{ device?.location?.address || 'No location address available.' }}
                </p>
              </div>
            </div>

            <div class="form-wizard">
              <div class="rounded-3 overflow-hidden border bg-light-subtle">
                <DeviceLocationMap
                  v-if="device?.location"
                  :lat="device.location.lat"
                  :lng="device.location.lng"
                  :address="device.location.address"
                />
                <div
                  v-else
                  class="d-flex align-items-center justify-content-center py-40 text-muted small"
                >
                  No location data available for this device.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div class="col-lg-12">


         <button class="btn btn-primary" @click="open">
    Open Scalefusion Remote Mirror
  </button>

      </div>
    </div>
  </div>
</template>
