import type { FinancialMetrics } from './metrics'

export interface ScoreResult {
  score: number
  band: 'Excellent' | 'Good' | 'Warning' | 'Critical'
  reasons: string[]
}

export function computeScore(metrics: FinancialMetrics): ScoreResult {
  let score = 100
  const reasons: string[] = []

  const { income, expenses, savings_rate, cashflow } = metrics

  // Penalize high expense/income ratio
  const expenseRatio = income > 0 ? expenses / income : 1
  if (expenseRatio > 0.9) {
    const penalty = Math.min(30, Math.round((expenseRatio - 0.9) * 150))
    score -= penalty
    reasons.push(`High expense-to-income ratio (${(expenseRatio * 100).toFixed(1)}%)`)
  } else if (expenseRatio > 0.7) {
    const penalty = Math.min(15, Math.round((expenseRatio - 0.7) * 75))
    score -= penalty
    reasons.push(`Moderate expense-to-income ratio (${(expenseRatio * 100).toFixed(1)}%)`)
  }

  // Penalize low or negative savings rate
  if (savings_rate < 0.05) {
    const penalty = Math.round((0.05 - savings_rate) * 200)
    score -= Math.min(25, penalty)
    reasons.push(`Low savings rate (${(savings_rate * 100).toFixed(1)}%)`)
  }

  // Penalize negative cashflow
  if (cashflow < 0) {
    const penalty = Math.min(20, Math.round(Math.abs(cashflow) / Math.max(1, income) * 100))
    score -= penalty
    reasons.push(`Negative cashflow ($${Math.abs(cashflow).toFixed(2)} deficit)`)
  }

  // Penalize if no income detected
  if (income === 0) {
    score -= 20
    reasons.push('No income detected in the last 30 days')
  }

  score = Math.max(0, Math.min(100, score))

  let band: ScoreResult['band']
  if (score >= 80) band = 'Excellent'
  else if (score >= 60) band = 'Good'
  else if (score >= 40) band = 'Warning'
  else band = 'Critical'

  return { score, band, reasons }
}
