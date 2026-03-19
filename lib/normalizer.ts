import type { GoogleCampaignMetrics } from "./platforms/google-ads";
import type { MetaCampaignMetrics } from "./platforms/meta-ads";

export interface NormalizedCampaign {
  platform_campaign_id: string;
  name: string;
  status: string; // "active" | "paused" | "removed"
  campaign_type: string;
  daily_budget: number;
  currency: string;
}

export interface NormalizedMetrics {
  platform_campaign_id: string;
  date: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  orders: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  aov: number;
  raw_data: Record<string, unknown>;
}

// ─── Google Ads ───────────────────────────────────────────────────────────────

const GOOGLE_STATUS_MAP: Record<string, string> = {
  enabled: "active",
  paused: "paused",
  removed: "removed",
};

const GOOGLE_TYPE_MAP: Record<string, string> = {
  search: "search",
  display: "display",
  shopping: "shopping",
  video: "video",
  performance_max: "pmax",
  smart: "smart",
};

export function normalizeGoogleCampaign(
  row: GoogleCampaignMetrics
): NormalizedCampaign {
  return {
    platform_campaign_id: row.campaignId,
    name: row.campaignName,
    status: GOOGLE_STATUS_MAP[row.campaignStatus] ?? row.campaignStatus,
    campaign_type:
      GOOGLE_TYPE_MAP[row.campaignType] ?? row.campaignType ?? "search",
    daily_budget: row.dailyBudget,
    currency: "USD", // fetched from account level separately if needed
  };
}

export function normalizeGoogleMetrics(
  row: GoogleCampaignMetrics,
  clientId: string
): NormalizedMetrics {
  const spend = row.spend;
  const clicks = row.clicks;
  const impressions = row.impressions;
  const conversions = row.conversions;
  const revenue = row.conversionValue;

  return {
    platform_campaign_id: row.campaignId,
    date: row.date,
    platform: "google_ads",
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    orders: 0, // Google doesn't expose orders separately
    ctr: impressions > 0 ? clicks / impressions : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    aov: 0,
    raw_data: { clientId, source: "google_ads_searchstream", row },
  };
}

// ─── Meta Ads ────────────────────────────────────────────────────────────────

const META_OBJECTIVE_MAP: Record<string, string> = {
  LINK_CLICKS: "awareness",
  REACH: "awareness",
  BRAND_AWARENESS: "awareness",
  VIDEO_VIEWS: "awareness",
  CONVERSIONS: "conversions",
  PRODUCT_CATALOG_SALES: "conversions",
  LEAD_GENERATION: "conversions",
  APP_INSTALLS: "conversions",
  MESSAGES: "conversions",
  PAGE_LIKES: "awareness",
  POST_ENGAGEMENT: "awareness",
};

export function normalizeMetaCampaign(
  row: MetaCampaignMetrics
): NormalizedCampaign {
  return {
    platform_campaign_id: row.campaignId,
    name: row.campaignName,
    status: row.campaignStatus ?? "active",
    campaign_type: META_OBJECTIVE_MAP[row.objective] ?? "awareness",
    daily_budget: 0,
    currency: "USD",
  };
}

export function normalizeMetaMetrics(
  row: MetaCampaignMetrics,
  clientId: string
): NormalizedMetrics {
  const spend = row.spend;
  const clicks = row.clicks;
  const impressions = row.impressions;
  const conversions = row.results;
  const revenue = row.purchaseValue || row.resultValue;
  const orders = row.purchases;

  return {
    platform_campaign_id: row.campaignId,
    date: row.date,
    platform: "meta_ads",
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    orders,
    ctr: impressions > 0 ? clicks / impressions : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    aov: orders > 0 ? revenue / orders : 0,
    raw_data: { clientId, source: "meta_insights_api", row },
  };
}

// ─── Generic safe division util ───────────────────────────────────────────────
export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || !isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return isFinite(result) ? Math.round(result * 10000) / 10000 : 0;
}
