'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

interface NavBarProps {
  credits?: number | null
  email?: string | null
}

export default function NavBar({ credits, email }: NavBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        pathname === href
          ? 'text-white font-semibold'
          : 'text-blue-300 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10">
      <Link href="/dashboard" className="text-xl font-bold text-white flex items-center gap-2 shrink-0">
        🛡️ <span className="hidden sm:inline">DebtShield AI</span>
      </Link>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden md:flex items-center gap-5">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/transactions', 'Transactions')}
          {navLink('/reports', 'Reports')}
          {navLink('/settings', 'Settings')}
        </div>

        {typeof credits === 'number' && (
          <Link
            href="/billing"
            className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 hover:border-yellow-400/60 rounded-lg px-2.5 py-1.5 text-sm transition-colors"
            title="Your credit balance — click to buy more"
          >
            <span className="text-yellow-400">⚡</span>
            <span className="text-yellow-200 font-bold">{credits}</span>
            <span className="text-yellow-400/70 hidden sm:inline text-xs">credits</span>
          </Link>
        )}

        {email && (
          <span className="text-blue-400 text-xs hidden lg:block truncate max-w-[140px]">
            {email}
          </span>
        )}

        <button
          onClick={handleLogout}
          className="text-sm bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 px-3 py-1.5 rounded-lg text-blue-200 hover:text-red-200 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
