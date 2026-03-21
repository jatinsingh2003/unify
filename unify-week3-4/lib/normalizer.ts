// lib/normalizer.ts
// Converts raw API responses from Google Ads, Meta Ads, and Shopify
// into a unified DailyMetric row that gets inserted into Supabase.

export type Platform = "google" | "meta" | "shopify";

export interface NormalizedCampaign {
  client_id: string;
  platform: Platform;
  external_campaign_id: string;
  name: string;
  status: "active" | "paused" | "archived";
  objective: string | null;
}

export interface NormalizedDailyMetric {
  client_id: string;
  platform: Platform;
  external_campaign_id: string;
  date: string; // YYYY-MM-DD
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

// ─── Google Ads ───────────────────────────────────────────────────────────────

export function normalizeGoogleCampaign(
  raw: any,
  clientId: string
): NormalizedCampaign {
  const statusMap: Record<string, NormalizedCampaign["status"]> = {
    ENABLED: "active",
    PAUSED: "paused",
    REMOVED: "archived",
  };
  return {
    client_id: clientId,
    platform: "google",
    external_campaign_id: String(raw.campaign.id),
    name: raw.campaign.name,
    status: statusMap[raw.campaign.status] ?? "paused",
    objective: raw.campaign.advertisingChannelType ?? null,
  };
}

export function normalizeGoogleMetrics(
  raw: any,
  clientId: string,
  date: string
): NormalizedDailyMetric {
  const spend = (raw.metrics.costMicros ?? 0) / 1_000_000;
  const revenue = raw.metrics.conversionsValue ?? 0;
  const conversions = raw.metrics.conversions ?? 0;
  return {
    client_id: clientId,
    platform: "google",
    external_campaign_id: String(raw.campaign.id),
    date,
    spend,
    revenue,
    impressions: raw.metrics.impressions ?? 0,
    clicks: raw.metrics.clicks ?? 0,
    conversions,
    roas: spend > 0 ? revenue / spend : 0,
  };
}

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

export function normalizeMetaCampaign(
  raw: any,
  clientId: string
): NormalizedCampaign {
  const statusMap: Record<string, NormalizedCampaign["status"]> = {
    ACTIVE: "active",
    PAUSED: "paused",
    DELETED: "archived",
    ARCHIVED: "archived",
  };
  return {
    client_id: clientId,
    platform: "meta",
    external_campaign_id: raw.id,
    name: raw.name,
    status: statusMap[raw.status] ?? "paused",
    objective: raw.objective ?? null,
  };
}

export function normalizeMetaMetrics(
  raw: any,
  clientId: string
): NormalizedDailyMetric {
  const spend = parseFloat(raw.spend ?? "0");
  const revenue = parseFloat(
    raw.action_values?.find((a: any) => a.action_type === "purchase")?.value ?? "0"
  );
  const conversions = parseFloat(
    raw.actions?.find((a: any) => a.action_type === "purchase")?.value ?? "0"
  );
  return {
    client_id: clientId,
    platform: "meta",
    external_campaign_id: raw.campaign_id,
    date: raw.date_start,
    spend,
    revenue,
    impressions: parseInt(raw.impressions ?? "0", 10),
    clicks: parseInt(raw.clicks ?? "0", 10),
    conversions,
    roas: spend > 0 ? revenue / spend : 0,
  };
}

// ─── Shopify ──────────────────────────────────────────────────────────────────

export function normalizeShopifyOrders(
  orders: any[],
  clientId: string,
  date: string
): NormalizedDailyMetric {
  const revenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.total_price ?? "0"),
    0
  );
  return {
    client_id: clientId,
    platform: "shopify",
    external_campaign_id: "shopify_orders",
    date,
    spend: 0,
    revenue,
    impressions: 0,
    clicks: 0,
    conversions: orders.length,
    roas: 0,
  };
}
