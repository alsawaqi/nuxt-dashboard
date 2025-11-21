<script lang="ts" setup>
import { on } from 'events';
import { onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})

const { $api } = useNuxtApp()

const devices = ref<any>([])


onMounted(async() => {
 try {
    const res = await $api.get('/api/scalefusion/devices')
      devices.value = res.data
    console.log('Fetched dashboard metrics:', devices)

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
  }

})

</script>



<template>


 <div class="dashboard-main-body">
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




             <div class="card basic-data-table">
                <div class="card-header">
                    <h5 class="card-title mb-0">Devices</h5>
                </div>
                <div class="card-body">

                  <table class="table bordered-table mb-0" id="dataTable" data-page-length='10'>
                        <thead>
                            <tr>
                        <th scope="col">#</th>
                         <th scope="col">Device Name</th>
                        <th scope="col">Device Make</th>
                        <th scope="col">Device Model</th>
                        <th scope="col">OS Type</th>
                        <th scope="col">OS Version</th>
                        <th scope="col">Battery Status</th>
                        <th scope="col">Connection State</th>
                        <th scope="col">Connection Status</th>
                        <th scope="col">Last Seen</th>
                        <th scope="col">View</th>

                      
                       
                      </tr>
                        </thead>

                        <tbody>

                   

                            <tr v-for="device in devices.devices">

                              <td>{{ device.device?.id }}</td>
                              <td>{{ device.device?.name }}</td>
                              <td>{{ device.device?.make }}</td>
                              <td>{{ device.device?.model }}</td>
                              <td>{{ device.device?.os_type }}</td>
                              <td>{{ device.device?.os_version }}</td>
                              <td>{{ device.device?.battery_status }} %</td>
                              <td>{{ device.device?.connection_state }}</td>
                              <td>{{ device.device?.connection_status }}</td>
                              <td>{{ device.device?.last_seen_on }}</td>
                              <td>  
                                
                                <NuxtLink :to="`/dashboard/devices/${device.device?.id}`" class="btn btn-sm btn-primary">
                                  View
                                </NuxtLink>
                              
                              </td>
                              


                            </tr> 

                            



                        </tbody>

 
                      </table>


                  </div>

                  </div>

                  




 </div>


</template>