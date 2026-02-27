export interface Transaction {
  amount: number
  date: string
  name?: string | null
  category?: string[] | null
  pending: boolean
}

export interface SourceBreakdown {
  source: string
  amount: number
  share: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  share: number
}

export interface InvestmentSnapshot {
  contributions: number
  withdrawals: number
  net_investing: number
  income: number
}

export interface CreditCardSnapshot {
  estimated_card_spend: number
  estimated_card_payments: number
  estimated_interest_and_fees: number
  utilization_risk: 'Low' | 'Moderate' | 'High'
}

export interface LoanSnapshot {
  estimated_monthly_payments: number
  loan_payment_ratio: number
  burden: 'Low' | 'Moderate' | 'High'
}

export interface EmergencyFundSnapshot {
  essentials_monthly: number
  estimated_fund: number
  months_covered: number
  target_fund: number
  funding_gap: number
}

export interface FinancialServiceSnapshot {
  fees: number
  insurance: number
  subscriptions: number
}

export interface IntelligenceSnapshot {
  strengths: string[]
  risks: string[]
  opportunities: string[]
  next_actions: string[]
}

export interface FinancialMetrics {
  income: number
  expenses: number
  cashflow: number
  savings_rate: number
  transaction_count: number
  period_start: string
  period_end: string
  income_sources: SourceBreakdown[]
  expense_categories: CategoryBreakdown[]
  investments: InvestmentSnapshot
  credit_cards: CreditCardSnapshot
  loans: LoanSnapshot
  emergency_fund: EmergencyFundSnapshot
  financial_services: FinancialServiceSnapshot
  intelligence: IntelligenceSnapshot
}

const DEFAULT_INVESTMENTS: InvestmentSnapshot = {
  contributions: 0,
  withdrawals: 0,
  net_investing: 0,
  income: 0,
}

const DEFAULT_CREDIT_CARDS: CreditCardSnapshot = {
  estimated_card_spend: 0,
  estimated_card_payments: 0,
  estimated_interest_and_fees: 0,
  utilization_risk: 'Low',
}

const DEFAULT_LOANS: LoanSnapshot = {
  estimated_monthly_payments: 0,
  loan_payment_ratio: 0,
  burden: 'Low',
}

const DEFAULT_EMERGENCY_FUND: EmergencyFundSnapshot = {
  essentials_monthly: 0,
  estimated_fund: 0,
  months_covered: 0,
  target_fund: 0,
  funding_gap: 0,
}

const DEFAULT_FINANCIAL_SERVICES: FinancialServiceSnapshot = {
  fees: 0,
  insurance: 0,
  subscriptions: 0,
}

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function stringArrayOr(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function readIncomeSources(value: unknown): SourceBreakdown[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const item = entry as Record<string, unknown>
      return {
        source: stringOr(item.source, 'Other Income'),
        amount: numberOr(item.amount, 0),
        share: numberOr(item.share, 0),
      }
    })
    .filter((entry): entry is SourceBreakdown => entry !== null)
}

function readExpenseCategories(value: unknown): CategoryBreakdown[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const item = entry as Record<string, unknown>
      return {
        category: stringOr(item.category, 'Other Expenses'),
        amount: numberOr(item.amount, 0),
        share: numberOr(item.share, 0),
      }
    })
    .filter((entry): entry is CategoryBreakdown => entry !== null)
}

