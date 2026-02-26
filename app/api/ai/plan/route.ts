import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
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

function validatePlanShape(obj: unknown): obj is AIPlan {
  if (typeof obj !== 'object' || obj === null) return false
  const plan = obj as Record<string, unknown>
  return (
    typeof plan.overview === 'string' &&
    Array.isArray(plan.top_risks) &&
    Array.isArray(plan.weekly_actions) &&
    Array.isArray(plan.monthly_targets) &&
    Array.isArray(plan.disclaimers)
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

  const [{ data: metricsRows }, { data: scoreRows }] = await Promise.all([
    serviceClient
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1),
    serviceClient
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1),
  ])

  if (!metricsRows?.length || !scoreRows?.length) {
    return NextResponse.json(
      { error: 'Missing metrics or score. Please compute metrics and score first.' },
      { status: 400 }
    )
  }

  const summary = sanitizeForLLM(metricsRows[0], scoreRows[0])

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

  const message = await anthropicClient.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 })
  }

  let plan: unknown
  try {
    plan = JSON.parse(content.text)
  } catch {
    console.error('Failed to parse AI response:', content.text)
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
