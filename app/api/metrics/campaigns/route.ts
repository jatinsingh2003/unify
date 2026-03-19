import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { orgId } = auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const platform = searchParams.get("platform");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const supabase = await createClient();

  let metricsQuery = supabase
    .from("daily_metrics")
    .select("campaign_id, spend, revenue, conversions, clicks, impressions, orders")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to);

  if (platform) metricsQuery = metricsQuery.eq("platform", platform);

  const [campaignsRes, metricsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, platform, status, campaign_type")
      .eq("client_id", orgId),
    metricsQuery,
  ]);

  // Aggregate metrics per campaign
  const agg = new Map<string, Record<string, number>>();
  for (const row of metricsRes.data ?? []) {
    const e = agg.get(row.campaign_id) ?? { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, orders: 0 };
    agg.set(row.campaign_id, {
      spend:       e.spend       + Number(row.spend ?? 0),
      revenue:     e.revenue     + Number(row.revenue ?? 0),
      conversions: e.conversions + Number(row.conversions ?? 0),
      clicks:      e.clicks      + Number(row.clicks ?? 0),
      impressions: e.impressions + Number(row.impressions ?? 0),
      orders:      e.orders      + Number(row.orders ?? 0),
    });
  }

  const campaigns = (campaignsRes.data ?? [])
    .filter((c) => !platform || c.platform === platform)
    .map((c) => {
      const m = agg.get(c.id) ?? { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, orders: 0 };
      return {
        ...c,
        ...m,
        roas: m.spend > 0 ? m.revenue / m.spend : 0,
        cpa:  m.conversions > 0 ? m.spend / m.conversions : 0,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return NextResponse.json({ campaigns });
}
