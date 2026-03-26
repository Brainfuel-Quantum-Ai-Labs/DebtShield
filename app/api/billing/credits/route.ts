import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { getCredits } from '@/lib/credits'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceClient = createSupabaseServiceClient()

    const [balance, { data: events }] = await Promise.all([
      getCredits(user.id),
      serviceClient
        .from('usage_events')
        .select('event_type, credits_used, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return NextResponse.json({ credits: balance, usage: events ?? [] })
  } catch (err) {
    console.error('credits fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
  }
}
