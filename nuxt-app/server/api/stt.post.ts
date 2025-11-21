 // server/api/stt.post.ts
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = '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'

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_API_KEY is not configured on the server',
    })
  }

  const contentType = event.node.req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Content-Type must be multipart/form-data',
    })
  }

  // 🔴 IMPORTANT for Node: when streaming a request body, undici requires duplex: 'half'
  const openAiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': contentType,
    },
    // stream the original multipart body directly
    body: event.node.req as any,
    // @ts-expect-error duplex is required by undici in Node
    duplex: 'half',
  })

  if (!openAiRes.ok) {
    const errText = await openAiRes.text()
    console.error('OpenAI STT error:', errText)
    throw createError({
      statusCode: 500,
      statusMessage: `OpenAI STT request failed: ${errText}`,
    })
  }

  const data = await openAiRes.json()
  // docs: the response is JSON with at least { text: "..." }
  return data
})
