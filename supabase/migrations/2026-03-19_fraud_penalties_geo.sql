-- Migration: Strong fraud penalties + geolocation persistence

-- USERS: repeat fraud tracking
alter table if exists users
  add column if not exists fraud_count int not null default 0,
  add column if not exists last_claim_time timestamptz;

-- CLAIMS: store signals + penalty breakdown + detected city
alter table if exists claims
  add column if not exists detected_city text,
  add column if not exists fraud_signals jsonb,
  add column if not exists penalties_applied jsonb;

