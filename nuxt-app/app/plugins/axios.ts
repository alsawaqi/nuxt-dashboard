import axios from 'axios'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const instance = axios.create({
    baseURL: config.public.apiBase as string,
    withCredentials: true, // Send cookies like XSRF-TOKEN
  })

  // Helper to read a cookie value
  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? match[2] ?? null : null
  }

  // 🔹 Add progress start on request
  instance.interceptors.request.use((config) => {
    NProgress.start()

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (import.meta.client) {
      const csrfToken = getCookie('XSRF-TOKEN')
      if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken)
      }
    }

    return config
  })

  // 🔹 Stop progress on response or error
  instance.interceptors.response.use(
    response => {
      NProgress.done()
      return response
    },
    error => {
      NProgress.done()

      if (error.response?.status === 401 || error.response?.status === 419) {
        localStorage.clear()
        window.location.href = '/'
      } else if (error.response?.status === 403) {
        window.location.href = '/admin'
      }

      return Promise.reject(error)
    }
  )

  return {
    provide: {
      axios: instance
    }
  }
})
