'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlaidLink, PlaidLinkOnSuccess } from 'react-plaid-link'

export default function ConnectPage() {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [fetchAttempt, setFetchAttempt] = useState(0)

  useEffect(() => {
    setLinkToken(null)
    fetch('/api/plaid/link-token', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setLinkToken(data.link_token)
        }
      })
      .catch(() => setError('Failed to initialize bank connection'))
  }, [fetchAttempt])

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      setSyncing(true)
      setStatus('Exchanging token...')

      try {
        const exchangeRes = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            institution_name: metadata?.institution?.name,
          }),
        })
        const exchangeData = await exchangeRes.json()
        if (!exchangeRes.ok) throw new Error(exchangeData.error)

        setStatus('Syncing transactions...')
        const syncRes = await fetch('/api/plaid/sync', { method: 'POST' })
        const syncData = await syncRes.json()
        if (!syncRes.ok) throw new Error(syncData.error)

        setStatus('Computing metrics...')
        const metricsRes = await fetch('/api/compute/metrics', { method: 'POST' })
        const metricsData = await metricsRes.json()
        if (!metricsRes.ok) throw new Error(metricsData.error)

        setStatus('Computing score...')
        const scoreRes = await fetch('/api/compute/score', { method: 'POST' })
        const scoreData = await scoreRes.json()
        if (!scoreRes.ok) throw new Error(scoreData.error)

        setStatus(`Done! Score: ${scoreData.score?.score} (${scoreData.score?.band})`)
        setTimeout(() => router.push('/dashboard'), 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setSyncing(false)
      }
    },
    [router]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess,
    onExit: () => setError(null),
  })

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
        <div className="text-center text-white">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setFetchAttempt((n) => n + 1) }}
            className="bg-blue-500 hover:bg-blue-400 px-6 py-2 rounded-lg text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="text-center text-white max-w-md w-full">
        <div className="text-6xl mb-4">🏦</div>
        <h1 className="text-3xl font-bold mb-4">Connect Your Bank</h1>
        <p className="text-blue-200 mb-8">
          Securely connect your bank account using Plaid. We never store your login credentials.
        </p>

        {syncing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-blue-200">{status}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => open()}
            disabled={!ready || !linkToken}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-wait px-8 py-4 rounded-xl font-bold text-lg transition-colors w-full"
          >
            {linkToken ? 'Connect Bank Account' : 'Loading...'}
          </button>
        )}

        <p className="text-xs text-blue-400 mt-6">
          Protected by bank-level 256-bit encryption. We use Plaid to securely access your data.
        </p>
      </div>
    </main>
  )
}
