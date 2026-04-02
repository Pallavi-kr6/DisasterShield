-- Migration: Auth + Trust Decision Engine + Persistence fields
-- Run in Supabase SQL editor after initial schema.sql (safe-ish with IF EXISTS guards).

-- -------------------------
-- USERS: add email/password/role
-- -------------------------
alter table if exists users
  add column if not exists email text unique,
  add column if not exists password_hash text,
  add column if not exists role text not null default 'user';

-- Basic constraint (optional)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_role_check'
  ) then
    alter table users
      add constraint users_role_check check (role in ('user','admin'));
  end if;
end $$;

-- -------------------------
-- CLAIMS: expand columns for persistence
-- -------------------------
alter table if exists claims
  add column if not exists risk_level text,
  add column if not exists predicted_loss numeric,
  add column if not exists payout_amount numeric,
  add column if not exists fraud_score numeric,
  add column if not exists trust_score numeric,
  add column if not exists decision text,
  add column if not exists final_payout numeric,
  add column if not exists timestamp timestamptz default now();

-- Keep created_at if you already have it; timestamp is used by new APIs.

-- -------------------------
-- TRANSACTIONS: add claim_id for traceability
-- -------------------------
alter table if exists transactions
  add column if not exists claim_id uuid references claims(id) on delete set null;

