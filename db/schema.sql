-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table is handled by Supabase Auth (auth.users)

-- Plaid items (one per connected bank account set)
create table if not exists plaid_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null, -- encrypted/server-only
  item_id text not null,
  institution_name text,
  cursor text, -- for transactions sync
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions synced from Plaid
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id uuid not null references plaid_items(id) on delete cascade,
  plaid_transaction_id text not null unique,
  amount numeric not null,
  date date not null,
  name text,
  category text[],
  pending boolean default false,
  created_at timestamptz default now()
);

-- Computed financial metrics
create table if not exists metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  income numeric not null default 0,
  expenses numeric not null default 0,
  cashflow numeric not null default 0,
  savings_rate numeric not null default 0,
  transaction_count int not null default 0,
  income_sources jsonb not null default '[]',
  expense_categories jsonb not null default '[]',
  investments jsonb not null default '{}',
  credit_cards jsonb not null default '{}',
  loans jsonb not null default '{}',
  emergency_fund jsonb not null default '{}',
  financial_services jsonb not null default '{}',
  intelligence jsonb not null default '{}',
  computed_at timestamptz default now()
);

alter table metrics add column if not exists income_sources jsonb not null default '[]';
alter table metrics add column if not exists expense_categories jsonb not null default '[]';
alter table metrics add column if not exists investments jsonb not null default '{}';
alter table metrics add column if not exists credit_cards jsonb not null default '{}';
alter table metrics add column if not exists loans jsonb not null default '{}';
alter table metrics add column if not exists emergency_fund jsonb not null default '{}';
alter table metrics add column if not exists financial_services jsonb not null default '{}';
alter table metrics add column if not exists intelligence jsonb not null default '{}';

-- DebtShield scores
create table if not exists scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  band text not null, -- Excellent/Good/Warning/Critical
  reasons jsonb not null default '[]',
  computed_at timestamptz default now()
);

-- AI financial plans
create table if not exists plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  overview text,
  top_risks jsonb not null default '[]',
  weekly_actions jsonb not null default '[]',
  monthly_targets jsonb not null default '[]',
  disclaimers jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Internal admin locks (used by service-role jobs like metrics backfill)
create table if not exists admin_locks (
  lock_key text primary key,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Row Level Security
alter table plaid_items enable row level security;
alter table transactions enable row level security;
alter table metrics enable row level security;
alter table scores enable row level security;
alter table plans enable row level security;

-- RLS policies (service role bypasses these; anon/authenticated users see only their own rows)
create policy "Users can view own plaid_items" on plaid_items for select using (auth.uid() = user_id);
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can view own metrics" on metrics for select using (auth.uid() = user_id);
create policy "Users can view own scores" on scores for select using (auth.uid() = user_id);
create policy "Users can view own plans" on plans for select using (auth.uid() = user_id);
