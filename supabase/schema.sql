-- DisasterShield AI (Supabase / Postgres)
-- Run in Supabase SQL editor.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  platform text not null,
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
  payout_amount numeric not null default 0,
  status text not null,
  timestamp timestamptz default now()
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  trigger_score int,
  payout numeric not null default 0,
  fraud_flag boolean not null default false,
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

