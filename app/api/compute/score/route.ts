import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeScore } from '@/lib/finance/scoring'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`score:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const serviceClient = createSupabaseServiceClient()

  // Get latest metrics
  const { data: metricsRows, error: metricsError } = await serviceClient
    .from('metrics')
    .select('*')
    .eq('user_id', user.id)
    .order('computed_at', { ascending: false })
    .limit(1)

  if (metricsError || !metricsRows?.length) {
    return NextResponse.json({ error: 'No metrics found. Please compute metrics first.' }, { status: 400 })
  }

  const latestMetrics = metricsRows[0]
  const result = computeScore(latestMetrics)

  const { error: insertError } = await serviceClient.from('scores').insert({
    user_id: user.id,
    score: result.score,
    band: result.band,
    reasons: result.reasons,
  })

  if (insertError) {
    console.error('Failed to save score:', insertError)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }

  return NextResponse.json({ score: result })
}
