'use client'

import { useState } from 'react'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'
import type { FinancialMetrics } from '@/lib/finance/metrics'
import type { ScoreResult } from '@/lib/finance/scoring'
import { CREDIT_COSTS } from '@/lib/credits'

// Extend lib types with DB-persisted timestamp fields
type Metrics = FinancialMetrics & { computed_at?: string }
type Score = ScoreResult & { computed_at: string }

interface Props {
  initialMetrics: Metrics | null
  initialScore: Score | null
  initialCredits: number | null
  userEmail: string | null
}

type TabId = 'overview' | 'income' | 'expenses' | 'investments' | 'credit' | 'emergency' | 'loans' | 'intelligence' | 'payments'

// ─── Payoff math ────────────────────────────────────────────────────────────

function payoffMonths(balance: number, monthlyPayment: number, apr: number): number | null {
  if (balance <= 0) return 0
  const r = apr / 12
  if (r === 0) return Math.ceil(balance / monthlyPayment)
  if (monthlyPayment <= balance * r) return null // payment doesn't cover interest
  return Math.ceil(Math.log(monthlyPayment / (monthlyPayment - balance * r)) / Math.log(1 + r))
}

function totalInterest(balance: number, months: number, monthlyPayment: number): number {
  return Math.max(0, monthlyPayment * months - balance)
}

