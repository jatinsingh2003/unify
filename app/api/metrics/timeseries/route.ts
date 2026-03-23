// app/api/metrics/timeseries/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "all";

  let startStr: string;
  let endStr: string;
  const todayStr = new Date().toISOString().split("T")[0];

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

  const supabase = createServiceClient();
  let q = supabase
    .from("daily_metrics")
    .select("date, spend, revenue, impressions, clicks, conversions")
    .eq("client_id", orgId)
    .gte("date", startStr)
    .lte("date", endStr)
    .order("date", { ascending: true });
  if (platform !== "all") q = q.eq("platform", platform);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byDate: Record<string, any> = {};
  for (const row of data ?? []) {
    if (!byDate[row.date]) byDate[row.date] = { date: row.date, spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    byDate[row.date].spend += row.spend ?? 0;
    byDate[row.date].revenue += row.revenue ?? 0;
    byDate[row.date].impressions += row.impressions ?? 0;
    byDate[row.date].clicks += row.clicks ?? 0;
    byDate[row.date].conversions += row.conversions ?? 0;
  }

  const series = Object.values(byDate).map(d => ({ ...d, roas: d.spend > 0 ? d.revenue / d.spend : 0 }));
  return NextResponse.json({ series });
}
