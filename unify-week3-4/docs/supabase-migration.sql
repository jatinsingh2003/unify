-- ============================================================
-- Unify — Week 3-4 Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add missing columns to integrations table
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 2. campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             TEXT NOT NULL,
  platform              TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'shopify')),
  external_campaign_id  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'paused',
  objective             TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, platform, external_campaign_id)
);

-- 3. daily_metrics table
CREATE TABLE IF NOT EXISTS daily_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             TEXT NOT NULL,
  platform              TEXT NOT NULL CHECK (platform IN ('google', 'meta', 'shopify')),
  external_campaign_id  TEXT NOT NULL,
  date                  DATE NOT NULL,
  spend                 NUMERIC(12, 4) NOT NULL DEFAULT 0,
  revenue               NUMERIC(12, 4) NOT NULL DEFAULT 0,
  impressions           BIGINT NOT NULL DEFAULT 0,
  clicks                BIGINT NOT NULL DEFAULT 0,
  conversions           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  roas                  NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, platform, external_campaign_id, date)
);

-- 4. Indexes for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_client_date
  ON daily_metrics (client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_platform
  ON daily_metrics (client_id, platform, date DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_client
  ON campaigns (client_id, platform);

-- 5. Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "campaigns_org_isolation" ON campaigns;
DROP POLICY IF EXISTS "daily_metrics_org_isolation" ON daily_metrics;

-- RLS: users can only see their own org's data (Clerk JWT injects org_id)
CREATE POLICY "campaigns_org_isolation" ON campaigns
  FOR ALL USING (client_id = (auth.jwt() ->> 'org_id'));

CREATE POLICY "daily_metrics_org_isolation" ON daily_metrics
  FOR ALL USING (client_id = (auth.jwt() ->> 'org_id'));

-- Service role bypasses RLS (used by Inngest sync jobs)
-- This is automatic in Supabase — service role key always bypasses RLS.

-- 6. Updated_at trigger for campaigns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Done! ✅
