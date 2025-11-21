// server/api/analyze.post.ts
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = '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'

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_API_KEY is not configured on the server',
    })
  }

  const body = await readBody<{
    data: any
    question: string
  }>(event)

  const { data, question } = body || {}

  if (!data || !question) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Both "data" and "question" are required',
    })
  }

  // Build a clear prompt for the model
  const userContent = `
You are a data analyst. I will give you a JSON object and a question.

JSON data:
${JSON.stringify(data, null, 2)}

Question:
${question}

Instructions:
- Answer ONLY based on the JSON data above.
- Be concise and structured.
- If a graph would help, suggest the graph type and which fields to put on axes.
`.trim()

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // cheaper & fast, you can use 'gpt-4o' too
      messages: [
        {
          role: 'system',
          content: 'You are a helpful data analyst assistant.',
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
    }),
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    console.error('OpenAI analyze error:', errText)
    throw createError({
      statusCode: 500,
      statusMessage: `OpenAI analyze failed: ${errText}`,
    })
  }

  const json = await openaiRes.json()

  const answer =
    json?.choices?.[0]?.message?.content ??
    'No answer generated from the model.'

  // Return a simple JSON structure to the frontend
  return { answer }
})
