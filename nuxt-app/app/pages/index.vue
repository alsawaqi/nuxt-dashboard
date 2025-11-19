<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useFlashStore } from '~/stores/flash'

definePageMeta({
  middleware: 'guest' as any,
})

const auth = useAuthStore()
const flash = useFlashStore()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref<boolean>(false)

const onSubmit = async () => {
  error.value = null
  loading.value = true
  try {
    await auth.login(email.value, password.value)

    const name = auth.user?.name || 'User'

    // no need for await, but it's okay if you leave it
    flash.showWelcome(name, '/dashboard', 2200)
  } catch (e: any) {
    error.value = 'Invalid credentials'
  } finally {
    loading.value = false
  }
}
</script>


<template>
  <section class="auth bg-base d-flex flex-wrap">
    <div class="auth-left d-lg-block d-none">
      <div class="d-flex align-items-center flex-column h-100 justify-content-center">
        <img src="https://t4.ftcdn.net/jpg/03/20/40/93/360_F_320409321_niyM6DAO166WLJuEX8EOXCMvWwKSWDfA.jpg" alt="">
      </div>
    </div>
    <div class="auth-right py-32 px-24 d-flex flex-column justify-content-center">
      <div class="max-w-464-px mx-auto w-100">
        <div>
          
            <img src="/logos.png" alt="">
         
          <h4 class="mb-12">Sign In to your Account</h4>
          <p class="mb-32 text-secondary-light text-lg">Welcome back! please enter your detail</p>
        </div>
        <form @submit.prevent="onSubmit">
          <div class="icon-field mb-16">
            <span class="icon top-50 translate-middle-y">
              <iconify-icon icon="mage:email"></iconify-icon>
            </span>
            <input type="email" class="form-control h-56-px bg-neutral-50 radius-12" placeholder="Email"
              v-model="email">
          </div>
          <div class="position-relative mb-20">
            <div class="icon-field">
              <span class="icon top-50 translate-middle-y">
                <iconify-icon icon="solar:lock-password-outline"></iconify-icon>
              </span>
              <input type="password" class="form-control h-56-px bg-neutral-50 radius-12" id="your-password"
                placeholder="Password" v-model="password">
            </div>
            <span
              class="toggle-password ri-eye-line cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light"
              data-toggle="#your-password"></span>
          </div>
          <div class="">
            <div class="d-flex justify-content-between gap-2">
              <div class="form-check style-check d-flex align-items-center">
                <input class="form-check-input border border-neutral-300" type="checkbox" value="" id="remeber">
                <label class="form-check-label" for="remeber">Remember me </label>
              </div>
              <a href="javascript:void(0)" class="text-primary-600 fw-medium">Forgot Password?</a>
            </div>
          </div>

          <button type="submit" class="btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32"
            :disabled="loading">

            {{ loading ? 'Signing In...' : 'Sign In' }}



          </button>





        </form>
      </div>
    </div>
  </section>
</template>
