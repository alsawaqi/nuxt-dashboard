 // server/api/tts.post.ts
import { H3Event, readBody } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const apiKey = config.OPENAI_API_KEY

  if (!apiKey) {
    // This means env/config problem
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_API_KEY is not configured on the server'
    })
  }

  const body = await readBody<{ text?: string }>(event)
  const inputText = body?.text?.trim()

  if (!inputText) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Text is required'
    })
  }

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: inputText,
      format: 'mp3'
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('OpenAI TTS error:', errText)

    // Send error text back so the browser can show it
    throw createError({
      statusCode: 500,
      statusMessage: `OpenAI TTS request failed: ${errText}`
    })
  }

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  event.node.res.setHeader('Content-Type', 'audio/mpeg')
  event.node.res.setHeader('Content-Length', buffer.length.toString())

  return buffer
})
