// app/api/metrics/insights/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("from");
  const endStr = searchParams.get("to");

  if (!startStr || !endStr) {
    return NextResponse.json({ error: "Missing date range" }, { status: 400 });
  }

  // Calculate previous period
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  const rangeDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  const prevEnd = new Date(startDate); prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - rangeDays);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const supabase = createServiceClient();

  async function fetchPeriod(from: string, to: string) {
    const { data, error } = await supabase
      .from("daily_metrics")
      .select("spend, revenue, platform")
      .eq("client_id", orgId)
      .gte("date", from)
      .lte("date", to);
    if (error) throw new Error(error.message);
    
    return (data ?? []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: any, row) => {
        acc.total.spend += row.spend ?? 0;
        acc.total.revenue += row.revenue ?? 0;
        if (!acc.platforms[row.platform]) {
          acc.platforms[row.platform] = { spend: 0, revenue: 0 };
        }
        acc.platforms[row.platform].spend += row.spend ?? 0;
        acc.platforms[row.platform].revenue += row.revenue ?? 0;
        return acc;
      },
      { total: { spend: 0, revenue: 0 }, platforms: {} }
    );
  }

  const [current, previous] = await Promise.all([
    fetchPeriod(startStr, endStr),
    fetchPeriod(fmt(prevStart), fmt(prevEnd)),
  ]);

  const insights = [];

  // 1. Overall Revenue Growth
  const revChange = previous.total.revenue > 0 
    ? ((current.total.revenue - previous.total.revenue) / previous.total.revenue) * 100 
    : 0;
  
  if (Math.abs(revChange) > 5) {
    insights.push({
      type: revChange > 0 ? "positive" : "negative",
      label: "Revenue Trend",
      message: `Revenue is ${revChange > 0 ? "up" : "down"} ${Math.abs(revChange).toFixed(1)}% compared to the previous period.`,
    });
  }

  // 2. Efficiency (ROAS)
  const currentRoas = current.total.spend > 0 ? current.total.revenue / current.total.spend : 0;
  const prevRoas = previous.total.spend > 0 ? previous.total.revenue / previous.total.spend : 0;
  const roasChange = prevRoas > 0 ? ((currentRoas - prevRoas) / prevRoas) * 100 : 0;

  if (Math.abs(roasChange) > 5) {
    insights.push({
      type: roasChange > 0 ? "positive" : "negative",
      label: "Ad Efficiency",
      message: `ROAS has ${roasChange > 0 ? "improved" : "declined"} by ${Math.abs(roasChange).toFixed(1)}%.`,
    });
  }

  // 3. Platform Winner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platforms = Object.entries(current.platforms as Record<string, any>);
  if (platforms.length > 0) {
    const winner = platforms.reduce((prev, curr) => {
      const prevRoas = prev[1].spend > 0 ? prev[1].revenue / prev[1].spend : 0;
      const currRoas = curr[1].spend > 0 ? curr[1].revenue / curr[1].spend : 0;
      return currRoas > prevRoas ? curr : prev;
    });
    insights.push({
      type: "neutral",
      label: "Top Performer",
      message: `${winner[0].charAt(0).toUpperCase() + winner[0].slice(1)} is currently your most efficient channel.`,
    });
  }

  return NextResponse.json(insights);
}
