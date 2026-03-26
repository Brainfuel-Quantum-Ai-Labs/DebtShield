import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { getCredits, CREDIT_COSTS, INITIAL_FREE_CREDITS } from '@/lib/credits'
import NavBar from '@/app/components/NavBar'

interface UsageEvent {
  event_type: string
  credits_used: number
  created_at: string
}

const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  ai_plan: { label: 'AI Financial Plan', icon: '🤖' },
  sync: { label: 'Transaction Sync', icon: '🔄' },
  score: { label: 'Score Computation', icon: '📊' },
  metrics: { label: 'Metrics Computation', icon: '📈' },
}

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createSupabaseServiceClient()

  let credits = INITIAL_FREE_CREDITS
  try { credits = await getCredits(user.id) } catch { /* non-fatal */ }

  const { data: events } = await serviceClient
    .from('usage_events')
    .select('event_type, credits_used, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const usage: UsageEvent[] = events ?? []
  const totalUsed = usage.reduce((sum, e) => sum + e.credits_used, 0)

  const bandColor = credits === 0 ? 'text-red-400 border-red-400/30 bg-red-400/10'
    : credits <= 5 ? 'text-yellow-300 border-yellow-400/30 bg-yellow-400/10'
    : 'text-green-300 border-green-400/30 bg-green-400/10'

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
      <NavBar credits={credits} email={user.email} />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Billing & Credits</h1>

        {/* Balance card */}
        <div className={`rounded-2xl border p-8 text-center mb-8 ${bandColor}`}>
          <p className="text-sm uppercase tracking-wider opacity-70 mb-2">Current Balance</p>
          <p className="text-7xl font-extrabold mb-2">{credits}</p>
          <p className="text-lg opacity-80">credits remaining</p>
          {credits <= 5 && credits > 0 && (
            <p className="text-sm mt-3 opacity-90">Low balance — top up before your next analysis.</p>
          )}
          {credits === 0 && (
            <p className="text-sm mt-3">You have no credits. Top up to continue using DebtShield AI.</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Credit cost reference */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mb-4">Credit Costs</h2>
            <div className="space-y-3">
              {(Object.entries(CREDIT_COSTS) as [keyof typeof CREDIT_COSTS, number][]).map(([key, cost]) => {
                const meta = EVENT_LABELS[key]
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-blue-100">{meta.icon} {meta.label}</span>
                    <span className="text-sm font-bold text-yellow-300">{cost} ⚡</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-blue-400">
              New accounts receive {INITIAL_FREE_CREDITS} free credits. Credits never expire.
            </div>
          </div>

          {/* Buy more credits (placeholder — wire Stripe here) */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mb-4">Top Up Credits</h2>
            <div className="space-y-3 flex-1">
              {[
                { pack: 'Starter', credits: 50, price: '$4.99', popular: false },
                { pack: 'Growth', credits: 150, price: '$9.99', popular: true },
                { pack: 'Pro', credits: 400, price: '$19.99', popular: false },
              ].map(option => (
                <div
                  key={option.pack}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    option.popular
                      ? 'border-blue-400/50 bg-blue-500/10'
                      : 'border-white/15 bg-white/5'
                  }`}
                >
                  <div>
                    <span className="text-sm font-semibold">{option.pack}</span>
                    {option.popular && (
                      <span className="ml-2 text-xs bg-blue-500 px-1.5 py-0.5 rounded text-white">Popular</span>
                    )}
                    <p className="text-xs text-blue-400">{option.credits} credits</p>
                  </div>
                  <button
                    disabled
                    className="text-sm bg-blue-500/50 text-blue-200 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-60"
                    title="Stripe integration coming soon"
                  >
                    {option.price}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-500 mt-4">Payment integration coming soon.</p>
          </div>
        </div>

        {/* Usage history */}
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">Usage History</h2>
            <span className="text-xs text-blue-400">{totalUsed} credits used total</span>
          </div>

          {usage.length === 0 ? (
            <p className="text-sm text-blue-400 text-center py-6">No usage yet — your operations will appear here.</p>
          ) : (
            <div className="space-y-1">
              {usage.map((event, i) => {
                const meta = EVENT_LABELS[event.event_type] ?? { label: event.event_type, icon: '⚡' }
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      <div>
                        <p className="text-sm text-blue-100">{meta.label}</p>
                        <p className="text-xs text-blue-400">{new Date(event.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-yellow-300">−{event.credits_used} ⚡</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
