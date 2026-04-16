-- DisasterShield AI (Supabase / Postgres) Final Schema
-- Copy and run this script in your Supabase SQL editor.

-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  password_hash text,
  city text NOT NULL,
  lat numeric,
  lon numeric,
  expected_income numeric DEFAULT 5000,
  fraud_count int DEFAULT 0,
  last_claim_time timestamptz,
  platform text NOT NULL DEFAULT 'ZOMATO_SWIGGY',
  role text NOT NULL DEFAULT 'user',
  upi_id text,
  rzp_fund_account_id text,
  created_at timestamptz DEFAULT now()
);

-- 2. POLICIES TABLE (For user premium subscriptions / active risk coverage)
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  premium numeric NOT NULL,
  coverage numeric NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);

-- 3. CLAIMS TABLE (For disaster triggers and payout decisions)
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  risk_level text,
  predicted_loss numeric,
  trigger_status boolean,
  trigger_score numeric, -- Changed to numeric to handle float values
  fraud_score numeric,
  penalties numeric,
  trust_score numeric,
  decision text,
  final_payout numeric,
  payout numeric NOT NULL DEFAULT 0,
  fraud_flag boolean NOT NULL DEFAULT false,
  weather_snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. TRANSACTIONS TABLE (For Razorpay & Fallback Payouts)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payout_amount numeric NOT NULL DEFAULT 0,
  razorpay_payout_id text,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  timestamp timestamptz DEFAULT now()
);

-- 5. RISK LOGS TABLE (For recording daily weather impacts per city/user)
CREATE TABLE IF NOT EXISTS risk_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  city text,
  rainfall numeric,
  temperature numeric,
  aqi numeric,
  delivery_drop numeric,
  risk_level text,
  trigger_score numeric,
  triggered boolean,
  fraud_flagged boolean,
  created_at timestamptz DEFAULT now()
);
