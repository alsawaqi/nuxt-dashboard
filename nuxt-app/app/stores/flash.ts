import { defineStore } from 'pinia'

interface FlashState {
  visible: boolean
  title: string | null
  subtitle: string | null
}

export const useFlashStore = defineStore('flash', {
  state: (): FlashState => ({
    visible: false,
    title: null,
    subtitle: null,
  }),

  actions: {
    showWelcome(name: string, redirectTo: string = '/dashboard', duration = 2200) {
      this.title = `Welcome, ${name}!`
      this.subtitle = 'Loading your dashboard...'
      this.visible = true

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          this.visible = false
          // 👇 hard redirect as you requested
          window.location.href = redirectTo
        }, duration)
      }
    },

    hide() {
      this.visible = false
    },
  },
})
