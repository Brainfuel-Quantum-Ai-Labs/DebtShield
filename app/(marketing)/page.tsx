import Link from 'next/link'

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white">
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">🛡️ DebtShield AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-blue-200 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center justify-center px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-800/50 border border-blue-700 rounded-full px-4 py-1.5 text-sm text-blue-200 mb-8">
          <span>✨</span> Powered by Anthropic Claude AI
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Take Control of Your
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            Financial Future
          </span>
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mb-10">
          DebtShield AI connects your bank accounts, analyzes your spending, computes your
          financial health score, and generates a personalized AI-powered debt elimination plan.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup"
            className="bg-blue-500 hover:bg-blue-400 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/25"
          >
            Start for Free →
          </Link>
          <Link
            href="#features"
            className="border border-blue-500 hover:bg-blue-800/50 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            See How It Works
          </Link>
        </div>
      </section>

      <section id="features" className="px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Everything You Need to Get Debt-Free</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🏦',
              title: 'Secure Bank Connection',
              desc: 'Connect your accounts securely via Plaid. We never store your banking credentials.',
            },
            {
              icon: '📊',
              title: 'Real-Time Financial Score',
              desc: "Get your DebtShield score (0–100) with detailed explanations of what's impacting your financial health.",
            },
            {
              icon: '🤖',
              title: 'AI-Powered Action Plan',
              desc: 'Claude AI analyzes your situation and creates a personalized weekly and monthly action plan.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-blue-200">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-8 text-blue-400 text-sm">
        © {new Date().getFullYear()} DebtShield AI. For informational purposes only. Not financial advice.
      </footer>
    </main>
  )
}
