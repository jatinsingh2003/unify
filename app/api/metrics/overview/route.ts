// app/api/metrics/overview/route.ts
// Aggregates daily_metrics for KPI cards.
// Joins via campaign_id FK — filters platform via campaigns table.

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "all";

  // Support either from/to or days
  const todayStr = new Date().toISOString().split("T")[0];

  let startStr: string;
  let endStr: string;

  if (searchParams.has("from") && searchParams.has("to")) {
    startStr = searchParams.get("from")!;
    endStr = searchParams.get("to")!;
  } else {
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const start = new Date();
    start.setDate(start.getDate() - days);
    startStr = start.toISOString().split("T")[0];
    endStr = todayStr;
  }

  // Calculate previous period of same length
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  const rangeDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  const prevEnd = new Date(startDate); prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - rangeDays);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const supabase = createServiceClient();

  async function fetchPeriod(from: string, to: string) {
    let q = supabase
      .from("daily_metrics")
      .select("spend, revenue, impressions, clicks, conversions, platform")
      .eq("client_id", orgId)
      .gte("date", from)
      .lte("date", to);
    if (platform !== "all") q = q.eq("platform", platform);
    const { data, error } = await q;
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
    fetchPeriod(startStr, endStr),
    fetchPeriod(fmt(prevStart), fmt(prevEnd)),
  ]);

  const pct = (curr: number, prev: number) => prev === 0 ? null : ((curr - prev) / prev) * 100;

  return NextResponse.json({
    current: {
      ...current,
      roas: current.spend > 0 ? current.revenue / current.spend : 0,
      ctr: current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0,
    },
    changes: {
      spend: pct(current.spend, previous.spend),
      revenue: pct(current.revenue, previous.revenue),
      impressions: pct(current.impressions, previous.impressions),
      clicks: pct(current.clicks, previous.clicks),
      conversions: pct(current.conversions, previous.conversions),
      roas: pct(
        current.spend > 0 ? current.revenue / current.spend : 0,
        previous.spend > 0 ? previous.revenue / previous.spend : 0
      ),
    },
  });
}
