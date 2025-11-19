import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuthStore()

  // ⛔️ On the server we can't read localStorage, so don't decide here.
  if (import.meta.server) {
    return
  }

  // On first client navigation, try to restore user from token
  if (!auth.user && !auth.token) {
    await auth.fetchUser()
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/')
  }
})
