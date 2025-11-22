 /// <reference types="google.maps" />

import { defineNuxtPlugin, useRuntimeConfig } from '#app'

declare global {
  interface Window {
    google?: typeof google
    _googleMapsInitPromise?: Promise<typeof google>
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiKey = 'AIzaSyDD4SADkRQxxbqZ91naHRuO4akPQaPnKaw'

  const loadGoogle = async (): Promise<typeof google> => {
    if (typeof window === 'undefined') {
      throw new Error('Google Maps can only be used in the browser')
    }

    // Already loaded
    if (window.google?.maps) {
      return window.google
    }

    // Reuse existing promise if already loading
    if (window._googleMapsInitPromise) {
      return window._googleMapsInitPromise
    }

    // Start loading script
    window._googleMapsInitPromise = new Promise<typeof google>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=visualization`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google)
        } else {
          reject(new Error('Google Maps did not initialize correctly'))
        }
      }
      script.onerror = () => reject(new Error('Failed to load Google Maps script'))
      document.head.appendChild(script)
    })

    return window._googleMapsInitPromise
  }

  return {
    provide: {
      // 👉 $google will be a FUNCTION that returns a Promise<typeof google>
      google: loadGoogle,
    },
  }
})

declare module '#app' {
  interface NuxtApp {
    $google: () => Promise<typeof google>;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $google: () => Promise<typeof google>;
  }
}