export function toFinancialMetricsFromRow(row: unknown): FinancialMetrics | null {
  if (!row || typeof row !== 'object') return null
  const source = row as Record<string, unknown>

  const period_start = stringOr(source.period_start)
  const period_end = stringOr(source.period_end)
  if (!period_start || !period_end) return null

  const investments = source.investments && typeof source.investments === 'object'
    ? source.investments as Record<string, unknown>
    : {}

  const credit_cards = source.credit_cards && typeof source.credit_cards === 'object'
    ? source.credit_cards as Record<string, unknown>
    : {}

  const loans = source.loans && typeof source.loans === 'object'
    ? source.loans as Record<string, unknown>
    : {}

  const emergency_fund = source.emergency_fund && typeof source.emergency_fund === 'object'
    ? source.emergency_fund as Record<string, unknown>
    : {}

  const financial_services = source.financial_services && typeof source.financial_services === 'object'
    ? source.financial_services as Record<string, unknown>
    : {}

  const intelligence = source.intelligence && typeof source.intelligence === 'object'
    ? source.intelligence as Record<string, unknown>
    : {}

  const utilizationRisk = credit_cards.utilization_risk === 'High' || credit_cards.utilization_risk === 'Moderate' || credit_cards.utilization_risk === 'Low'
    ? credit_cards.utilization_risk
    : DEFAULT_CREDIT_CARDS.utilization_risk

  const burden = loans.burden === 'High' || loans.burden === 'Moderate' || loans.burden === 'Low'
    ? loans.burden
    : DEFAULT_LOANS.burden

  return {
    income: numberOr(source.income),
    expenses: numberOr(source.expenses),
    cashflow: numberOr(source.cashflow),
    savings_rate: numberOr(source.savings_rate),
    transaction_count: numberOr(source.transaction_count),
    period_start,
    period_end,
    income_sources: readIncomeSources(source.income_sources),
    expense_categories: readExpenseCategories(source.expense_categories),
    investments: {
      contributions: numberOr(investments.contributions, DEFAULT_INVESTMENTS.contributions),
      withdrawals: numberOr(investments.withdrawals, DEFAULT_INVESTMENTS.withdrawals),
      net_investing: numberOr(investments.net_investing, DEFAULT_INVESTMENTS.net_investing),
      income: numberOr(investments.income, DEFAULT_INVESTMENTS.income),
    },
    credit_cards: {
      estimated_card_spend: numberOr(credit_cards.estimated_card_spend, DEFAULT_CREDIT_CARDS.estimated_card_spend),
      estimated_card_payments: numberOr(credit_cards.estimated_card_payments, DEFAULT_CREDIT_CARDS.estimated_card_payments),
      estimated_interest_and_fees: numberOr(credit_cards.estimated_interest_and_fees, DEFAULT_CREDIT_CARDS.estimated_interest_and_fees),
      utilization_risk: utilizationRisk,
    },
    loans: {
      estimated_monthly_payments: numberOr(loans.estimated_monthly_payments, DEFAULT_LOANS.estimated_monthly_payments),
      loan_payment_ratio: numberOr(loans.loan_payment_ratio, DEFAULT_LOANS.loan_payment_ratio),
      burden,
    },
    emergency_fund: {
      essentials_monthly: numberOr(emergency_fund.essentials_monthly, DEFAULT_EMERGENCY_FUND.essentials_monthly),
      estimated_fund: numberOr(emergency_fund.estimated_fund, DEFAULT_EMERGENCY_FUND.estimated_fund),
      months_covered: numberOr(emergency_fund.months_covered, DEFAULT_EMERGENCY_FUND.months_covered),
      target_fund: numberOr(emergency_fund.target_fund, DEFAULT_EMERGENCY_FUND.target_fund),
      funding_gap: numberOr(emergency_fund.funding_gap, DEFAULT_EMERGENCY_FUND.funding_gap),
    },
    financial_services: {
      fees: numberOr(financial_services.fees, DEFAULT_FINANCIAL_SERVICES.fees),
      insurance: numberOr(financial_services.insurance, DEFAULT_FINANCIAL_SERVICES.insurance),
      subscriptions: numberOr(financial_services.subscriptions, DEFAULT_FINANCIAL_SERVICES.subscriptions),
    },
    intelligence: {
      strengths: stringArrayOr(intelligence.strengths),
      risks: stringArrayOr(intelligence.risks),
      opportunities: stringArrayOr(intelligence.opportunities),
      next_actions: stringArrayOr(intelligence.next_actions),
    },
  }
}

function normalizeText(value?: string | null): string {
  return (value ?? '').toLowerCase()
}

function sumMap(map: Record<string, number>): number {
  return Object.values(map).reduce((acc, value) => acc + value, 0)
}

