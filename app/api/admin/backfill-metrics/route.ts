import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeMetrics } from '@/lib/finance/metrics'

interface BackfillBody {
  dry_run?: unknown
  max_users?: unknown
}

const BACKFILL_LOCK_KEY = 'advanced_metrics_backfill'

function toPositiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const parsed = Math.floor(value)
  return parsed > 0 ? parsed : null
}

function isAuthorized(req: NextRequest): boolean {
  const adminKey = process.env.BACKFILL_ADMIN_KEY?.trim()
  const providedKey = req.headers.get('x-admin-key')?.trim()
  if (adminKey && providedKey && providedKey === adminKey) {
    return true
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = req.headers.get('authorization')?.trim()
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  return false
}

async function acquireBackfillLock(): Promise<boolean> {
  const serviceClient = createSupabaseServiceClient()

  await serviceClient
    .from('admin_locks')
    .delete()
    .eq('lock_key', BACKFILL_LOCK_KEY)
    .lt('expires_at', new Date().toISOString())

  const ttlMinutesRaw = Number(process.env.BACKFILL_LOCK_TTL_MINUTES ?? '30')
  const ttlMinutes = Number.isFinite(ttlMinutesRaw) && ttlMinutesRaw > 0 ? ttlMinutesRaw : 30
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()

  const { error } = await serviceClient.from('admin_locks').insert({
    lock_key: BACKFILL_LOCK_KEY,
    expires_at: expiresAt,
  })

  if (!error) return true
  const maybeCode = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : ''
  if (maybeCode !== '23505') {
    console.error('Failed to acquire backfill lock:', error)
  }
  return false
}

async function releaseBackfillLock() {
  const serviceClient = createSupabaseServiceClient()
  await serviceClient.from('admin_locks').delete().eq('lock_key', BACKFILL_LOCK_KEY)
}

async function runBackfill(options: { dryRun: boolean; maxUsers: number | null }) {
  const { dryRun, maxUsers } = options
  const serviceClient = createSupabaseServiceClient()
  const userIds = new Set<string>()
  const pageSize = 1000

  let offset = 0
  while (true) {
    const { data: rows, error } = await serviceClient
      .from('transactions')
      .select('user_id')
      .order('user_id', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error('Failed to scan users for backfill')
    }

    if (!rows?.length) break

    for (const row of rows) {
      if (typeof row.user_id === 'string') {
        userIds.add(row.user_id)
        if (maxUsers && userIds.size >= maxUsers) break
      }
    }

    if (maxUsers && userIds.size >= maxUsers) break
    if (rows.length < pageSize) break
    offset += pageSize
  }

  const users = Array.from(userIds)
  let processed = 0
  let failed = 0
  let totalTransactions = 0
  const failures: Array<{ user_id: string; reason: string }> = []

  for (const userId of users) {
    const { data: transactions, error: txError } = await serviceClient
      .from('transactions')
      .select('amount, date, name, category, pending')
      .eq('user_id', userId)

    if (txError) {
      failed += 1
      failures.push({ user_id: userId, reason: 'Failed to fetch transactions' })
      console.error('Backfill: failed transactions fetch for user', userId, txError)
      continue
    }

    const txList = transactions ?? []
    totalTransactions += txList.length
    const metrics = computeMetrics(txList)

    if (!dryRun) {
      const { error: insertError } = await serviceClient.from('metrics').insert({
        user_id: userId,
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
        failed += 1
        failures.push({ user_id: userId, reason: 'Failed to insert metrics' })
        console.error('Backfill: failed metrics insert for user', userId, insertError)
        continue
      }
    }

    processed += 1
  }

  return {
    success: true,
    dry_run: dryRun,
    users_scanned: users.length,
    users_processed: processed,
    users_failed: failed,
    transactions_evaluated: totalTransactions,
    failures: failures.slice(0, 25),
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: BackfillBody = {}
  try {
    body = (await req.json()) as BackfillBody
  } catch {
    body = {}
  }

  const dryRun = body.dry_run === true
  const maxUsers = toPositiveInt(body.max_users)

  const lockAcquired = await acquireBackfillLock()
  if (!lockAcquired) {
    return NextResponse.json({ error: 'Backfill already running' }, { status: 409 })
  }

  try {
    const result = await runBackfill({ dryRun, maxUsers })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Backfill advanced metrics failed:', err)
    return NextResponse.json({ error: 'Backfill failed unexpectedly' }, { status: 500 })
  } finally {
    await releaseBackfillLock()
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === 'true'
  const maxUsersValue = url.searchParams.get('max_users')
  const maxUsers = maxUsersValue ? toPositiveInt(Number(maxUsersValue)) : null

  const lockAcquired = await acquireBackfillLock()
  if (!lockAcquired) {
    return NextResponse.json({ error: 'Backfill already running' }, { status: 409 })
  }

  try {
    const result = await runBackfill({ dryRun, maxUsers })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Backfill advanced metrics cron failed:', err)
    return NextResponse.json({ error: 'Backfill failed unexpectedly' }, { status: 500 })
  } finally {
    await releaseBackfillLock()
  }
}
