<script setup lang="ts">
definePageMeta({
  middleware: ['guest'],
})

const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const password_confirmation = ref('')
const error = ref<string | null>(null)

const onSubmit = async () => {
  error.value = null
  try {
    await auth.register({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: password_confirmation.value,
    })
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = 'Registration failed'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <form class="w-full max-w-sm space-y-4" @submit.prevent="onSubmit">
      <h1 class="text-2xl font-bold mb-2">Register</h1>

      <div>
        <label class="block text-sm mb-1">Name</label>
        <input v-model="name" type="text" class="border rounded w-full px-3 py-2" required />
      </div>

      <div>
        <label class="block text-sm mb-1">Email</label>
        <input v-model="email" type="email" class="border rounded w-full px-3 py-2" required />
      </div>

      <div>
        <label class="block text-sm mb-1">Password</label>
        <input v-model="password" type="password" class="border rounded w-full px-3 py-2" required />
      </div>

      <div>
        <label class="block text-sm mb-1">Confirm Password</label>
        <input
          v-model="password_confirmation"
          type="password"
          class="border rounded w-full px-3 py-2"
          required
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

      <button
        class="w-full py-2 rounded bg-green-600 text-white disabled:opacity-50"
        :disabled="auth.loading"
      >
        {{ auth.loading ? 'Registering...' : 'Register' }}
      </button>

      <p class="text-sm mt-2">
        Already have an account?
        <NuxtLink to="/login" class="text-blue-600 underline">Login</NuxtLink>
      </p>
    </form>
  </div>
</template>
