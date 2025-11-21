<script setup lang="ts">
import { onMounted } from 'vue'

const id = useParam('id');


definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()
const device = ref<any>(null)

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
 <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
                <h6 class="fw-semibold mb-0">Wizard</h6>
                <ul class="d-flex align-items-center gap-2">
                    <li class="fw-medium">
                        <a href="index.php" class="d-flex align-items-center gap-1 hover-text-primary">
                            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                            Dashboard
                        </a>
                    </li>
                    <li>-</li>
                    <li class="fw-medium">Wizard</li>
                </ul>
            </div>


             <div class="row gy-4">

<div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="mb-4 text-xl">Device Information</h6>
                            <p class="text-neutral-500">Here are the details of the device.</p>

                            <!-- Form Wizard Start -->
                            <div class="form-wizard">
                               
                                    <fieldset class="wizard-fieldset show">
                                        <h6 class="text-md text-neutral-500">Device</h6>
                                        <div class="row gy-3">
                                            <div class="col-sm-6">
                                                <label class="form-label">Model & OS</label>
                                                <div class="position-relative">
                                                    <input type="text" class="form-control wizard-required" :value="device?.model + ' - ' + device?.app_version_name + ' ' + device?.os_version" readonly   >
                                                    <div class="wizard-form-error"></div>
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <label class="form-label">Device Wifi</label>
                                                <div class="position-relative">
                                                    <input type="text" class="form-control wizard-required" :value="device?.connected_wifi_ssid" readonly >
                                                    <div class="wizard-form-error"></div>
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <label class="form-label">Device IP Address</label>
                                                <div class="position-relative">
                                                    <input type="text" class="form-control wizard-required" :value="device?.ip_address" readonly >
                                                    <div class="wizard-form-error"></div>
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <label class="form-label">Device Serial Number</label>
                                                <div class="position-relative">
                                                    <input type="text" class="form-control wizard-required" :value="device?.build_serial_no" readonly >
                                                    <div class="wizard-form-error"></div>
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <label class="form-label">Device App Version</label>
                                                <div class="position-relative">
                                                    <input type="text" class="form-control wizard-required" :value="device?.app_version_name" readonly >
                                                    <div class="wizard-form-error"></div>
                                                </div>
                                            </div>


                                            <div class="col-sm-6">
                                                <label class="form-label">Device IMEI</label>
                                                <div class="position-relative">
                                                    <input type="text" class="form-control wizard-required" :value="device?.imei_no" readonly >
                                                    <div class="wizard-form-error"></div>
                                                </div>
                                            </div>
                                            
                                        </div>
                                    </fieldset>

                                  
                           
                            </div>
                            <!-- Form Wizard End -->
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="mb-4 text-xl">Device Location</h6>
                            <p class="text-neutral-500">Currenct Device Location</p>

                            <!-- Form Wizard Start -->
                            <div class="form-wizard">
                                <DeviceLocationMap
            v-if="device?.location"
            :lat="device.location.lat"
            :lng="device.location.lng"
            :address="device.location.address"
          />
                            </div>
                            <!-- Form Wizard End -->
                        </div>
                    </div>
                </div>



             </div>




</div>

 

</template>