import { createSupabaseServiceClient } from '@/lib/supabase/server'

export type CreditEventType = 'ai_plan' | 'sync' | 'score' | 'metrics'

/** Credits charged per operation. */
export const CREDIT_COSTS: Record<CreditEventType, number> = {
  ai_plan: 5,
  sync: 1,
  score: 1,
  metrics: 1,
}

/** Free credits granted to every new user on first access. */
export const INITIAL_FREE_CREDITS = 10

/**
 * Returns the current credit balance for a user.
 * If no credits row exists yet, initialises it with INITIAL_FREE_CREDITS.
 */
export async function getCredits(userId: string): Promise<number> {
  const db = createSupabaseServiceClient()

  const { data, error } = await db
    .from('user_credits')
    .select('credits')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error('Failed to fetch credits')

  if (!data) {
    const { error: initError } = await db.from('user_credits').insert({
      user_id: userId,
      credits: INITIAL_FREE_CREDITS,
      lifetime_used: 0,
    })
    if (initError) throw new Error('Failed to initialise credits')
    return INITIAL_FREE_CREDITS
  }

  return data.credits
}

export interface DeductResult {
  /** true when the deduction succeeded; false when balance was insufficient. */
  ok: boolean
  remaining: number
  cost: number
}

/**
 * Attempts to deduct credits for an operation.
 *
 * Returns `{ ok: false }` (without throwing) when the balance is too low,
 * so callers can return a 402 response cleanly.
 */
export async function deductCredits(
  userId: string,
  eventType: CreditEventType,
): Promise<DeductResult> {
  const cost = CREDIT_COSTS[eventType]
  const current = await getCredits(userId)

  if (current < cost) {
    return { ok: false, remaining: current, cost }
  }

  const next = current - cost
  const db = createSupabaseServiceClient()

  const { error: updateError } = await db
    .from('user_credits')
    .update({ credits: next, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (updateError) throw new Error('Failed to deduct credits')

  // Fire-and-forget usage log — failure here must not break the operation
  db.from('usage_events')
    .insert({ user_id: userId, event_type: eventType, credits_used: cost })
    .then(({ error }) => {
      if (error) console.error('Failed to log usage event:', error)
    })

  return { ok: true, remaining: next, cost }
}
