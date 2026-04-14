-- DisasterShield AI (Supabase / Postgres)
-- Run in Supabase SQL editor.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  password_hash text,
  city text not null,
  lat numeric,
  lon numeric,
  expected_income numeric default 5000,
  fraud_count int default 0,
  last_claim_time timestamptz,
  platform text not null,
  role text not null default 'user',
  upi_id text,
  rzp_fund_account_id text,
  created_at timestamptz default now()
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  premium numeric not null,
  coverage numeric not null,
  status text not null default 'ACTIVE',
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  claim_id uuid,
  amount numeric not null default 0,
  payout_amount numeric not null default 0,
  razorpay_payout_id text,
  status text not null,
  created_at timestamptz default now(),
  timestamp timestamptz default now()
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  risk_level text,
  predicted_loss numeric,
  trigger_status boolean,
  trigger_score int,
  fraud_score numeric,
  penalties numeric,
  trust_score numeric,
  decision text,
  final_payout numeric,
  payout numeric not null default 0,
  fraud_flag boolean not null default false,
  weather_snapshot jsonb,
  created_at timestamptz default now()
);

create table if not exists risk_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  city text,
  rainfall numeric,
  temperature numeric,
  aqi numeric,
  delivery_drop numeric,
  risk_level text,
  trigger_score int,
  triggered boolean,
  fraud_flagged boolean,
  created_at timestamptz default now()
);

