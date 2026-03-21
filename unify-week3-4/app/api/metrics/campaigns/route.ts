// app/api/metrics/campaigns/route.ts
// Returns campaign-level metrics for the Campaigns table.
// Query params: ?days=30&platform=all|google|meta|shopify&page=1&limit=20

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const platform = searchParams.get("platform") ?? "all";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const supabase = createServiceClient();

  // Get campaigns for this client
  let campaignQuery = supabase
    .from("campaigns")
    .select("external_campaign_id, name, status, platform, objective")
    .eq("client_id", orgId);
  if (platform !== "all") campaignQuery = campaignQuery.eq("platform", platform);

  const { data: campaigns, error: campaignErr } = await campaignQuery;
  if (campaignErr) return NextResponse.json({ error: campaignErr.message }, { status: 500 });

  if (!campaigns?.length) return NextResponse.json({ campaigns: [], total: 0 });

  // Get aggregated metrics per campaign
  let metricsQuery = supabase
    .from("daily_metrics")
    .select("external_campaign_id, spend, revenue, impressions, clicks, conversions")
    .eq("client_id", orgId)
    .gte("date", fmt(start))
    .lte("date", fmt(end));
  if (platform !== "all") metricsQuery = metricsQuery.eq("platform", platform);

  const { data: metrics, error: metricsErr } = await metricsQuery;
  if (metricsErr) return NextResponse.json({ error: metricsErr.message }, { status: 500 });

  // Aggregate metrics by campaign
  const metricsMap: Record<string, any> = {};
  for (const row of metrics ?? []) {
    const id = row.external_campaign_id;
    if (!metricsMap[id]) {
      metricsMap[id] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    }
    metricsMap[id].spend += row.spend ?? 0;
    metricsMap[id].revenue += row.revenue ?? 0;
    metricsMap[id].impressions += row.impressions ?? 0;
    metricsMap[id].clicks += row.clicks ?? 0;
    metricsMap[id].conversions += row.conversions ?? 0;
  }

  const result = campaigns.map((c) => {
    const m = metricsMap[c.external_campaign_id] ?? {
      spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0,
    };
    return {
      ...c,
      ...m,
      roas: m.spend > 0 ? m.revenue / m.spend : 0,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
    };
  });

  // Sort by spend desc
  result.sort((a, b) => b.spend - a.spend);

  const total = result.length;
  const paginated = result.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ campaigns: paginated, total, page, limit });
}
