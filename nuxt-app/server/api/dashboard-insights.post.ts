// server/api/dashboard-insights.post.ts
import OpenAI from 'openai'
import { defineEventHandler, readBody, createError } from 'h3'

const client = new OpenAI({
  apiKey: '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                                                        ',
})

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    data?: any
  }>(event)

  const data = body?.data

  if (!data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing "data" payload for dashboard insights',
    })
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini', // or gpt-4o-mini if you prefer
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
You are an AI data analyst for a charity donation dashboard (POS kiosks in Oman).

You will receive:
- A JSON object that includes "charity.summary", "charity.transactions",
  "charity.by_devices", "charity.by_bank", "charity.by_country",
  "charity.by_region", "charity.by_city", "charity.by_charity_location",
  and "charity.daily_totals".

You MUST return a JSON object ONLY (no prose) with this exact shape:

{
  "overview": "Short paragraph summary of this period.",
  "key_highlights": ["bullet 1", "bullet 2", ...],
  "trends": ["trend 1", "trend 2", ...],
  "locations": ["insight about locations", ...],
  "devices": ["insight about devices", ...],
  "banks": ["insight about banks", ...],
  "risks": ["risk or anomaly", ...],
  "recommendations": ["actionable recommendation 1", ...],
  "suggested_questions": ["question 1", "question 2", ...]
}

- "overview" should be 2–4 sentences maximum.
- Each array should have 1–5 items, short and clear.
- Focus on what is most important for a charity manager or ministry official.
- Use Omani context where relevant (e.g. refer to branches or locations in Muscat, etc.) if visible in data.
        `.trim(),
        },
        {
          role: 'user',
          content:
            'Here is the dashboard JSON for the selected period:\n```json\n' +
            JSON.stringify(data) +
            '\n```',
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content

    if (!raw) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Empty AI response',
      })
    }

    let insights
    try {
      insights = JSON.parse(raw)
    } catch (err) {
      console.error('Failed to parse AI JSON:', raw)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to parse AI JSON response',
      })
    }

    return {
      success: true,
      insights,
    }
  } catch (error: any) {
    console.error('dashboard-insights error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'AI insights generation failed',
    })
  }
})
