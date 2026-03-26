import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`disconnect:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const payload = body as { plaid_item_id?: unknown }
  const plaidItemId = typeof payload.plaid_item_id === 'string' ? payload.plaid_item_id.trim() : ''

  if (!plaidItemId) {
    return NextResponse.json({ error: 'Missing plaid_item_id' }, { status: 400 })
  }

  const serviceClient = createSupabaseServiceClient()

  // Verify this plaid_item belongs to the authenticated user before deleting
  const { data: item, error: lookupError } = await serviceClient
    .from('plaid_items')
    .select('id')
    .eq('id', plaidItemId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (lookupError) {
    console.error('Failed to look up plaid item:', lookupError)
    return NextResponse.json({ error: 'Failed to verify bank account' }, { status: 500 })
  }

  if (!item) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
  }

  // Deleting the plaid_item cascades to transactions (via FK ON DELETE CASCADE)
  const { error: deleteError } = await serviceClient
    .from('plaid_items')
    .delete()
    .eq('id', plaidItemId)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Failed to disconnect bank:', deleteError)
    return NextResponse.json({ error: 'Failed to disconnect bank account' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
