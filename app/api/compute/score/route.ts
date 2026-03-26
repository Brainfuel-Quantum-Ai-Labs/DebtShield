import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeMetrics, toFinancialMetricsFromRow } from '@/lib/finance/metrics'
import { computeScore } from '@/lib/finance/scoring'
import { checkRateLimit } from '@/lib/rateLimit'
import { deductCredits } from '@/lib/credits'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`score:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const credit = await deductCredits(user.id, 'score')
  if (!credit.ok) {
    return NextResponse.json(
      { error: 'Insufficient credits', credits_remaining: credit.remaining, credits_needed: credit.cost },
      { status: 402 },
    )
  }

  try {
    const serviceClient = createSupabaseServiceClient()

    const { data: metricsRows, error: metricsError } = await serviceClient
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1)

    if (metricsError) {
      console.error('Failed to fetch metrics for score:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    const { data: transactions, error: txError } = await serviceClient
      .from('transactions')
      .select('amount, date, name, category, pending')
      .eq('user_id', user.id)

    if (txError) {
      console.error('Failed to fetch transactions for score:', txError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    const metrics = metricsRows?.[0]
      ? (toFinancialMetricsFromRow(metricsRows[0]) ?? computeMetrics(transactions ?? []))
      : computeMetrics(transactions ?? [])
    const result = computeScore(metrics)

    // Remove all previous scores for this user before inserting so that
    // repeated recomputes never accumulate unbounded rows.
    const { error: deleteError } = await serviceClient
      .from('scores')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Failed to clear existing scores:', deleteError)
      return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
    }

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

    return NextResponse.json({ score: result, credits_remaining: credit.remaining })
  } catch (err) {
    console.error('compute score error:', err)
    return NextResponse.json({ error: 'Failed to compute score' }, { status: 500 })
  }
}
