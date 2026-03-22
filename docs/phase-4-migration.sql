-- Phase 4: Product Usability & Intelligence Migration
-- Applied to Supabase

-- 1. Order Attribution for Shopify
CREATE TABLE IF NOT EXISTS order_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'shopify',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  total_price NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(client_id, order_id)
);

-- 2. Persistent Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'spend_spike', 'revenue_drop', 'low_roas', 'sync_error'
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Global Sync Tracking
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE order_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Users can only see their own org's attribution" ON order_attribution;
CREATE POLICY "Users can only see their own org's attribution" 
  ON order_attribution FOR SELECT 
  USING (client_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "Users can only see their own org's notifications" ON notifications;
CREATE POLICY "Users can only see their own org's notifications" 
  ON notifications FOR ALL 
  USING (client_id = (auth.jwt() ->> 'org_id')::uuid);
