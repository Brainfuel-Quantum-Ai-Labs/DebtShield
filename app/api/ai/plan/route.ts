import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeMetrics, toFinancialMetricsFromRow } from '@/lib/finance/metrics'
import { computeScore } from '@/lib/finance/scoring'
import { sanitizeForLLM } from '@/lib/finance/sanitize'
import { anthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic'
import { checkRateLimit } from '@/lib/rateLimit'

interface AIPlan {
  overview: string
  top_risks: string[]
  weekly_actions: string[]
  monthly_targets: string[]
  disclaimers: string[]
}

function normalizeBand(value: unknown): 'Excellent' | 'Good' | 'Warning' | 'Critical' {
  if (value === 'Excellent' || value === 'Good' || value === 'Warning' || value === 'Critical') {
    return value
  }
  return 'Warning'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    const withoutOpen = trimmed.replace(/^```(?:json)?\s*/i, '')
    return withoutOpen.replace(/\s*```$/, '').trim()
  }
  return trimmed
}

function validatePlanShape(obj: unknown): obj is AIPlan {
  if (typeof obj !== 'object' || obj === null) return false
  const plan = obj as Record<string, unknown>
  return (
    typeof plan.overview === 'string' &&
    isStringArray(plan.top_risks) &&
    isStringArray(plan.weekly_actions) &&
    isStringArray(plan.monthly_targets) &&
    isStringArray(plan.disclaimers)
  )
}

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`plan:${user.id}`, 3, 300_000)) {
    return NextResponse.json({ error: 'Too many requests. AI plan can be generated at most 3 times per 5 minutes.' }, { status: 429 })
  }

  const serviceClient = createSupabaseServiceClient()

  const [{ data: metricsRows, error: metricsError }, { data: transactions, error: txError }, { data: scoreRows, error: scoreError }] = await Promise.all([
    serviceClient
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1),
    serviceClient
      .from('transactions')
      .select('amount, date, name, category, pending')
      .eq('user_id', user.id),
    serviceClient
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1),
  ])

  if (metricsError || txError || scoreError) {
    console.error('Failed to fetch metrics/transactions/score for plan:', { metricsError, txError, scoreError })
    return NextResponse.json({ error: 'Failed to fetch financial inputs for plan' }, { status: 500 })
  }

  const metrics = metricsRows?.[0]
    ? (toFinancialMetricsFromRow(metricsRows[0]) ?? computeMetrics(transactions ?? []))
    : computeMetrics(transactions ?? [])
  const score = scoreRows?.[0] ? {
    score: scoreRows[0].score,
    band: normalizeBand(scoreRows[0].band),
    reasons: Array.isArray(scoreRows[0].reasons) ? scoreRows[0].reasons : [],
  } : computeScore(metrics)

  const summary = sanitizeForLLM(metrics, score)

  const prompt = `You are a professional financial advisor AI. Based on the following anonymized financial summary, produce a personalized financial plan.

Financial Summary:
${JSON.stringify(summary, null, 2)}

Respond ONLY with valid JSON (no markdown, no code blocks) in exactly this shape:
{
  "overview": "string - 2-3 sentence summary of the financial situation",
  "top_risks": ["array of 3-5 risk strings"],
  "weekly_actions": ["array of 3-5 specific actionable weekly steps"],
  "monthly_targets": ["array of 3-5 measurable monthly goals"],
  "disclaimers": ["array of 2-3 standard financial advice disclaimers"]
}`

  let responseText = ''
  try {
    const message = await anthropicClient.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    responseText = message.content
      .filter((entry) => entry.type === 'text')
      .map((entry) => entry.text)
      .join('\n')
      .trim()
  } catch (err) {
    console.error('Anthropic request failed:', err)
    return NextResponse.json({ error: 'Failed to generate AI plan' }, { status: 500 })
  }

  if (!responseText) {
    return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 })
  }

  let plan: unknown
  try {
    plan = JSON.parse(extractJsonPayload(responseText))
  } catch {
    console.error('Failed to parse AI response:', responseText)
    return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
  }

  if (!validatePlanShape(plan)) {
    return NextResponse.json({ error: 'AI response did not match expected shape' }, { status: 500 })
  }

  const { error: insertError } = await serviceClient.from('plans').insert({
    user_id: user.id,
    overview: plan.overview,
    top_risks: plan.top_risks,
    weekly_actions: plan.weekly_actions,
    monthly_targets: plan.monthly_targets,
    disclaimers: plan.disclaimers,
  })

  if (insertError) {
    console.error('Failed to save plan:', insertError)
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
  }

  return NextResponse.json({ plan })
}
