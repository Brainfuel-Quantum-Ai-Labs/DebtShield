'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Metrics {
  income: number
  expenses: number
  cashflow: number
  savings_rate: number
  transaction_count: number
  period_start: string
  period_end: string
  computed_at: string
}

interface Score {
  score: number
  band: string
  reasons: string[]
  computed_at: string
}

interface Props {
  initialMetrics: Metrics | null
  initialScore: Score | null
}

function getBandColor(band: string) {
  switch (band) {
    case 'Excellent': return 'text-green-400'
    case 'Good': return 'text-blue-400'
    case 'Warning': return 'text-yellow-400'
    case 'Critical': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

export default function DashboardClient({ initialMetrics, initialScore }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(initialMetrics)
  const [score, setScore] = useState<Score | null>(initialScore)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planDone, setPlanDone] = useState(false)

  const recompute = async () => {
    setLoading('computing')
    setError(null)
    try {
      const metricsRes = await fetch('/api/compute/metrics', { method: 'POST' })
      const metricsData = await metricsRes.json()
      if (!metricsRes.ok) throw new Error(metricsData.error)
      setMetrics(metricsData.metrics)

      const scoreRes = await fetch('/api/compute/score', { method: 'POST' })
      const scoreData = await scoreRes.json()
      if (!scoreRes.ok) throw new Error(scoreData.error)
      setScore(scoreData.score)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Computation failed')
    } finally {
      setLoading(null)
    }
  }

  const generatePlan = async () => {
    setPlanLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/plan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlanDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setPlanLoading(false)
    }
  }

  if (!metrics && !score) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🏦</div>
        <h2 className="text-xl font-semibold mb-2">No data yet</h2>
        <p className="text-blue-300 mb-6">Connect a bank account to get started.</p>
        <Link
          href="/connect"
          className="bg-blue-500 hover:bg-blue-400 px-6 py-3 rounded-xl font-bold transition-colors"
        >
          Connect Bank Account
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {score && (
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-blue-300 uppercase tracking-wider mb-4">DebtShield Score</h2>
          <div className="flex items-end gap-4 mb-4">
            <span className={`text-7xl font-extrabold ${getScoreColor(score.score)}`}>
              {score.score}
            </span>
            <span className={`text-2xl font-bold mb-2 ${getBandColor(score.band)}`}>
              {score.band}
            </span>
          </div>
          {score.reasons?.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-blue-300 font-medium">Factors:</p>
              <ul className="space-y-1">
                {score.reasons.map((reason: string, i: number) => (
                  <li key={`${reason}-${i}`} className="text-sm text-blue-200 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">⚠</span> {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-blue-400 mt-3">
            Last computed: {new Date(score.computed_at).toLocaleString()}
          </p>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Income', value: `$${metrics.income.toFixed(2)}`, color: 'text-green-400' },
            { label: 'Expenses', value: `$${metrics.expenses.toFixed(2)}`, color: 'text-red-400' },
            { label: 'Cashflow', value: `$${metrics.cashflow.toFixed(2)}`, color: metrics.cashflow >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Savings Rate', value: `${(metrics.savings_rate * 100).toFixed(1)}%`, color: 'text-blue-300' },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 border border-white/20 rounded-xl p-4">
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          onClick={recompute}
          disabled={loading === 'computing'}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-colors"
        >
          {loading === 'computing' ? '⏳ Computing...' : '🔄 Recompute Score'}
        </button>
        <button
          onClick={generatePlan}
          disabled={planLoading || !score}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-colors"
        >
          {planLoading ? '🤖 Generating Plan...' : '🤖 Generate AI Plan'}
        </button>
        {planDone && (
          <Link
            href="/reports"
            className="flex-1 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-bold text-center transition-colors"
          >
            📋 View Plan →
          </Link>
        )}
      </div>
    </div>
  )
}
