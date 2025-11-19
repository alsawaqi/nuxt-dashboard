import { defineNuxtRouteMiddleware, navigateTo, useCookie } from '#imports'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuthStore()
  const tokenCookie = useCookie<string | null>('auth_token')

  // 🔹 SERVER SIDE: if there is a token cookie, assume logged in and redirect immediately
  if (import.meta.server) {
    if (tokenCookie.value) {
      return navigateTo('/dashboard')
    }
    return
  }

  // 🔹 CLIENT SIDE: hydrate store token if needed
  if (!auth.token) {
    if (tokenCookie.value) {
      auth.token = tokenCookie.value
    } else {
      const stored = localStorage.getItem('auth_token')
      if (stored) {
        auth.token = stored
      }
    }
  }

  // If we have a token but no user, fetch user data
  if (!auth.user && auth.token) {
    await auth.fetchUser()
  }

  // Finally, if authenticated → go to dashboard
  if (auth.isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
