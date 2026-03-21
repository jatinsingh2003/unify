-- ============================================================
-- Week 3-4 Migration (matched to your actual schema)
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Unique constraint on campaigns
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_client_platform_campaign_unique;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_client_platform_campaign_unique
  UNIQUE (client_id, platform, platform_campaign_id);

-- 2. Unique constraint on daily_metrics
ALTER TABLE daily_metrics
  DROP CONSTRAINT IF EXISTS daily_metrics_campaign_date_unique;
ALTER TABLE daily_metrics
  ADD CONSTRAINT daily_metrics_campaign_date_unique
  UNIQUE (campaign_id, date);

-- 3. Unique constraint on integrations
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS integrations_client_platform_unique;
ALTER TABLE integrations
  ADD CONSTRAINT integrations_client_platform_unique
  UNIQUE (client_id, platform);

-- 4. Add tokens_encrypted column for Shopify
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS tokens_encrypted text;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_daily_metrics_client_date
  ON daily_metrics (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_platform
  ON daily_metrics (client_id, platform, date DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_client
  ON campaigns (client_id, platform);
