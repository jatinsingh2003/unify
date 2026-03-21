-- ============================================================
-- Week 3-4 Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add 'shopify' to the platform enum (if using enum type)
--    If platform is text, skip this block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_type') THEN
    ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'shopify';
  END IF;
END$$;

-- 2. Add 'active' and 'connected_at' columns to integrations (if missing)
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS connected_at timestamptz;

-- 3. Add unique constraint for upsert conflict target
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS integrations_client_platform_unique;
ALTER TABLE integrations
  ADD CONSTRAINT integrations_client_platform_unique
  UNIQUE (client_id, platform);

-- 4. Add unique constraint on daily_metrics for upsert
ALTER TABLE daily_metrics
  DROP CONSTRAINT IF EXISTS daily_metrics_unique;
ALTER TABLE daily_metrics
  ADD CONSTRAINT daily_metrics_unique
  UNIQUE (client_id, platform, external_campaign_id, date);

-- 5. Add unique constraint on campaigns for upsert
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_unique;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_unique
  UNIQUE (client_id, platform, external_campaign_id);

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_daily_metrics_client_date
  ON daily_metrics (client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_platform
  ON daily_metrics (client_id, platform, date DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_client
  ON campaigns (client_id, platform);

-- 7. RLS policies (ensure they cover shopify rows)
-- These match your existing pattern: client_id = org_id from JWT
-- No changes needed if RLS is already: client_id = (auth.jwt() ->> 'org_id')
-- Verify with:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('integrations','campaigns','daily_metrics');
