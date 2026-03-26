'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

interface PlaidItem {
  id: string
  institution_name: string | null
  created_at: string
  item_id: string
}

interface Props {
  email: string
  banks: PlaidItem[]
}

export default function SettingsClient({ email, banks: initialBanks }: Props) {
  const router = useRouter()
  const [banks, setBanks] = useState<PlaidItem[]>(initialBanks)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const disconnectBank = async (plaidItemId: string, name: string) => {
    if (!confirm(`Disconnect "${name || 'this bank'}"? All associated transactions will be removed.`)) return

    setDisconnecting(plaidItemId)
    setDisconnectError(null)

    try {
      const res = await fetch('/api/settings/disconnect-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaid_item_id: plaidItemId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBanks(prev => prev.filter(b => b.id !== plaidItemId))
    } catch (err) {
      setDisconnectError(err instanceof Error ? err.message : 'Failed to disconnect bank')
    } finally {
      setDisconnecting(null)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters')
      return
    }

    setPwLoading(true)
    const supabase = createSupabaseClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPwError(error.message)
    } else {
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    }
    setPwLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Account info */}
      <section className="bg-white/10 border border-white/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs text-blue-300 uppercase tracking-wider mb-0.5">Email</p>
          <p className="text-white">{email}</p>
        </div>
      </section>

      {/* Password change */}
      <section className="bg-white/10 border border-white/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        {pwSuccess && (
          <div className="bg-green-500/20 border border-green-500/40 text-green-200 rounded-lg px-4 py-3 mb-4 text-sm">
            Password updated successfully. Redirecting to dashboard…
          </div>
        )}
        {pwError && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
            {pwError}
          </div>
        )}
        <form onSubmit={changePassword} className="space-y-3">
          {[
            { label: 'New Password', value: newPassword, onChange: setNewPassword, placeholder: 'Min. 8 characters' },
            { label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword, placeholder: '••••••••' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-sm font-medium text-blue-200 mb-1">{field.label}</label>
              <input
                type="password"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                required
                placeholder={field.placeholder}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={pwLoading}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            {pwLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </section>

      {/* Connected banks */}
      <section className="bg-white/10 border border-white/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Connected Banks</h2>
          <a href="/connect" className="text-sm text-blue-300 hover:text-white transition-colors">
            + Connect New Bank
          </a>
        </div>

        {disconnectError && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
            {disconnectError}
          </div>
        )}

        {banks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-blue-400 text-sm mb-3">No banks connected yet.</p>
            <a href="/connect" className="bg-blue-500 hover:bg-blue-400 px-5 py-2 rounded-lg font-semibold text-sm transition-colors">
              Connect a Bank
            </a>
          </div>
        ) : (
          <ul className="space-y-2">
            {banks.map(bank => (
              <li key={bank.id} className="flex items-center justify-between rounded-lg border border-white/20 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{bank.institution_name ?? 'Unknown Institution'}</p>
                  <p className="text-xs text-blue-400 mt-0.5">
                    Connected {new Date(bank.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => disconnectBank(bank.id, bank.institution_name ?? '')}
                  disabled={disconnecting === bank.id}
                  className="text-xs bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {disconnecting === bank.id ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
