 import axios, { type AxiosInstance } from 'axios'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const instance = axios.create({
    baseURL: config.public.apiBase as string,
  })

  instance.interceptors.request.use((cfg) => {
    NProgress.start()

    if (import.meta.client) {
      const token = localStorage.getItem('auth_token') // or 'token', but be consistent
      if (token) {
        cfg.headers = cfg.headers || {}
        cfg.headers.Authorization = `Bearer ${token}`
      }
    }

    return cfg
  })

  instance.interceptors.response.use(
    (response) => {
      NProgress.done()
      return response
    },
    (error) => {
      NProgress.done()

      if (import.meta.client) {
        // if (error.response?.status === 401) {
        //   // Token invalid/expired → clear & redirect
        //   localStorage.removeItem('auth_token')
        //   window.location.href = '/'
        // }
      }

      return Promise.reject(error)
    }
  )

  return {
    provide: {
      api: instance,
    },
  }
})

// Type helpers
declare module '#app' {
  interface NuxtApp {
    $api: AxiosInstance;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: AxiosInstance;
  }
}
