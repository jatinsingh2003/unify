// app/api/metrics/overview/route.ts
// Returns aggregated KPI totals for the dashboard KPI grid.
// Query params: ?days=30&platform=all|google|meta|shopify

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const platform = searchParams.get("platform") ?? "all";

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // Previous period for comparison
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days);

  const supabase = createServiceClient();

  async function fetchPeriod(from: string, to: string) {
    let query = supabase
      .from("daily_metrics")
      .select("spend, revenue, impressions, clicks, conversions")
      .eq("client_id", orgId)
      .gte("date", from)
      .lte("date", to);

    if (platform !== "all") query = query.eq("platform", platform);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).reduce(
      (acc, row) => ({
        spend: acc.spend + (row.spend ?? 0),
        revenue: acc.revenue + (row.revenue ?? 0),
        impressions: acc.impressions + (row.impressions ?? 0),
        clicks: acc.clicks + (row.clicks ?? 0),
        conversions: acc.conversions + (row.conversions ?? 0),
      }),
      { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
    );
  }

  const [current, previous] = await Promise.all([
    fetchPeriod(fmt(start), fmt(end)),
    fetchPeriod(fmt(prevStart), fmt(prevEnd)),
  ]);

  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? null : ((curr - prev) / prev) * 100;

  return NextResponse.json({
    current: {
      ...current,
      roas: current.spend > 0 ? current.revenue / current.spend : 0,
      ctr: current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0,
    },
    changes: {
      spend: pctChange(current.spend, previous.spend),
      revenue: pctChange(current.revenue, previous.revenue),
      impressions: pctChange(current.impressions, previous.impressions),
      clicks: pctChange(current.clicks, previous.clicks),
      conversions: pctChange(current.conversions, previous.conversions),
      roas: pctChange(
        current.spend > 0 ? current.revenue / current.spend : 0,
        previous.spend > 0 ? previous.revenue / previous.spend : 0
      ),
    },
  });
}
