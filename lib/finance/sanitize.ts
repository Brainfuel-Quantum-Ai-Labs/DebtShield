import type { FinancialMetrics } from './metrics'
import type { ScoreResult } from './scoring'

export interface SanitizedFinancialSummary {
  period: string
  income_usd: number
  expenses_usd: number
  cashflow_usd: number
  savings_rate_pct: number
  debtshield_score: number
  score_band: string
  score_reasons: string[]
  transaction_count: number
}

/**
 * Creates a safe, anonymized summary for the LLM.
 * NO raw merchant names, NO account numbers, NO transaction-level data.
 */
export function sanitizeForLLM(
  metrics: FinancialMetrics,
  score: ScoreResult
): SanitizedFinancialSummary {
  return {
    period: `${metrics.period_start} to ${metrics.period_end}`,
    income_usd: metrics.income,
    expenses_usd: metrics.expenses,
    cashflow_usd: metrics.cashflow,
    savings_rate_pct: parseFloat((metrics.savings_rate * 100).toFixed(2)),
    debtshield_score: score.score,
    score_band: score.band,
    score_reasons: score.reasons,
    transaction_count: metrics.transaction_count,
  }
}
