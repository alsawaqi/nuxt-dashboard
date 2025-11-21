<script lang="ts" setup>
import { onMounted,ref } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth' as any,
})


 

const text = ref('Hello Abdallah, this is OpenAI text to speech from Nuxt TypeScript.')
const loading = ref(false)
const error = ref('')

 const speak = async () => {
  if (!text.value.trim()) return

  loading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.value })
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      throw new Error(errBody.message || 'TTS API failed')
    }

    const arrayBuffer = await response.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)

    const audio = new Audio(url)
    await audio.play()
  } catch (e: any) {
    console.error(e)
    error.value = e?.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}

</script>



<template>

  <div class="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
    <h1 class="text-2xl font-semibold">OpenAI TTS Test</h1>

    <textarea
      v-model="text"
      class="border rounded w-full max-w-xl p-2 h-32"
      placeholder="Type something for TTS..."
    ></textarea>

    <button
      @click="speak"
      :disabled="loading"
      class="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
    >
      {{ loading ? 'Generating audio...' : 'Speak' }}
    </button>

    <p v-if="error" class="text-red-500 text-sm">
      {{ error }}
    </p>
  </div>


</template>