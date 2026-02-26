import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeMetrics } from '@/lib/finance/metrics'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`metrics:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const serviceClient = createSupabaseServiceClient()
  const { data: transactions, error: txError } = await serviceClient
    .from('transactions')
    .select('amount, date, name, category, pending')
    .eq('user_id', user.id)

  if (txError) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }

  const metrics = computeMetrics(transactions ?? [])

  const { error: insertError } = await serviceClient.from('metrics').insert({
    user_id: user.id,
    ...metrics,
  })

  if (insertError) {
    console.error('Failed to save metrics:', insertError)
    return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 })
  }

  return NextResponse.json({ metrics })
}
