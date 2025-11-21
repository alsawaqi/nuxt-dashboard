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

  // Read raw audio bytes sent from browser
  const rawBody = await readRawBody(event)

  if (!rawBody || rawBody.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No audio received'
    })
  }

  // Get content type from request headers
  const contentType = event.node.req.headers['content-type'] || 'audio/webm'
  
  // Determine file extension based on content type
  let extension = 'webm'
  if (contentType.includes('audio/ogg')) {
    extension = 'ogg'
  } else if (contentType.includes('audio/wav')) {
    extension = 'wav'
  } else if (contentType.includes('audio/mp3')) {
    extension = 'mp3'
  }

  console.log('Received audio:', {
    contentType,
    extension,
    size: rawBody.length
  })

  try {
    // Create a proper File object (not just Blob) with the correct extension
    const file = new File(
      [Buffer.from(rawBody)], 
      `audio.${extension}`,
      { type: contentType }
    )

    // Build multipart/form-data for OpenAI
    const form = new FormData()
    form.append('file', file)
    form.append('model', 'whisper-1')
    form.append('response_format', 'json')
    // Optional: add language hint if you know it (improves accuracy)
    // form.append('language', 'en')

    const openAiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
        // Don't set Content-Type - fetch will set it with proper boundary
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
    console.log('Transcription successful:', data)
    return data
  } catch (err: any) {
    console.error('Error processing audio:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to process audio'
    })
  }
})