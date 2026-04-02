import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const SYSTEM_PROMPT = `You are a senior investment analyst at a PE firm focused on premium hospitality.
Write a concise investment memo (120-150 words) in IC-ready language.
Use third person. No bullet points. No markdown.
Tone: precise, confident, measured. Like a Goldman MD writing to the IC.
Structure: opening thesis sentence, key strengths, key risks, closing recommendation.
Reference specific numbers from the data provided.`

export async function POST(request: NextRequest) {
  try {
    const { deal, scores } = await request.json()

    if (!deal || !scores) {
      return NextResponse.json({ error: 'Missing deal or scores data' }, { status: 400 })
    }

    const prompt = `Generate an investment memo for this deal:

DEAL: ${deal.name}
Cuisine: ${deal.cuisine} | Revenue: $${deal.revenue_M}M | EBITDA margin: ${deal.ebitda_margin_pct}%
Prime cost: ${deal.prime_cost_pct}% | Avg check: $${deal.avg_check} | Locations: ${deal.locations} | Cities: ${deal.cities}
FDI: ${scores.fdi_v2.declared} declared → ${scores.fdi_v2.adjusted} adjusted | Readiness: ${deal.readiness}
Tech: ${deal.tech_status} | Lease: ${deal.lease_cost_pct}% | SSG: ${deal.ssg_pct}%

SCORES:
Composite: ${scores.composite}/100 → ${scores.classification}
D1 Thesis: ${scores.dimensions.d1} | D2 Financial: ${scores.dimensions.d2} | D3 Ops: ${scores.dimensions.d3} | D4 Key-Person: ${scores.dimensions.d4} | D5 Value: ${scores.dimensions.d5}
Value creation type: ${scores.value_creation_type}
${scores.margin_expansion ? `Margin expansion: ${scores.margin_expansion.bps}bps ($${scores.margin_expansion.dollars_M}M)` : ''}

FLAGS:
${scores.flags.map((f: { type: string; text: string }) => `[${f.type.toUpperCase()}] ${f.text}`).join('\n')}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    })

    const memo = response.text?.trim() ?? ''

    return NextResponse.json({ memo })
  } catch (error) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate memo' },
      { status: 500 }
    )
  }
}
