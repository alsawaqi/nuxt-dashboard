<script lang="ts" setup>
import { on } from 'events'
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})


 

const loading = ref(true)
const error = ref<string | null>(null)
 
const transactions = ref<any>([])
const transacationShares = ref<any>([])

const showModal = ref(false)

const openModal = (shares: any) => {
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
    const { $api } = useNuxtApp()
    const { data } = await $api.get('/api/donations')

    transactions.value = data.data

  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load charity stats.'
  } finally {
    loading.value = false
  }



}


onMounted(async() => {
 await loadTransactions()
})


</script>



<template>


  <div class="dashboard-main-body">

            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
                <h6 class="fw-semibold mb-0">Charity Dashboard</h6>
                <ul class="d-flex align-items-center gap-2">
                    <li class="fw-medium">
                        <NuxtLink to="/dashboard" class="d-flex align-items-center gap-1 hover-text-primary">
                            <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                            Dashboard
                        </NuxtLink>
                    </li>
                    <li>-</li>
                    <li class="fw-medium">Charity Dashboard</li>
                </ul>
            </div>

            <div class="card basic-data-table">
                <div class="card-header">
                    <h5 class="card-title mb-0">Charity Dashboard</h5>
                </div>
                <div class="card-body">
                    <table class="table bordered-table mb-0" id="dataTable" data-page-length='10'>
                        <thead>
                            <tr>
                        <th scope="col">#</th>
                        <th scope="col">Device Name</th>
                        <th scope="col">Bank</th>
                        <th scope="col">Card Type</th>
                        <th scope="col">Card Number</th>
                        <th scope="col">Amount</th>
                        <th scope="col" class="text-center">Locations</th>
                         <th scope="col">Date</th>
                        <th scope="col">Commissions</th>
                       
                      </tr>
                        </thead>

                        
                        <tbody>
                           <tr v-for="(transaction, index) in transactions" :key="transaction.id">

                       
                        <td>
                          {{ index + 1 }}  
                        </td>
                        <td>{{ transaction.device?.devicemodel?.name }}</td>
                        <td>{{ transaction.bank?.name }}</td>
                        <td>{{ transaction.bank_response?.sessionData?.issuer }}</td>
                        <td>{{ transaction.bank_response?.sessionData?.binId }} XX {{ transaction.bank_response?.sessionData?.panId }}</td>
                        <td>{{ transaction.total_amount }} OMR</td>
                        <td class="text-center">
                          {{ transaction.charity_location?.name }}
                        </td>
                        <td>{{ new Date(transaction.created_at).toLocaleDateString() }}</td>
                        <td>  <button
      type="button"
      class="btn btn-primary"
      @click="openModal(transaction.charitytransactionshares)"
    >
      Show Breackdown
    </button></td>
                      </tr>
                          
                        </tbody>
                    </table>
                </div>
            </div>
        </div>



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
            <h5 class="modal-title">Commissions Break Down</h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="closeModal"
            ></button>
          </div>
          <div class="modal-body">
              <p v-for="transacationShare in transacationShares" :key="transacationShare.id">{{ transacationShare.comission_profile_share?.organization?.name }} : {{ transacationShare.amount }} OMR</p>
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