function topBreakdown(map: Record<string, number>): { label: string; amount: number; share: number }[] {
  const total = sumMap(map)
  if (total <= 0) return []

  return Object.entries(map)
    .map(([label, amount]) => ({
      label,
      amount: parseFloat(amount.toFixed(2)),
      share: parseFloat((amount / total).toFixed(4)),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
}

function classifyIncomeSource(transaction: Transaction): string {
  const label = `${normalizeText(transaction.name)} ${normalizeText(transaction.category?.join(' '))}`
  if (/payroll|salary|paycheck|direct deposit|wages/.test(label)) return 'Salary / Payroll'
  if (/freelance|contract|gig|stripe|square|upwork|fiverr/.test(label)) return 'Freelance / Side Income'
  if (/dividend|interest|yield|brokerage|investment/.test(label)) return 'Investment Income'
  if (/benefit|social security|unemployment|assistance/.test(label)) return 'Benefits / Assistance'
  if (/refund|reversal|adjustment/.test(label)) return 'Refunds / Adjustments'
  if (/transfer|zelle|venmo|cash app|paypal/.test(label)) return 'Transfers In'
  return 'Other Income'
}

function classifyExpenseCategory(transaction: Transaction): string {
  const label = `${normalizeText(transaction.name)} ${normalizeText(transaction.category?.join(' '))}`
  if (/rent|mortgage|property|housing|landlord/.test(label)) return 'Housing'
  if (/grocery|restaurant|food|coffee|dining/.test(label)) return 'Food & Dining'
  if (/gas|fuel|uber|lyft|transit|transport|parking|toll/.test(label)) return 'Transportation'
  if (/utilities|electric|water|internet|phone|mobile/.test(label)) return 'Utilities'
  if (/medical|health|doctor|pharmacy|dental/.test(label)) return 'Healthcare'
  if (/shopping|retail|amazon|clothing/.test(label)) return 'Shopping'
  if (/travel|hotel|airline|vacation/.test(label)) return 'Travel'
  if (/education|tuition|course|training/.test(label)) return 'Education'
  if (/entertainment|movie|music|games|stream/.test(label)) return 'Entertainment'
  if (/loan|student loan|auto loan|mortgage payment/.test(label)) return 'Loan Payments'
  if (/credit card|card payment|amex|chase|discover|citi|capital one/.test(label)) return 'Credit Card Payments'
  if (/insurance/.test(label)) return 'Insurance'
  if (/fee|overdraft|late fee|service charge|atm fee/.test(label)) return 'Bank Fees'
  return 'Other Expenses'
}

function isInvestmentActivity(transaction: Transaction): boolean {
  const label = `${normalizeText(transaction.name)} ${normalizeText(transaction.category?.join(' '))}`
  return /investment|brokerage|robinhood|fidelity|vanguard|schwab|etrade|coinbase|crypto/.test(label)
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
  let essentials = 0

  const incomeSources: Record<string, number> = {}
  const expenseCategories: Record<string, number> = {}

  let investmentContributions = 0
  let investmentWithdrawals = 0
  let investmentIncome = 0

  let cardSpend = 0
  let cardPayments = 0
  let cardInterestAndFees = 0

  let loanPayments = 0

  let feeExpenses = 0
  let insuranceExpenses = 0
  let subscriptionExpenses = 0

  for (const tx of recent) {
    const category = classifyExpenseCategory(tx)
    const normalized = `${normalizeText(tx.name)} ${normalizeText(tx.category?.join(' '))}`

    if (tx.amount < 0) {
      // Plaid: negative amounts are credits (money coming in)
      const credit = Math.abs(tx.amount)
      income += credit

      const source = classifyIncomeSource(tx)
      incomeSources[source] = (incomeSources[source] ?? 0) + credit

      if (isInvestmentActivity(tx) || /dividend|interest/.test(normalized)) {
        investmentIncome += credit
        investmentWithdrawals += credit
      }
    } else {
      // Positive amounts are debits (money going out)
      expenses += tx.amount

      expenseCategories[category] = (expenseCategories[category] ?? 0) + tx.amount

      if (category === 'Housing' || category === 'Utilities' || category === 'Food & Dining' || category === 'Healthcare' || category === 'Transportation') {
        essentials += tx.amount
      }

      if (isInvestmentActivity(tx)) {
        investmentContributions += tx.amount
      }

      if (/credit card|amex|discover|chase|capital one|citi/.test(normalized)) {
        cardSpend += tx.amount
      }
      if (/card payment|payment thank you|cc payment/.test(normalized) || category === 'Credit Card Payments') {
        cardPayments += tx.amount
      }
      if (/interest|late fee|annual fee/.test(normalized)) {
        cardInterestAndFees += tx.amount
      }

      if (/loan|mortgage|student loan|auto loan/.test(normalized) || category === 'Loan Payments') {
        loanPayments += tx.amount
      }

      if (category === 'Bank Fees') feeExpenses += tx.amount
      if (category === 'Insurance') insuranceExpenses += tx.amount
      if (/subscription|netflix|spotify|hulu|youtube|prime|apple one|membership/.test(normalized)) {
        subscriptionExpenses += tx.amount
      }
    }
  }

  const cashflow = income - expenses
  const savings_rate = income > 0 ? Math.max(0, cashflow) / income : 0

  const incomeTotal = Math.max(1, income)
  const loanPaymentRatio = loanPayments / incomeTotal
  const estimatedFund = Math.max(0, cashflow) * 2 + Math.max(0, investmentWithdrawals * 0.15)
  const targetFund = essentials * 3
  const monthsCovered = essentials > 0 ? estimatedFund / essentials : 0

  const cardPressure = income > 0 ? (cardSpend + cardInterestAndFees) / income : 0
  const utilizationRisk: CreditCardSnapshot['utilization_risk'] =
    cardPressure >= 0.28 ? 'High' : cardPressure >= 0.16 ? 'Moderate' : 'Low'

  const loanBurden: LoanSnapshot['burden'] =
    loanPaymentRatio >= 0.2 ? 'High' : loanPaymentRatio >= 0.1 ? 'Moderate' : 'Low'

  const sourceBreakdown = topBreakdown(incomeSources).map((entry) => ({
    source: entry.label,
    amount: entry.amount,
    share: entry.share,
  }))

  const expenseBreakdown = topBreakdown(expenseCategories).map((entry) => ({
    category: entry.label,
    amount: entry.amount,
    share: entry.share,
  }))

  const strengths: string[] = []
  const risks: string[] = []
  const opportunities: string[] = []
  const nextActions: string[] = []

  if (cashflow > 0) strengths.push(`Positive cashflow of $${cashflow.toFixed(2)} over the last 30 days`)
  if (savings_rate >= 0.2) strengths.push(`Strong savings rate at ${(savings_rate * 100).toFixed(1)}%`)
  if (sourceBreakdown.length >= 2) strengths.push('Income is diversified across multiple sources')

  if (cashflow < 0) risks.push(`Monthly deficit of $${Math.abs(cashflow).toFixed(2)} needs immediate correction`)
  if (monthsCovered < 1) risks.push('Emergency fund coverage appears below 1 month of essentials')
  if (utilizationRisk === 'High') risks.push('Credit card spending pressure appears high relative to income')
  if (loanBurden === 'High') risks.push('Loan payment burden appears high')

  if (subscriptionExpenses > 0) opportunities.push(`Potential subscription optimization: $${subscriptionExpenses.toFixed(2)} / month`)
  if (feeExpenses > 0) opportunities.push(`Reduce bank/late fees currently around $${feeExpenses.toFixed(2)}`)
  if (investmentContributions === 0 && cashflow > 0) opportunities.push('Allocate part of surplus cashflow to long-term investments')

  nextActions.push('Automate transfers for emergency fund and debt paydown on payday')
  nextActions.push('Review top 3 expense categories and set category spending caps')
  nextActions.push('Prioritize highest-interest debt before increasing discretionary spend')

  return {
    income: parseFloat(income.toFixed(2)),
    expenses: parseFloat(expenses.toFixed(2)),
    cashflow: parseFloat(cashflow.toFixed(2)),
    savings_rate: parseFloat(savings_rate.toFixed(4)),
    transaction_count: recent.length,
    period_start: periodStart,
    period_end: periodEnd,
    income_sources: sourceBreakdown,
    expense_categories: expenseBreakdown,
    investments: {
      contributions: parseFloat(investmentContributions.toFixed(2)),
      withdrawals: parseFloat(investmentWithdrawals.toFixed(2)),
      net_investing: parseFloat((investmentContributions - investmentWithdrawals).toFixed(2)),
      income: parseFloat(investmentIncome.toFixed(2)),
    },
    credit_cards: {
      estimated_card_spend: parseFloat(cardSpend.toFixed(2)),
      estimated_card_payments: parseFloat(cardPayments.toFixed(2)),
      estimated_interest_and_fees: parseFloat(cardInterestAndFees.toFixed(2)),
      utilization_risk: utilizationRisk,
    },
    loans: {
      estimated_monthly_payments: parseFloat(loanPayments.toFixed(2)),
      loan_payment_ratio: parseFloat(loanPaymentRatio.toFixed(4)),
      burden: loanBurden,
    },
    emergency_fund: {
      essentials_monthly: parseFloat(essentials.toFixed(2)),
      estimated_fund: parseFloat(estimatedFund.toFixed(2)),
      months_covered: parseFloat(monthsCovered.toFixed(2)),
      target_fund: parseFloat(targetFund.toFixed(2)),
      funding_gap: parseFloat(Math.max(0, targetFund - estimatedFund).toFixed(2)),
    },
    financial_services: {
      fees: parseFloat(feeExpenses.toFixed(2)),
      insurance: parseFloat(insuranceExpenses.toFixed(2)),
      subscriptions: parseFloat(subscriptionExpenses.toFixed(2)),
    },
    intelligence: {
      strengths,
      risks,
      opportunities,
      next_actions: nextActions,
    },
  }
}
