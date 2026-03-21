// app/api/metrics/campaigns/route.ts
// Joins campaigns + daily_metrics correctly using campaign_id UUID FK.

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

  // Get campaigns
  let cq = supabase
    .from("campaigns")
    .select("id, platform_campaign_id, name, status, platform, campaign_type")
    .eq("client_id", orgId);
  if (platform !== "all") cq = cq.eq("platform", platform);
  const { data: campaigns, error: cErr } = await cq;
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!campaigns?.length) return NextResponse.json({ campaigns: [], total: 0 });

  // Get metrics for those campaign UUIDs
  const campaignIds = campaigns.map(c => c.id);
  const { data: metrics, error: mErr } = await supabase
    .from("daily_metrics")
    .select("campaign_id, spend, revenue, impressions, clicks, conversions")
    .in("campaign_id", campaignIds)
    .gte("date", fmt(start))
    .lte("date", fmt(end));
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Aggregate by campaign UUID
  const mMap: Record<string, any> = {};
  for (const row of metrics ?? []) {
    if (!mMap[row.campaign_id])
      mMap[row.campaign_id] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    mMap[row.campaign_id].spend += row.spend ?? 0;
    mMap[row.campaign_id].revenue += row.revenue ?? 0;
    mMap[row.campaign_id].impressions += row.impressions ?? 0;
    mMap[row.campaign_id].clicks += row.clicks ?? 0;
    mMap[row.campaign_id].conversions += row.conversions ?? 0;
  }

  const result = campaigns.map(c => {
    const m = mMap[c.id] ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    return {
      ...c,
      ...m,
      roas: m.spend > 0 ? m.revenue / m.spend : 0,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
    };
  });

  result.sort((a, b) => b.spend - a.spend);
  const total = result.length;
  return NextResponse.json({ campaigns: result.slice((page - 1) * limit, page * limit), total, page, limit });
}
