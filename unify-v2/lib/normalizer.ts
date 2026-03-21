// lib/normalizer.ts
// Matches YOUR actual Supabase schema:
//   campaigns:     client_id, platform, platform_campaign_id, name, status, campaign_type
//   daily_metrics: client_id, campaign_id(UUID FK), platform, date, spend, impressions,
//                  clicks, conversions, revenue, orders, ctr, cpc, cpa, roas, aov, raw_data

export type Platform = "google" | "meta" | "shopify";

export interface NormalizedCampaign {
  client_id: string;
  platform: Platform;
  platform_campaign_id: string;
  name: string;
  status: "active" | "paused" | "archived";
  campaign_type: string | null;
}

export interface NormalizedDailyMetric {
  client_id: string;
  campaign_id: string; // UUID FK → campaigns.id
  platform: Platform;
  date: string;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  orders: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  aov: number;
  raw_data: Record<string, any>;
}

export function normalizeGoogleCampaign(raw: any, clientId: string): NormalizedCampaign {
  const statusMap: Record<string, NormalizedCampaign["status"]> = {
    ENABLED: "active", PAUSED: "paused", REMOVED: "archived",
  };
  return {
    client_id: clientId,
    platform: "google",
    platform_campaign_id: String(raw.campaign.id),
    name: raw.campaign.name,
    status: statusMap[raw.campaign.status] ?? "paused",
    campaign_type: raw.campaign.advertisingChannelType ?? null,
  };
}

export function normalizeGoogleMetrics(
  raw: any, clientId: string, campaignUuid: string, date: string
): NormalizedDailyMetric {
  const spend = (raw.metrics.costMicros ?? 0) / 1_000_000;
  const revenue = raw.metrics.conversionsValue ?? 0;
  const clicks = Number(raw.metrics.clicks ?? 0);
  const conversions = Number(raw.metrics.conversions ?? 0);
  const impressions = Number(raw.metrics.impressions ?? 0);
  return {
    client_id: clientId, campaign_id: campaignUuid, platform: "google", date,
    spend, revenue, impressions, clicks, conversions,
    orders: Math.round(conversions),
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    aov: conversions > 0 ? revenue / conversions : 0,
    raw_data: raw,
  };
}

export function normalizeMetaCampaign(raw: any, clientId: string): NormalizedCampaign {
  const statusMap: Record<string, NormalizedCampaign["status"]> = {
    ACTIVE: "active", PAUSED: "paused", DELETED: "archived", ARCHIVED: "archived",
  };
  return {
    client_id: clientId, platform: "meta",
    platform_campaign_id: raw.id, name: raw.name,
    status: statusMap[raw.status] ?? "paused",
    campaign_type: raw.objective ?? null,
  };
}

export function normalizeMetaMetrics(
  raw: any, clientId: string, campaignUuid: string
): NormalizedDailyMetric {
  const spend = parseFloat(raw.spend ?? "0");
  const revenue = parseFloat(raw.action_values?.find((a: any) => a.action_type === "purchase")?.value ?? "0");
  const conversions = parseFloat(raw.actions?.find((a: any) => a.action_type === "purchase")?.value ?? "0");
  const clicks = parseInt(raw.clicks ?? "0", 10);
  const impressions = parseInt(raw.impressions ?? "0", 10);
  return {
    client_id: clientId, campaign_id: campaignUuid, platform: "meta", date: raw.date_start,
    spend, revenue, impressions, clicks, conversions,
    orders: Math.round(conversions),
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    aov: conversions > 0 ? revenue / conversions : 0,
    raw_data: raw,
  };
}

export function normalizeShopifyOrders(
  orders: any[], clientId: string, campaignUuid: string, date: string
): NormalizedDailyMetric {
  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price ?? "0"), 0);
  const cnt = orders.length;
  return {
    client_id: clientId, campaign_id: campaignUuid, platform: "shopify", date,
    spend: 0, revenue, impressions: 0, clicks: 0, conversions: cnt, orders: cnt,
    ctr: 0, cpc: 0, cpa: 0, roas: 0,
    aov: cnt > 0 ? revenue / cnt : 0,
    raw_data: { orders_count: cnt, revenue },
  };
}
