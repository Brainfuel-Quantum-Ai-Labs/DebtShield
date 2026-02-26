import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`exchange-token:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json()
  const { public_token, institution_name } = body

  if (!public_token) {
    return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeResponse.data

    const serviceClient = createSupabaseServiceClient()
    const { error: insertError } = await serviceClient.from('plaid_items').insert({
      user_id: user.id,
      access_token,
      item_id,
      institution_name: institution_name ?? null,
    })

    if (insertError) {
      console.error('Failed to store plaid item:', insertError)
      return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('exchange-token error:', err)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
