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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const payload = body as { public_token?: unknown; institution_name?: unknown }
  const public_token = typeof payload.public_token === 'string' ? payload.public_token.trim() : ''
  const institution_name =
    typeof payload.institution_name === 'string' && payload.institution_name.trim().length > 0
      ? payload.institution_name.trim()
      : null

  if (!public_token) {
    return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeResponse.data

    const serviceClient = createSupabaseServiceClient()

    // Guard against duplicate connections: if this item_id is already stored
    // for this user, skip the insert and return success to avoid double-counting transactions.
    const { data: existing, error: lookupError } = await serviceClient
      .from('plaid_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', item_id)
      .maybeSingle()

    if (lookupError) {
      console.error('Failed to check for existing plaid item:', lookupError)
      return NextResponse.json({ error: 'Failed to verify connection' }, { status: 500 })
    }

    if (existing) {
      // Already connected — return success without inserting a duplicate row
      return NextResponse.json({ success: true, already_connected: true })
    }

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
