# 🛡️ DebtShield AI

AI-powered debt elimination and financial health platform built with Next.js 14, Supabase, Plaid, and Anthropic Claude.

## Features

- **Secure Bank Connection** – Connect accounts via Plaid (sandbox/development/production)
- **Financial Metrics** – Computes income, expenses, cashflow, and savings rate over the last 30 days
- **DebtShield Score** – 0–100 score with Excellent/Good/Warning/Critical bands
- **AI Financial Plan** – Personalized weekly actions, monthly targets, and risk analysis via Claude

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Auth & Database**: Supabase (PostgreSQL + Row Level Security)
- **Bank Data**: Plaid API (Transactions)
- **AI**: Anthropic Claude (`claude-3-5-sonnet-latest`)

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd DebtShield
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `PLAID_CLIENT_ID` | Plaid client ID |
| `PLAID_SECRET` | Plaid secret (sandbox/dev/prod) |
| `PLAID_ENV` | `sandbox`, `development`, or `production` |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_MODEL` | Model name (default: `claude-3-5-sonnet-latest`) |
| `NEXT_PUBLIC_APP_URL` | App base URL (e.g., `http://localhost:3000`) |

### 3. Database Setup

Run the schema in your Supabase SQL editor:

```bash
# Copy contents of db/schema.sql and run in Supabase SQL editor
```

This creates tables: `plaid_items`, `transactions`, `metrics`, `scores`, `plans` — all with Row Level Security enabled.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Application Flow

1. **Sign up / Log in** → Supabase Auth
2. **Connect Bank** → Plaid Link widget → exchange token → sync transactions
3. **Dashboard** → View computed score and metrics, trigger recompute
4. **Generate AI Plan** → Claude analyzes anonymized financial summary
5. **Reports** → View AI-generated financial plan

## Project Structure

```
app/
  (marketing)/    # Landing page
  (auth)/         # Login & signup pages
  connect/        # Plaid bank connection flow
  dashboard/      # Financial dashboard
  reports/        # AI plan reports
  api/
    plaid/        # link-token, exchange-token, sync
    compute/      # metrics, score
    ai/           # plan generation
lib/
  supabase/       # Server & client Supabase helpers
  finance/        # metrics, scoring, sanitize utilities
  plaid.ts        # Plaid client
  anthropic.ts    # Anthropic client
  rateLimit.ts    # In-memory rate limiter
db/
  schema.sql      # Database schema with RLS
```

## Security Notes

- All API routes are authenticated via Supabase session cookies
- Rate limiting applied to all API endpoints (in-memory, MVP-grade)
- Transaction data is anonymized before being sent to the AI
- Plaid access tokens are stored server-side only (never exposed to client)
- Row Level Security ensures users can only access their own data

## Disclaimer

This application is for informational purposes only and does not constitute financial advice.
