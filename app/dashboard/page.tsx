import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { computeMetrics, toFinancialMetricsFromRow } from '@/lib/finance/metrics'
import { computeScore } from '@/lib/finance/scoring'
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

  const persistedMetrics = metricsRows?.[0] ? toFinancialMetricsFromRow(metricsRows[0]) : null
  const latestMetrics = persistedMetrics ?? (transactions?.length ? computeMetrics(transactions) : null)
  const computedScore = latestMetrics ? computeScore(latestMetrics) : null
  const rawReasons = scores?.[0]?.reasons
  const persistedReasons = Array.isArray(rawReasons)
    ? rawReasons.filter((entry): entry is string => typeof entry === 'string')
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
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <Link href="/" className="text-xl font-bold">🛡️ DebtShield AI</Link>
        <div className="flex items-center gap-4">
          <Link href="/reports" className="text-blue-300 hover:text-white text-sm">Reports</Link>
          <Link href="/connect" className="text-blue-300 hover:text-white text-sm">+ Connect Bank</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Your Financial Dashboard</h1>
        <DashboardClient initialMetrics={latestMetrics} initialScore={latestScore} />
      </div>
    </main>
  )
}
