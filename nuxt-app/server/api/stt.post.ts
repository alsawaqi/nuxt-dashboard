 // server/api/stt.post.ts
import type { H3Event } from 'h3'
import { getHeader, readRawBody } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const apiKey = config.OPENAI_API_KEY

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_API_KEY is not configured on the server'
    })
  }

  const contentType = getHeader(event, 'content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Content-Type must be multipart/form-data'
    })
  }

  // 👇 Read the raw body as Buffer instead of streaming the request directly
  const rawBody = await readRawBody(event) // returns Buffer

  const openAiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': contentType // keep original boundary from client
    },
    body: rawBody as any // Buffer is fine here
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
  // OpenAI returns { text: "..." }
  return data
})
