// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  
  modules: ['@pinia/nuxt'],

  typescript: {
    strict: true,
    typeCheck: true,
  },

  components: true,
  app: {
    head: {
      link: [
        // Icon / fonts / vendor css
        { rel: "stylesheet", href: "/assets/css/remixicon.css" },
        { rel: "stylesheet", href: "/assets/css/lib/bootstrap.min.css" },
        { rel: "stylesheet", href: "/assets/css/lib/apexcharts.css" },
        { rel: "stylesheet", href: "/assets/css/lib/dataTables.min.css" },
        { rel: "stylesheet", href: "/assets/css/lib/editor-katex.min.css" },
        {
          rel: "stylesheet",
          href: "/assets/css/lib/editor.atom-one-dark.min.css",
        },
        { rel: "stylesheet", href: "/assets/css/lib/editor.quill.snow.css" },
        { rel: "stylesheet", href: "/assets/css/lib/flatpickr.min.css" },
        { rel: "stylesheet", href: "/assets/css/lib/full-calendar.css" },
        {
          rel: "stylesheet",
          href: "/assets/css/lib/jquery-jvectormap-2.0.5.css",
        },
        { rel: "stylesheet", href: "/assets/css/lib/magnific-popup.css" },
        { rel: "stylesheet", href: "/assets/css/lib/slick.css" },
        { rel: "stylesheet", href: "/assets/css/lib/prism.css" },
        { rel: "stylesheet", href: "/assets/css/lib/file-upload.css" },
        { rel: "stylesheet", href: "/assets/css/lib/audioplayer.css" },

        // main theme css (must be last to override others)
        { rel: "stylesheet", href: "/assets/css/style.css" },
      ],
    },
  },

  imports: {
    autoImport: true,
  },
  css: [],
  runtimeConfig: {
    OPENAI_API_KEY:  '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',   
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8082",
      googleMapsApiKey: 'AIzaSyAUsVUylnMMQBHW7_gN5pvKhwVtpnnqB-c',
    },
  },

  vite: {},
  build: {},
});



