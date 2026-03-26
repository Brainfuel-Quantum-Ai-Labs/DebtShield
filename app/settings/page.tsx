import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { getCredits } from '@/lib/credits'
import NavBar from '@/app/components/NavBar'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createSupabaseServiceClient()
  const { data: banks } = await serviceClient
    .from('plaid_items')
    .select('id, institution_name, created_at, item_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  let credits: number | null = null
  try { credits = await getCredits(user.id) } catch { /* non-fatal */ }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
      <NavBar credits={credits} email={user.email} />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <SettingsClient
          email={user.email ?? ''}
          banks={banks ?? []}
        />
      </div>
    </main>
  )
}
