// server/api/stt.post.ts
import type { H3Event } from 'h3'
import { readRawBody } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const apiKey = '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'

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_API_KEY is not configured on the server'
    })
  }

  // Read raw audio bytes sent from browser (audio/webm)
  const rawBody = await readRawBody(event)

  if (!rawBody || rawBody.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No audio received'
    })
  }

  // Build multipart/form-data for OpenAI using Node's FormData & Blob
  const form = new FormData()
  const blob = new Blob([Buffer.from(rawBody)], { type: 'audio/webm' })

  form.append('file', blob, 'audio.webm')
  // Use whisper-1 (very tolerant with formats, supports webm)
  form.append('model', 'whisper-1')

  const openAiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
      // Don't set Content-Type manually – fetch will set correct boundary
    },
    body: form as any
  })

  if (!openAiRes.ok) {
    const errText = await openAiRes.text()
    console.error('OpenAI STT error:', errText)
    throw createError({
      statusCode: 500,
      statusMessage: `OpenAI STT request failed: ${errText}`
    })
  }

  const data = await openAiRes.json()
  // { text: "..." }
  return data
})
