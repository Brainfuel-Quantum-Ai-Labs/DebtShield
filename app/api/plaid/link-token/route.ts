import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'
import { plaidClient } from '@/lib/plaid'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`link-token:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'DebtShield AI',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err) {
    console.error('link-token error:', err)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
