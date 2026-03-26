import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeMetrics } from '@/lib/finance/metrics'
import { checkRateLimit } from '@/lib/rateLimit'
import { deductCredits } from '@/lib/credits'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`metrics:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const credit = await deductCredits(user.id, 'metrics')
  if (!credit.ok) {
    return NextResponse.json(
      { error: 'Insufficient credits', credits_remaining: credit.remaining, credits_needed: credit.cost },
      { status: 402 },
    )
  }

  try {
    const serviceClient = createSupabaseServiceClient()
    const { data: transactions, error: txError } = await serviceClient
      .from('transactions')
      .select('amount, date, name, category, pending')
      .eq('user_id', user.id)

    if (txError) {
      console.error('Failed to fetch transactions:', txError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    const metrics = computeMetrics(transactions ?? [])

    // Remove any existing row for this user+period before inserting so that
    // repeated recomputes never accumulate duplicate rows for the same window.
    const { error: deleteError } = await serviceClient
      .from('metrics')
      .delete()
      .eq('user_id', user.id)
      .eq('period_start', metrics.period_start)
      .eq('period_end', metrics.period_end)

    if (deleteError) {
      console.error('Failed to clear existing metrics:', deleteError)
      return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 })
    }

    const { error: insertError } = await serviceClient.from('metrics').insert({
      user_id: user.id,
      period_start: metrics.period_start,
      period_end: metrics.period_end,
      income: metrics.income,
      expenses: metrics.expenses,
      cashflow: metrics.cashflow,
      savings_rate: metrics.savings_rate,
      transaction_count: metrics.transaction_count,
      income_sources: metrics.income_sources,
      expense_categories: metrics.expense_categories,
      investments: metrics.investments,
      credit_cards: metrics.credit_cards,
      loans: metrics.loans,
      emergency_fund: metrics.emergency_fund,
      financial_services: metrics.financial_services,
      intelligence: metrics.intelligence,
    })

    if (insertError) {
      console.error('Failed to save metrics:', insertError)
      return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 })
    }

    return NextResponse.json({ metrics, credits_remaining: credit.remaining })
  } catch (err) {
    console.error('compute metrics error:', err)
    return NextResponse.json({ error: 'Failed to compute metrics' }, { status: 500 })
  }
}
