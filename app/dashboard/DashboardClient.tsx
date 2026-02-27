'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SourceBreakdown {
  source: string
  amount: number
  share: number
}

interface CategoryBreakdown {
  category: string
  amount: number
  share: number
}

interface InvestmentSnapshot {
  contributions: number
  withdrawals: number
  net_investing: number
  income: number
}

interface CreditCardSnapshot {
  estimated_card_spend: number
  estimated_card_payments: number
  estimated_interest_and_fees: number
  utilization_risk: 'Low' | 'Moderate' | 'High'
}

interface LoanSnapshot {
  estimated_monthly_payments: number
  loan_payment_ratio: number
  burden: 'Low' | 'Moderate' | 'High'
}

interface EmergencyFundSnapshot {
  essentials_monthly: number
  estimated_fund: number
  months_covered: number
  target_fund: number
  funding_gap: number
}

interface FinancialServiceSnapshot {
  fees: number
  insurance: number
  subscriptions: number
}

interface IntelligenceSnapshot {
  strengths: string[]
  risks: string[]
  opportunities: string[]
  next_actions: string[]
}

interface Metrics {
  income: number
  expenses: number
  cashflow: number
  savings_rate: number
  transaction_count: number
  period_start: string
  period_end: string
  computed_at?: string
  income_sources: SourceBreakdown[]
  expense_categories: CategoryBreakdown[]
  investments: InvestmentSnapshot
  credit_cards: CreditCardSnapshot
  loans: LoanSnapshot
  emergency_fund: EmergencyFundSnapshot
  financial_services: FinancialServiceSnapshot
  intelligence: IntelligenceSnapshot
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
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'investments' | 'credit' | 'emergency' | 'loans' | 'intelligence'>('overview')
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'income', label: 'Income Sources' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'investments', label: 'Investments' },
    { id: 'credit', label: 'Credit Cards' },
    { id: 'emergency', label: 'Emergency Fund' },
    { id: 'loans', label: 'Loans' },
    { id: 'intelligence', label: 'Intelligence' },
  ] as const

  const badgeColor = (value: 'Low' | 'Moderate' | 'High') => {
    if (value === 'Low') return 'text-green-300'
    if (value === 'Moderate') return 'text-yellow-300'
    return 'text-red-300'
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
                  <li key={i} className="text-sm text-blue-200 flex items-start gap-2">
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
        <>
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

          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white font-semibold'
                      : 'bg-white/5 text-blue-200 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                  <p className="text-blue-300">Transactions</p>
                  <p className="text-2xl font-bold mt-1">{metrics.transaction_count}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                  <p className="text-blue-300">Credit Risk</p>
                  <p className={`text-2xl font-bold mt-1 ${badgeColor(metrics.credit_cards.utilization_risk)}`}>
                    {metrics.credit_cards.utilization_risk}
                  </p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                  <p className="text-blue-300">Emergency Coverage</p>
                  <p className="text-2xl font-bold mt-1">{metrics.emergency_fund.months_covered.toFixed(1)} mo</p>
                </div>
              </div>
            )}

            {activeTab === 'income' && (
              <div className="mt-4 space-y-2">
                {metrics.income_sources.length === 0 ? (
                  <p className="text-sm text-blue-300">No income sources detected in this period.</p>
                ) : (
                  metrics.income_sources.map((source) => (
                    <div key={source.source} className="flex justify-between items-center rounded-lg border border-white/20 px-3 py-2 bg-white/5">
                      <span className="text-sm">{source.source}</span>
                      <span className="text-sm font-semibold text-green-300">
                        ${source.amount.toFixed(2)} ({(source.share * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="mt-4 space-y-2">
                {metrics.expense_categories.length === 0 ? (
                  <p className="text-sm text-blue-300">No expense categories detected in this period.</p>
                ) : (
                  metrics.expense_categories.map((entry) => (
                    <div key={entry.category} className="flex justify-between items-center rounded-lg border border-white/20 px-3 py-2 bg-white/5">
                      <span className="text-sm">{entry.category}</span>
                      <span className="text-sm font-semibold text-red-300">
                        ${entry.amount.toFixed(2)} ({(entry.share * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))
                )}
                <div className="grid md:grid-cols-3 gap-3 pt-2">
                  <MetricChip label="Fees" value={`$${metrics.financial_services.fees.toFixed(2)}`} />
                  <MetricChip label="Insurance" value={`$${metrics.financial_services.insurance.toFixed(2)}`} />
                  <MetricChip label="Subscriptions" value={`$${metrics.financial_services.subscriptions.toFixed(2)}`} />
                </div>
              </div>
            )}

            {activeTab === 'investments' && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <MetricChip label="Contributions" value={`$${metrics.investments.contributions.toFixed(2)}`} />
                <MetricChip label="Withdrawals" value={`$${metrics.investments.withdrawals.toFixed(2)}`} />
                <MetricChip label="Net Investing" value={`$${metrics.investments.net_investing.toFixed(2)}`} />
                <MetricChip label="Investment Income" value={`$${metrics.investments.income.toFixed(2)}`} />
              </div>
            )}

            {activeTab === 'credit' && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <MetricChip label="Estimated Card Spend" value={`$${metrics.credit_cards.estimated_card_spend.toFixed(2)}`} />
                <MetricChip label="Estimated Card Payments" value={`$${metrics.credit_cards.estimated_card_payments.toFixed(2)}`} />
                <MetricChip label="Interest & Fees" value={`$${metrics.credit_cards.estimated_interest_and_fees.toFixed(2)}`} />
                <MetricChip
                  label="Utilization Risk"
                  value={metrics.credit_cards.utilization_risk}
                  valueClassName={badgeColor(metrics.credit_cards.utilization_risk)}
                />
              </div>
            )}

            {activeTab === 'emergency' && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <MetricChip label="Essentials / Month" value={`$${metrics.emergency_fund.essentials_monthly.toFixed(2)}`} />
                <MetricChip label="Estimated Fund" value={`$${metrics.emergency_fund.estimated_fund.toFixed(2)}`} />
                <MetricChip label="Coverage" value={`${metrics.emergency_fund.months_covered.toFixed(1)} months`} />
                <MetricChip label="Funding Gap" value={`$${metrics.emergency_fund.funding_gap.toFixed(2)}`} />
              </div>
            )}

            {activeTab === 'loans' && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <MetricChip label="Estimated Loan Payments" value={`$${metrics.loans.estimated_monthly_payments.toFixed(2)}`} />
                <MetricChip label="Payment Ratio" value={`${(metrics.loans.loan_payment_ratio * 100).toFixed(1)}%`} />
                <MetricChip
                  label="Burden"
                  value={metrics.loans.burden}
                  valueClassName={badgeColor(metrics.loans.burden)}
                />
              </div>
            )}

            {activeTab === 'intelligence' && (
              <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                <InsightBlock title="Strengths" items={metrics.intelligence.strengths} accent="text-green-300" />
                <InsightBlock title="Risks" items={metrics.intelligence.risks} accent="text-red-300" />
                <InsightBlock title="Opportunities" items={metrics.intelligence.opportunities} accent="text-yellow-300" />
                <InsightBlock title="Next Actions" items={metrics.intelligence.next_actions} accent="text-blue-300" />
              </div>
            )}
          </div>
        </>
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

function MetricChip({
  label,
  value,
  valueClassName = 'text-blue-100',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-4">
      <p className="text-xs text-blue-300 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${valueClassName}`}>{value}</p>
    </div>
  )
}

function InsightBlock({
  title,
  items,
  accent,
}: {
  title: string
  items: string[]
  accent: string
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-4">
      <p className={`font-semibold mb-2 ${accent}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-blue-300">No insights detected for this section.</p>
      ) : (
        <ul className="space-y-1 text-blue-100">
          {items.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
