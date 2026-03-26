import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { getCredits } from '@/lib/credits'
import NavBar from '@/app/components/NavBar'

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
    .limit(5)

  const plan: Plan | null = plans?.[0] ?? null
  const history: Plan[] = plans?.slice(1) ?? []

  let credits: number | null = null
  try { credits = await getCredits(user.id) } catch { /* non-fatal */ }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
      <NavBar credits={credits} email={user.email} />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Your AI Financial Plan</h1>

        {!plan ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No plan yet</h2>
            <p className="text-blue-300 mb-6">
              Go to your dashboard and click &quot;Generate AI Plan&quot; to create your personalised financial plan.
            </p>
            <a
              href="/dashboard"
              className="bg-blue-500 hover:bg-blue-400 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
              <p className="text-xs font-medium text-blue-300 uppercase tracking-wider mb-3">Overview</p>
              <p className="text-lg leading-relaxed">{plan.overview}</p>
              <p className="text-xs text-blue-400 mt-3">
                Generated: {new Date(plan.created_at).toLocaleString()}
              </p>
            </div>

            {/* Plan grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlanSection title="⚠️ Top Risks" items={plan.top_risks} color="bg-red-500/10 border-red-500/30" />
              <PlanSection title="✅ Weekly Actions" items={plan.weekly_actions} color="bg-green-500/10 border-green-500/30" />
              <PlanSection title="🎯 Monthly Targets" items={plan.monthly_targets} color="bg-blue-500/10 border-blue-500/30" />
              <PlanSection title="📋 Disclaimers" items={plan.disclaimers} color="bg-gray-500/10 border-gray-500/30" />
            </div>

            {/* Previous plans */}
            {history.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-sm font-medium text-blue-300 uppercase tracking-wider mb-3">Previous Plans</p>
                <ul className="space-y-2">
                  {history.map(p => (
                    <li key={p.id} className="text-sm text-blue-200 flex items-start gap-2">
                      <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                      <span className="line-clamp-1">{p.overview}</span>
                      <span className="text-blue-500 shrink-0 ml-auto text-xs">{new Date(p.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function PlanSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className={`border rounded-2xl p-6 ${color}`}>
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-blue-100 flex items-start gap-2">
            <span className="text-blue-400 mt-0.5 shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
