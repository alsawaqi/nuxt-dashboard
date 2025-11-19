import { defineStore } from 'pinia'
import { useCookie } from '#imports'

interface User {
  id: number
  name: string
  email: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },

  actions: {
    async login(email: string, password: string) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const { data } = await $api.post('/api/auth/login', { email, password })

        this.token = data.token
        this.user = data.user

        // persist in localStorage (client) – optional but fine
        if (import.meta.client && this.token) {
          localStorage.setItem('auth_token', this.token)
        }

        // ✅ also persist in a cookie so SSR can see it
        const tokenCookie = useCookie<string | null>('auth_token', {
          sameSite: 'lax',
          path: '/',
        })
        tokenCookie.value = this.token
      } finally {
        this.loading = false
      }
    },

    async register(payload: { name: string; email: string; password: string; password_confirmation: string }) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const { data } = await $api.post('/api/auth/register', payload)

        this.token = data.token
        this.user = data.user

        if (import.meta.client && this.token) {
          localStorage.setItem('auth_token', this.token)
        }

        const tokenCookie = useCookie<string | null>('auth_token', {
          sameSite: 'lax',
          path: '/',
        })
        tokenCookie.value = this.token
      } finally {
        this.loading = false
      }
    },

    async fetchUser() {
      // If no token in store yet, try to hydrate from cookie/localStorage
      const tokenCookie = useCookie<string | null>('auth_token')

      if (!this.token) {
        if (tokenCookie.value) {
          this.token = tokenCookie.value
        } else if (import.meta.client) {
          const stored = localStorage.getItem('auth_token')
          if (stored) {
            this.token = stored
          } else {
            return
          }
        } else {
          // no token on server, nothing to do
          return
        }
      }

      const { $api } = useNuxtApp()
      try {
        const { data } = await $api.get('/api/auth/me')
        this.user = data.user
      } catch (e) {
        this.logout()
      }
    },

    async logout() {
      try {
        if (this.token) {
          const { $api } = useNuxtApp()
          await $api.post('/api/auth/logout')
        }
      } catch (e) {
        // ignore
      } finally {
        this.token = null
        this.user = null

        if (import.meta.client) {
          localStorage.removeItem('auth_token')
        }

        const tokenCookie = useCookie<string | null>('auth_token', {
          path: '/',
        })
        tokenCookie.value = null
      }
    },
  },
})
