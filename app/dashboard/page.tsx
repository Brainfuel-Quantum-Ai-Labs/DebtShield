import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeMetrics, toFinancialMetricsFromRow } from '@/lib/finance/metrics'
import { computeScore } from '@/lib/finance/scoring'
import { getCredits } from '@/lib/credits'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createSupabaseServiceClient()

  const [{ data: metricsRows }, { data: transactions }, { data: scores }] = await Promise.all([
    serviceClient
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1),
    serviceClient
      .from('transactions')
      .select('amount, date, name, category, pending')
      .eq('user_id', user.id),
    serviceClient
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1),
  ])

  // Fetch credits separately — auto-initialises to 10 for new users
  let initialCredits: number | null = null
  try {
    initialCredits = await getCredits(user.id)
  } catch {
    // Non-fatal — dashboard still works without credits display
  }

  const persistedMetrics = metricsRows?.[0] ? toFinancialMetricsFromRow(metricsRows[0]) : null
  const latestMetrics = persistedMetrics ?? (transactions?.length ? computeMetrics(transactions) : null)
  const computedScore = latestMetrics ? computeScore(latestMetrics) : null

  const rawReasons = scores?.[0]?.reasons
  const persistedReasons = Array.isArray(rawReasons)
    ? rawReasons.filter((r): r is string => typeof r === 'string')
    : null

  const latestScore = computedScore
    ? {
        score: typeof scores?.[0]?.score === 'number' ? scores[0].score : computedScore.score,
        band: typeof scores?.[0]?.band === 'string' ? scores[0].band : computedScore.band,
        reasons: persistedReasons ?? computedScore.reasons,
        computed_at: scores?.[0]?.computed_at ?? new Date().toISOString(),
      }
    : null

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Your Financial Dashboard</h1>
        <DashboardClient
          initialMetrics={latestMetrics}
          initialScore={latestScore}
          initialCredits={initialCredits}
          userEmail={user.email ?? null}
        />
      </div>
    </main>
  )
}
