import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { getCredits } from '@/lib/credits'
import NavBar from '@/app/components/NavBar'
import TransactionsClient from './TransactionsClient'

interface Transaction {
  id: string
  amount: number
  date: string
  name: string | null
  category: string[] | null
  pending: boolean
  created_at: string
}

export default async function TransactionsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createSupabaseServiceClient()
  const { data: rows } = await serviceClient
    .from('transactions')
    .select('id, amount, date, name, category, pending, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(500)

  let credits: number | null = null
  try { credits = await getCredits(user.id) } catch { /* non-fatal */ }

  const transactions: Transaction[] = rows ?? []

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
      <NavBar credits={credits} email={user.email} />

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Transactions</h1>
        <TransactionsClient transactions={transactions} />
      </div>
    </main>
  )
}
