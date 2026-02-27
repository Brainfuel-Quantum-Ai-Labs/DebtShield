import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(`sync:${user.id}`, 3, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const serviceClient = createSupabaseServiceClient()
    const { data: items, error: itemsError } = await serviceClient
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)

    if (itemsError) {
      console.error('Failed to fetch plaid items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch connected accounts' }, { status: 500 })
    }

    if (!items?.length) {
      return NextResponse.json({ error: 'No connected accounts' }, { status: 400 })
    }

    let totalAdded = 0

    for (const item of items) {
      let cursor: string | undefined = item.cursor ?? undefined
      let hasMore = true

      while (hasMore) {
        const syncResponse = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor,
        })

        const { added, next_cursor, has_more } = syncResponse.data

        if (added.length > 0) {
          const rows = added.map((tx) => ({
            user_id: user.id,
            plaid_item_id: item.id,
            plaid_transaction_id: tx.transaction_id,
            amount: tx.amount,
            date: tx.date,
            name: tx.name,
            category: tx.category ?? [],
            pending: tx.pending,
          }))

          const { error: upsertError } = await serviceClient.from('transactions').upsert(rows, {
            onConflict: 'plaid_transaction_id',
            ignoreDuplicates: true,
          })

          if (upsertError) {
            console.error('Failed to upsert transactions:', upsertError)
            return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
          }

          totalAdded += added.length
        }

        cursor = next_cursor
        hasMore = has_more
      }

      const { error: cursorError } = await serviceClient
        .from('plaid_items')
        .update({ cursor, updated_at: new Date().toISOString() })
        .eq('id', item.id)

      if (cursorError) {
        console.error('Failed to update plaid cursor:', cursorError)
        return NextResponse.json({ error: 'Failed to update sync cursor' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, transactions_added: totalAdded })
  } catch (err) {
    console.error('sync error:', err)
    return NextResponse.json({ error: 'Failed to sync transactions' }, { status: 500 })
  }
}