// ─── Colour helpers ──────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function bandColor(band: string) {
  switch (band) {
    case 'Excellent': return 'text-green-400'
    case 'Good': return 'text-blue-400'
    case 'Warning': return 'text-yellow-400'
    case 'Critical': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function riskColor(value: 'Low' | 'Moderate' | 'High') {
  if (value === 'Low') return 'text-green-300'
  if (value === 'Moderate') return 'text-yellow-300'
  return 'text-red-300'
}

function riskBg(value: 'Low' | 'Moderate' | 'High') {
  if (value === 'Low') return 'bg-green-500/20 border-green-500/40'
  if (value === 'Moderate') return 'bg-yellow-500/20 border-yellow-500/40'
  return 'bg-red-500/20 border-red-500/40'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricChip({ label, value, valueClassName = 'text-blue-100' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-4">
      <p className="text-xs text-blue-300 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${valueClassName}`}>{value}</p>
    </div>
  )
}

function InsightBlock({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-4">
      <p className={`font-semibold mb-2 ${accent}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-blue-400">None detected this period.</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-blue-100">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 ${accent}`}>•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CreditGauge({ pressure }: { pressure: number }) {
  const pct = Math.min(100, pressure * 100)
  const color = pct >= 28 ? 'text-red-400' : pct >= 16 ? 'text-yellow-400' : 'text-green-400'
  const stroke = pct >= 28 ? '#f87171' : pct >= 16 ? '#facc15' : '#4ade80'
  const r = 36
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={stroke} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="52" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <span className={`text-xs font-medium ${color}`}>Card Pressure</span>
    </div>
  )
}

// ─── Payoff Calculator ───────────────────────────────────────────────────────

function PayoffCalculator({ metrics }: { metrics: Metrics }) {
  const [apr, setApr] = useState(21.99)
  const [extra, setExtra] = useState(50)

  const balance = Math.max(0, metrics.credit_cards.estimated_card_spend - metrics.credit_cards.estimated_card_payments)
  const minPay = Math.max(25, balance * 0.02)
  const accelPay = minPay + extra

  const monthsMin = payoffMonths(balance, minPay, apr / 100)
  const monthsAccel = payoffMonths(balance, accelPay, apr / 100)

  const interestMin = monthsMin !== null ? totalInterest(balance, monthsMin, minPay) : null
  const interestAccel = monthsAccel !== null ? totalInterest(balance, monthsAccel, accelPay) : null
  const interestSaved = interestMin !== null && interestAccel !== null ? interestMin - interestAccel : null

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  const fmtMo = (n: number | null) => n === null ? '∞' : n === 0 ? 'Paid off' : `${n} mo`

  if (balance <= 0) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center text-sm text-green-200">
        No estimated outstanding balance — your card payments are keeping up with spend.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 rounded-xl border border-white/20 bg-white/5 p-4">
          <p className="text-xs text-blue-300 uppercase tracking-wider mb-2">Estimated Balance</p>
          <p className="text-2xl font-bold text-red-300">{fmt(balance)}</p>
          <p className="text-xs text-blue-400 mt-1">Spend minus payments this period</p>
        </div>
        <div className="flex-1 rounded-xl border border-white/20 bg-white/5 p-4">
          <label className="text-xs text-blue-300 uppercase tracking-wider block mb-2">
            APR ({apr.toFixed(2)}%)
          </label>
          <input
            type="range" min="8" max="36" step="0.25"
            value={apr}
            onChange={e => setApr(parseFloat(e.target.value))}
            className="w-full accent-blue-400"
          />
          <div className="flex justify-between text-xs text-blue-400 mt-1">
            <span>8%</span><span>36%</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/20 bg-white/5 p-4">
        <label className="text-xs text-blue-300 uppercase tracking-wider block mb-2">
          Extra monthly payment: <span className="text-white font-bold">{fmt(extra)}</span>
        </label>
        <input
          type="range" min="0" max="500" step="25"
          value={extra}
          onChange={e => setExtra(parseInt(e.target.value))}
          className="w-full accent-indigo-400"
        />
        <div className="flex justify-between text-xs text-blue-400 mt-1">
          <span>$0</span><span>$500</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/20 bg-white/5 p-4">
          <p className="text-xs text-blue-300 mb-1">Minimum payment only</p>
          <p className="text-lg font-bold text-red-300">{fmtMo(monthsMin)}</p>
          <p className="text-xs text-blue-400 mt-0.5">Total interest: {interestMin !== null ? fmt(interestMin) : '—'}</p>
          <p className="text-xs text-blue-400">Min pay: {fmt(minPay)}/mo</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-xs text-blue-300 mb-1">+{fmt(extra)}/mo accelerated</p>
          <p className="text-lg font-bold text-green-300">{fmtMo(monthsAccel)}</p>
          <p className="text-xs text-blue-400 mt-0.5">Total interest: {interestAccel !== null ? fmt(interestAccel) : '—'}</p>
          <p className="text-xs text-blue-400">Pay: {fmt(accelPay)}/mo</p>
        </div>
      </div>

      {interestSaved !== null && interestSaved > 0 && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center">
          <p className="text-sm text-green-200">
            Paying <strong>{fmt(extra)}/mo extra</strong> saves you{' '}
            <strong className="text-green-300">{fmt(interestSaved)}</strong> in interest
            {monthsMin !== null && monthsAccel !== null && monthsMin > monthsAccel && (
              <> and pays off <strong className="text-green-300">{monthsMin - monthsAccel} months</strong> sooner</>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DashboardClient({ initialMetrics, initialScore, initialCredits, userEmail }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(initialMetrics)
  const [score, setScore] = useState<Score | null>(initialScore)
  const [credits, setCredits] = useState<number | null>(initialCredits)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planDone, setPlanDone] = useState(false)

  // Recompute costs 1 (metrics) + 1 (score) = 2 credits
  const recompute = async () => {
    setLoading('computing')
    setError(null)
    try {
      const metricsRes = await fetch('/api/compute/metrics', { method: 'POST' })
      const metricsData = await metricsRes.json()
      if (metricsRes.status === 402) {
        setError(`Not enough credits (need ${metricsData.credits_needed}, have ${metricsData.credits_remaining}). Top up at Billing.`)
        return
      }
      if (!metricsRes.ok) throw new Error(metricsData.error)
      setMetrics(metricsData.metrics)
      if (typeof metricsData.credits_remaining === 'number') setCredits(metricsData.credits_remaining)

      const scoreRes = await fetch('/api/compute/score', { method: 'POST' })
      const scoreData = await scoreRes.json()
      if (scoreRes.status === 402) {
        setError(`Not enough credits for score computation. Top up at Billing.`)
        return
      }
      if (!scoreRes.ok) throw new Error(scoreData.error)
      setScore(scoreData.score)
      if (typeof scoreData.credits_remaining === 'number') setCredits(scoreData.credits_remaining)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Computation failed')
    } finally {
      setLoading(null)
    }
  }

  // AI plan costs 5 credits
  const generatePlan = async () => {
    setPlanLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/plan', { method: 'POST' })
      const data = await res.json()
      if (res.status === 402) {
        setError(`Not enough credits (need ${data.credits_needed}, have ${data.credits_remaining}). Top up at Billing.`)
        return
      }
      if (!res.ok) throw new Error(data.error)
      setPlanDone(true)
      if (typeof data.credits_remaining === 'number') setCredits(data.credits_remaining)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setPlanLoading(false)
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'investments', label: 'Investments' },
    { id: 'credit', label: 'Credit Cards' },
    { id: 'emergency', label: 'Emergency Fund' },
    { id: 'loans', label: 'Loans' },
    { id: 'intelligence', label: 'Intelligence' },
    { id: 'payments', label: '⚡ Payments' },
  ]

  if (!metrics && !score) {
    return (
      <>
        <NavBar credits={credits} email={userEmail} />
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏦</div>
          <h2 className="text-xl font-semibold mb-2">No financial data yet</h2>
          <p className="text-blue-300 mb-6">Connect a bank account to get your DebtShield score and insights.</p>
          <Link href="/connect" className="bg-blue-500 hover:bg-blue-400 px-6 py-3 rounded-xl font-bold transition-colors">
            Connect Bank Account
          </Link>
        </div>
      </>
    )
  }

  const cardPressure = metrics && metrics.income > 0
    ? (metrics.credit_cards.estimated_card_spend + metrics.credit_cards.estimated_interest_and_fees) / metrics.income
    : 0

  return (
    <div className="space-y-6">
      <NavBar credits={credits} email={userEmail} />

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
          {error.includes('Top up') && (
            <Link href="/billing" className="ml-auto text-yellow-300 hover:text-yellow-200 font-semibold shrink-0">
              Buy Credits →
            </Link>
          )}
        </div>
      )}

      {/* Score card */}
      {score && (
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
          <p className="text-xs text-blue-300 uppercase tracking-wider mb-4 font-medium">DebtShield Score</p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
            <span className={`text-8xl font-extrabold leading-none ${scoreColor(score.score)}`}>
              {score.score}
            </span>
            <div>
              <span className={`text-3xl font-bold ${bandColor(score.band)}`}>{score.band}</span>
              <p className="text-xs text-blue-400 mt-1">
                Last computed: {new Date(score.computed_at).toLocaleString()}
              </p>
            </div>
            {/* Score band legend */}
            <div className="ml-auto hidden md:flex flex-col gap-1 text-xs text-blue-400">
              {[['80–100', 'Excellent', 'text-green-400'], ['60–79', 'Good', 'text-blue-400'], ['40–59', 'Warning', 'text-yellow-400'], ['0–39', 'Critical', 'text-red-400']].map(([range, label, cls]) => (
                <span key={range} className={score.band === label ? `${cls} font-bold` : 'opacity-50'}>
                  {range} {label}
                </span>
              ))}
            </div>
          </div>
          {score.reasons.length > 0 && (
            <div>
              <p className="text-xs text-blue-300 font-medium mb-2 uppercase tracking-wider">Score Factors</p>
              <ul className="space-y-1">
                {score.reasons.map((reason, i) => (
                  <li key={i} className="text-sm text-blue-200 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5 shrink-0">◆</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Summary KPI strip */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Income', value: `$${metrics.income.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-green-400', sub: '30-day total' },
            { label: 'Expenses', value: `$${metrics.expenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-red-400', sub: '30-day total' },
            { label: 'Cashflow', value: `${metrics.cashflow >= 0 ? '+' : ''}$${metrics.cashflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: metrics.cashflow >= 0 ? 'text-green-400' : 'text-red-400', sub: metrics.cashflow >= 0 ? 'Surplus' : 'Deficit' },
            { label: 'Savings Rate', value: `${(metrics.savings_rate * 100).toFixed(1)}%`, color: 'text-blue-300', sub: 'of income saved' },
          ].map(item => (
            <div key={item.label} className="bg-white/10 border border-white/20 rounded-xl p-4">
              <p className="text-xs text-blue-400 uppercase tracking-wider">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
              <p className="text-xs text-blue-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab section */}
      {metrics && (
        <div className="bg-white/10 border border-white/20 rounded-2xl">
          {/* Tab strip */}
          <div className="flex gap-1.5 overflow-x-auto px-4 pt-4 pb-0 scrollbar-none">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'bg-white/5 text-blue-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-white/10">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <MetricChip label="Transactions" value={String(metrics.transaction_count)} />
                  <MetricChip
                    label="Credit Risk"
                    value={metrics.credit_cards.utilization_risk}
                    valueClassName={riskColor(metrics.credit_cards.utilization_risk)}
                  />
                  <MetricChip label="Emergency Coverage" value={`${metrics.emergency_fund.months_covered.toFixed(1)} months`} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                    <p className="text-xs text-blue-300 uppercase tracking-wider mb-2">Expense vs Income Ratio</p>
                    <ProgressBar
                      value={metrics.expenses}
                      max={metrics.income}
                      colorClass={metrics.expenses / Math.max(1, metrics.income) > 0.9 ? 'bg-red-500' : metrics.expenses / Math.max(1, metrics.income) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'}
                    />
                    <p className="text-xs text-blue-400 mt-1">
                      {metrics.income > 0 ? ((metrics.expenses / metrics.income) * 100).toFixed(1) : 0}% of income
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                    <p className="text-xs text-blue-300 uppercase tracking-wider mb-2">Period</p>
                    <p className="text-sm text-white font-medium">{metrics.period_start} → {metrics.period_end}</p>
                    {metrics.computed_at && (
                      <p className="text-xs text-blue-400 mt-1">Computed {new Date(metrics.computed_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Income */}
            {activeTab === 'income' && (
              <div className="space-y-2">
                {metrics.income_sources.length === 0 ? (
                  <p className="text-sm text-blue-400 py-4 text-center">No income sources detected this period.</p>
                ) : (
                  metrics.income_sources.map(src => (
                    <div key={src.source} className="rounded-lg border border-white/20 bg-white/5 px-4 py-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium">{src.source}</span>
                        <span className="text-sm font-bold text-green-300">
                          ${src.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={src.share} max={1} colorClass="bg-green-500/60" />
                        <span className="text-xs text-blue-400 shrink-0">{(src.share * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Expenses */}
            {activeTab === 'expenses' && (
              <div className="space-y-3">
                {metrics.expense_categories.length === 0 ? (
                  <p className="text-sm text-blue-400 py-4 text-center">No expense categories detected this period.</p>
                ) : (
                  metrics.expense_categories.map(cat => (
                    <div key={cat.category} className="rounded-lg border border-white/20 bg-white/5 px-4 py-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <span className="text-sm font-bold text-red-300">
                          ${cat.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={cat.share} max={1} colorClass="bg-red-500/60" />
                        <span className="text-xs text-blue-400 shrink-0">{(cat.share * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))
                )}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <MetricChip label="Bank Fees" value={`$${metrics.financial_services.fees.toFixed(2)}`} />
                  <MetricChip label="Insurance" value={`$${metrics.financial_services.insurance.toFixed(2)}`} />
                  <MetricChip label="Subscriptions" value={`$${metrics.financial_services.subscriptions.toFixed(2)}`} />
                </div>
              </div>
            )}

            {/* Investments */}
            {activeTab === 'investments' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricChip label="Contributions" value={`$${metrics.investments.contributions.toFixed(2)}`} valueClassName="text-green-300" />
                  <MetricChip label="Withdrawals" value={`$${metrics.investments.withdrawals.toFixed(2)}`} valueClassName="text-red-300" />
                  <MetricChip
                    label="Net Investing"
                    value={`${metrics.investments.net_investing >= 0 ? '+' : ''}$${metrics.investments.net_investing.toFixed(2)}`}
                    valueClassName={metrics.investments.net_investing >= 0 ? 'text-green-300' : 'text-red-300'}
                  />
                  <MetricChip label="Investment Income" value={`$${metrics.investments.income.toFixed(2)}`} valueClassName="text-blue-300" />
                </div>
                {metrics.investments.contributions === 0 && metrics.investments.income === 0 && (
                  <p className="text-sm text-blue-400 text-center py-2">No investment activity detected. Consider allocating surplus cashflow to long-term investments.</p>
                )}
              </div>
            )}

            {/* Credit Cards — enhanced */}
            {activeTab === 'credit' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <CreditGauge pressure={cardPressure} />
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <MetricChip label="Card Spend" value={`$${metrics.credit_cards.estimated_card_spend.toFixed(2)}`} valueClassName="text-red-300" />
                    <MetricChip label="Card Payments" value={`$${metrics.credit_cards.estimated_card_payments.toFixed(2)}`} valueClassName="text-green-300" />
                    <MetricChip label="Interest & Fees" value={`$${metrics.credit_cards.estimated_interest_and_fees.toFixed(2)}`} valueClassName="text-yellow-300" />
                    <div className={`rounded-xl border p-4 ${riskBg(metrics.credit_cards.utilization_risk)}`}>
                      <p className="text-xs text-blue-300 uppercase tracking-wider">Utilization Risk</p>
                      <p className={`text-xl font-semibold mt-1 ${riskColor(metrics.credit_cards.utilization_risk)}`}>
                        {metrics.credit_cards.utilization_risk}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-blue-200 mb-3">Payoff Calculator</p>
                  <PayoffCalculator metrics={metrics} />
                </div>
              </div>
            )}

            {/* Emergency Fund */}
            {activeTab === 'emergency' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricChip label="Essentials / Month" value={`$${metrics.emergency_fund.essentials_monthly.toFixed(2)}`} />
                  <MetricChip label="Estimated Fund" value={`$${metrics.emergency_fund.estimated_fund.toFixed(2)}`} valueClassName="text-blue-300" />
                  <MetricChip
                    label="Months Covered"
                    value={`${metrics.emergency_fund.months_covered.toFixed(1)} mo`}
                    valueClassName={metrics.emergency_fund.months_covered >= 3 ? 'text-green-300' : metrics.emergency_fund.months_covered >= 1 ? 'text-yellow-300' : 'text-red-300'}
                  />
                  <MetricChip label="Target Fund (3 mo)" value={`$${metrics.emergency_fund.target_fund.toFixed(2)}`} />
                </div>
                <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                  <p className="text-xs text-blue-300 uppercase tracking-wider mb-2">Funding Progress</p>
                  <ProgressBar
                    value={metrics.emergency_fund.estimated_fund}
                    max={metrics.emergency_fund.target_fund}
                    colorClass={metrics.emergency_fund.months_covered >= 3 ? 'bg-green-500' : metrics.emergency_fund.months_covered >= 1 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                  <div className="flex justify-between text-xs text-blue-400 mt-1">
                    <span>$0</span>
                    <span>Target: ${metrics.emergency_fund.target_fund.toFixed(0)}</span>
                  </div>
                  {metrics.emergency_fund.funding_gap > 0 && (
                    <p className="text-xs text-yellow-300 mt-2">
                      Gap: ${metrics.emergency_fund.funding_gap.toFixed(2)} remaining to reach 3-month target
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Loans */}
            {activeTab === 'loans' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricChip label="Monthly Loan Payments" value={`$${metrics.loans.estimated_monthly_payments.toFixed(2)}`} />
                  <MetricChip
                    label="Debt-to-Income Ratio"
                    value={`${(metrics.loans.loan_payment_ratio * 100).toFixed(1)}%`}
                    valueClassName={riskColor(metrics.loans.burden)}
                  />
                  <div className={`col-span-2 rounded-xl border p-4 ${riskBg(metrics.loans.burden)}`}>
                    <p className="text-xs text-blue-300 uppercase tracking-wider">Loan Burden</p>
                    <p className={`text-xl font-semibold mt-1 ${riskColor(metrics.loans.burden)}`}>{metrics.loans.burden}</p>
                    <p className="text-xs text-blue-400 mt-1">
                      {metrics.loans.burden === 'High' && 'Over 20% of income goes to loan payments — consider refinancing or accelerated paydown.'}
                      {metrics.loans.burden === 'Moderate' && '10–20% of income goes to loan payments — manageable but watch for increases.'}
                      {metrics.loans.burden === 'Low' && 'Under 10% of income goes to loan payments — healthy debt load.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Intelligence */}
            {activeTab === 'intelligence' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <InsightBlock title="Strengths" items={metrics.intelligence.strengths} accent="text-green-300" />
                <InsightBlock title="Risks" items={metrics.intelligence.risks} accent="text-red-300" />
                <InsightBlock title="Opportunities" items={metrics.intelligence.opportunities} accent="text-yellow-300" />
                <InsightBlock title="Next Actions" items={metrics.intelligence.next_actions} accent="text-blue-300" />
              </div>
            )}

            {/* Payments */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-center">
                    <p className="text-xs text-yellow-300 uppercase tracking-wider mb-1">Current Balance</p>
                    <p className="text-4xl font-extrabold text-yellow-200">{credits ?? '—'}</p>
                    <p className="text-xs text-yellow-400/70 mt-1">credits</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/5 p-4 col-span-2">
                    <p className="text-xs text-blue-300 uppercase tracking-wider mb-3">Credit Costs</p>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'AI Financial Plan', cost: CREDIT_COSTS.ai_plan, icon: '🤖' },
                        { label: 'Recompute Score', cost: CREDIT_COSTS.score, icon: '📊' },
                        { label: 'Recompute Metrics', cost: CREDIT_COSTS.metrics, icon: '📈' },
                        { label: 'Sync Transactions', cost: CREDIT_COSTS.sync, icon: '🔄' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-blue-200">{item.icon} {item.label}</span>
                          <span className="font-semibold text-yellow-300">{item.cost} ⚡</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                  <p className="text-sm text-blue-200 mb-3">Need more credits? View your full usage history and top up on the Billing page.</p>
                  <Link href="/billing" className="inline-block bg-blue-500 hover:bg-blue-400 px-6 py-2.5 rounded-lg font-semibold transition-colors text-sm">
                    Go to Billing →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={recompute}
          disabled={loading === 'computing'}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-colors text-sm"
        >
          {loading === 'computing' ? '⏳ Computing...' : `🔄 Recompute Score (2 ⚡)`}
        </button>
        <button
          onClick={generatePlan}
          disabled={planLoading || !score}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-colors text-sm"
        >
          {planLoading ? '🤖 Generating...' : `🤖 Generate AI Plan (${CREDIT_COSTS.ai_plan} ⚡)`}
        </button>
        {planDone && (
          <Link href="/reports" className="flex-1 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-bold text-center transition-colors text-sm">
            📋 View Plan →
          </Link>
        )}
      </div>
    </div>
  )
}
