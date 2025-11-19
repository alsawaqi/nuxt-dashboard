import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // Configure the appearance
  NProgress.configure({ showSpinner: false })

  // Router page navigation
  nuxtApp.hook('page:start', () => {
    NProgress.start()
  })

  nuxtApp.hook('page:finish', () => {
    NProgress.done()
  })
})
