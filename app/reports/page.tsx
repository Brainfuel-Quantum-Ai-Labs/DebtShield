import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

interface Plan {
  id: string
  overview: string
  top_risks: string[]
  weekly_actions: string[]
  monthly_targets: string[]
  disclaimers: string[]
  created_at: string
}

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createSupabaseServiceClient()
  const { data: plans } = await serviceClient
    .from('plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const plan: Plan | null = plans?.[0] ?? null

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <Link href="/" className="text-xl font-bold">🛡️ DebtShield AI</Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-blue-300 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Your AI Financial Plan</h1>

        {!plan ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No plan yet</h2>
            <p className="text-blue-300 mb-6">
              Go to your dashboard and click &quot;Generate AI Plan&quot; to create your personalized financial plan.
            </p>
            <Link
              href="/dashboard"
              className="bg-blue-500 hover:bg-blue-400 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
              <h2 className="text-sm font-medium text-blue-300 uppercase tracking-wider mb-3">Overview</h2>
              <p className="text-lg leading-relaxed">{plan.overview}</p>
              <p className="text-xs text-blue-400 mt-3">
                Generated: {new Date(plan.created_at).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PlanSection
                title="⚠️ Top Risks"
                items={plan.top_risks}
                color="bg-red-500/10 border-red-500/30"
              />
              <PlanSection
                title="✅ Weekly Actions"
                items={plan.weekly_actions}
                color="bg-green-500/10 border-green-500/30"
              />
              <PlanSection
                title="🎯 Monthly Targets"
                items={plan.monthly_targets}
                color="bg-blue-500/10 border-blue-500/30"
              />
              <PlanSection
                title="📋 Disclaimers"
                items={plan.disclaimers}
                color="bg-gray-500/10 border-gray-500/30"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function PlanSection({
  title,
  items,
  color,
}: {
  title: string
  items: string[]
  color: string
}) {
  return (
    <div className={`border rounded-2xl p-6 ${color}`}>
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-blue-100 flex items-start gap-2">
            <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
