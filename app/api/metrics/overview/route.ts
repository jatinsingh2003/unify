import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { orgId } = auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to params" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("spend, revenue, conversions, orders, clicks, impressions")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to);

  if (error) {
    console.error("[api/metrics/overview]", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Aggregate in JS (avoids RPC complexity, row count is bounded)
  const totals = (data ?? []).reduce(
    (acc, row) => ({
      spend: acc.spend + Number(row.spend ?? 0),
      revenue: acc.revenue + Number(row.revenue ?? 0),
      conversions: acc.conversions + Number(row.conversions ?? 0),
      orders: acc.orders + Number(row.orders ?? 0),
      clicks: acc.clicks + Number(row.clicks ?? 0),
      impressions: acc.impressions + Number(row.impressions ?? 0),
    }),
    { spend: 0, revenue: 0, conversions: 0, orders: 0, clicks: 0, impressions: 0 }
  );

  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const aov = totals.orders > 0 ? totals.revenue / totals.orders : 0;

  return NextResponse.json({
    ...totals,
    roas: Math.round(roas * 100) / 100,
    cpa: Math.round(cpa * 100) / 100,
    ctr: Math.round(ctr * 10000) / 10000,
    aov: Math.round(aov * 100) / 100,
  });
}
