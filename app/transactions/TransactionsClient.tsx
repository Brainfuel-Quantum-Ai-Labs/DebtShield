'use client'

import { useState, useMemo } from 'react'

interface Transaction {
  id: string
  amount: number
  date: string
  name: string | null
  category: string[] | null
  pending: boolean
  created_at: string
}

type FilterType = 'all' | 'income' | 'expense'

// Mirror of classifyExpenseCategory from metrics.ts for display purposes
function topCategory(category: string[] | null, name: string | null): string {
  const label = `${(name ?? '').toLowerCase()} ${(category ?? []).join(' ').toLowerCase()}`
  if (/rent|mortgage|property|housing|landlord/.test(label)) return 'Housing'
  if (/grocery|restaurant|food|coffee|dining/.test(label)) return 'Food & Dining'
  if (/gas|fuel|uber|lyft|transit|transport|parking|toll/.test(label)) return 'Transportation'
  if (/utilities|electric|water|internet|phone|mobile/.test(label)) return 'Utilities'
  if (/medical|health|doctor|pharmacy|dental/.test(label)) return 'Healthcare'
  if (/shopping|retail|amazon|clothing/.test(label)) return 'Shopping'
  if (/travel|hotel|airline|vacation/.test(label)) return 'Travel'
  if (/education|tuition|course|training/.test(label)) return 'Education'
  if (/entertainment|movie|music|games|stream/.test(label)) return 'Entertainment'
  if (/loan|student loan|auto loan|mortgage payment/.test(label)) return 'Loan'
  if (/credit card|card payment|amex|chase|discover|citi|capital one/.test(label)) return 'Card Payment'
  if (/insurance/.test(label)) return 'Insurance'
  if (/fee|overdraft|late fee|service charge/.test(label)) return 'Fees'
  if (/payroll|salary|paycheck|direct deposit|wages/.test(label)) return 'Payroll'
  if (/dividend|interest|yield/.test(label)) return 'Investment Income'
  if (/refund|reversal|adjustment/.test(label)) return 'Refund'
  if (/transfer|zelle|venmo|cash app|paypal/.test(label)) return 'Transfer'
  return category?.[0] ?? 'Other'
}

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    'Housing': 'bg-purple-500/20 text-purple-300',
    'Food & Dining': 'bg-orange-500/20 text-orange-300',
    'Transportation': 'bg-cyan-500/20 text-cyan-300',
    'Utilities': 'bg-blue-500/20 text-blue-300',
    'Healthcare': 'bg-red-500/20 text-red-300',
    'Shopping': 'bg-pink-500/20 text-pink-300',
    'Travel': 'bg-teal-500/20 text-teal-300',
    'Entertainment': 'bg-yellow-500/20 text-yellow-300',
    'Loan': 'bg-red-600/20 text-red-400',
    'Card Payment': 'bg-indigo-500/20 text-indigo-300',
    'Insurance': 'bg-slate-500/20 text-slate-300',
    'Fees': 'bg-red-700/20 text-red-400',
    'Payroll': 'bg-green-500/20 text-green-300',
    'Investment Income': 'bg-emerald-500/20 text-emerald-300',
    'Refund': 'bg-lime-500/20 text-lime-300',
    'Transfer': 'bg-sky-500/20 text-sky-300',
  }
  return map[cat] ?? 'bg-white/10 text-blue-300'
}

export default function TransactionsClient({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [showPending, setShowPending] = useState(true)

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (!showPending && tx.pending) return false
      if (filter === 'income' && tx.amount >= 0) return false
      if (filter === 'expense' && tx.amount < 0) return false
      if (search) {
        const q = search.toLowerCase()
        const inName = (tx.name ?? '').toLowerCase().includes(q)
        const inCat = (tx.category ?? []).some(c => c.toLowerCase().includes(q))
        if (!inName && !inCat) return false
      }
      return true
    })
  }, [transactions, filter, search, showPending])

  const totalIncome = useMemo(
    () => transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions]
  )
  const totalExpense = useMemo(
    () => transactions.filter(t => t.amount >= 0).reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-blue-300 mb-4">No transactions synced yet.</p>
        <a href="/connect" className="bg-blue-500 hover:bg-blue-400 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          Connect a Bank
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/10 border border-white/20 rounded-xl p-4">
          <p className="text-xs text-blue-400 uppercase tracking-wider">Total Transactions</p>
          <p className="text-2xl font-bold mt-1">{transactions.length}</p>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-xl p-4">
          <p className="text-xs text-blue-400 uppercase tracking-wider">Income (credits)</p>
          <p className="text-2xl font-bold mt-1 text-green-400">
            ${totalIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-xl p-4">
          <p className="text-xs text-blue-400 uppercase tracking-wider">Expenses (debits)</p>
          <p className="text-2xl font-bold mt-1 text-red-400">
            ${totalExpense.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm rounded-lg capitalize transition-colors ${
                filter === f ? 'bg-blue-500 text-white font-semibold' : 'bg-white/5 text-blue-300 hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={() => setShowPending(!showPending)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              showPending ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-white/5 text-blue-400'
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-blue-400">
        Showing {filtered.length} of {transactions.length} transactions
      </p>

      {/* Table */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center text-blue-400 py-8 text-sm">No transactions match your filters.</p>
        ) : (
          filtered.map(tx => {
            const isCredit = tx.amount < 0
            const display = isCredit ? Math.abs(tx.amount) : tx.amount
            const cat = topCategory(tx.category, tx.name)
            return (
              <div
                key={tx.id}
                className={`flex items-center gap-3 rounded-lg border border-white/15 px-4 py-3 ${
                  tx.pending ? 'opacity-60' : 'bg-white/5'
                }`}
              >
                <div className="w-8 text-center text-lg shrink-0">
                  {isCredit ? '⬇' : '⬆'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{tx.name ?? 'Unknown'}</p>
                  <p className="text-xs text-blue-400">{tx.date}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full hidden sm:inline ${categoryColor(cat)}`}>
                  {cat}
                </span>
                {tx.pending && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full shrink-0">
                    Pending
                  </span>
                )}
                <span className={`text-sm font-bold shrink-0 ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                  {isCredit ? '+' : '-'}${display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
