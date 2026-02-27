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
  income_sources: Array<{ source: string; amount_usd: number; share_pct: number }>
  expense_categories: Array<{ category: string; amount_usd: number; share_pct: number }>
  investments: {
    contributions_usd: number
    withdrawals_usd: number
    net_investing_usd: number
    income_usd: number
  }
  credit_cards: {
    estimated_spend_usd: number
    estimated_payments_usd: number
    estimated_interest_fees_usd: number
    utilization_risk: string
  }
  loans: {
    estimated_monthly_payments_usd: number
    loan_payment_ratio_pct: number
    burden: string
  }
  emergency_fund: {
    essentials_monthly_usd: number
    estimated_fund_usd: number
    months_covered: number
    target_fund_usd: number
    funding_gap_usd: number
  }
  financial_services: {
    fees_usd: number
    insurance_usd: number
    subscriptions_usd: number
  }
  intelligence: {
    strengths: string[]
    risks: string[]
    opportunities: string[]
    next_actions: string[]
  }
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
    income_sources: metrics.income_sources.map((entry) => ({
      source: entry.source,
      amount_usd: entry.amount,
      share_pct: parseFloat((entry.share * 100).toFixed(2)),
    })),
    expense_categories: metrics.expense_categories.map((entry) => ({
      category: entry.category,
      amount_usd: entry.amount,
      share_pct: parseFloat((entry.share * 100).toFixed(2)),
    })),
    investments: {
      contributions_usd: metrics.investments.contributions,
      withdrawals_usd: metrics.investments.withdrawals,
      net_investing_usd: metrics.investments.net_investing,
      income_usd: metrics.investments.income,
    },
    credit_cards: {
      estimated_spend_usd: metrics.credit_cards.estimated_card_spend,
      estimated_payments_usd: metrics.credit_cards.estimated_card_payments,
      estimated_interest_fees_usd: metrics.credit_cards.estimated_interest_and_fees,
      utilization_risk: metrics.credit_cards.utilization_risk,
    },
    loans: {
      estimated_monthly_payments_usd: metrics.loans.estimated_monthly_payments,
      loan_payment_ratio_pct: parseFloat((metrics.loans.loan_payment_ratio * 100).toFixed(2)),
      burden: metrics.loans.burden,
    },
    emergency_fund: {
      essentials_monthly_usd: metrics.emergency_fund.essentials_monthly,
      estimated_fund_usd: metrics.emergency_fund.estimated_fund,
      months_covered: metrics.emergency_fund.months_covered,
      target_fund_usd: metrics.emergency_fund.target_fund,
      funding_gap_usd: metrics.emergency_fund.funding_gap,
    },
    financial_services: {
      fees_usd: metrics.financial_services.fees,
      insurance_usd: metrics.financial_services.insurance,
      subscriptions_usd: metrics.financial_services.subscriptions,
    },
    intelligence: {
      strengths: metrics.intelligence.strengths,
      risks: metrics.intelligence.risks,
      opportunities: metrics.intelligence.opportunities,
      next_actions: metrics.intelligence.next_actions,
    },
  }
}
