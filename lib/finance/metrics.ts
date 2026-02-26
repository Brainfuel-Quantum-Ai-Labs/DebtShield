export interface Transaction {
  amount: number
  date: string
  name?: string | null
  category?: string[] | null
  pending: boolean
}

export interface FinancialMetrics {
  income: number
  expenses: number
  cashflow: number
  savings_rate: number
  transaction_count: number
  period_start: string
  period_end: string
}

export function computeMetrics(transactions: Transaction[]): FinancialMetrics {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const periodStart = thirtyDaysAgo.toISOString().split('T')[0]
  const periodEnd = now.toISOString().split('T')[0]

  // Filter to last 30 days, exclude pending
  const recent = transactions.filter((t) => {
    const txDate = new Date(t.date)
    return txDate >= thirtyDaysAgo && txDate <= now && !t.pending
  })

  let income = 0
  let expenses = 0

  for (const tx of recent) {
    if (tx.amount < 0) {
      // Plaid: negative amounts are credits (money coming in)
      income += Math.abs(tx.amount)
    } else {
      // Positive amounts are debits (money going out)
      expenses += tx.amount
    }
  }

  const cashflow = income - expenses
  const savings_rate = income > 0 ? Math.max(0, cashflow) / income : 0

  return {
    income: parseFloat(income.toFixed(2)),
    expenses: parseFloat(expenses.toFixed(2)),
    cashflow: parseFloat(cashflow.toFixed(2)),
    savings_rate: parseFloat(savings_rate.toFixed(4)),
    transaction_count: recent.length,
    period_start: periodStart,
    period_end: periodEnd,
  }
}
