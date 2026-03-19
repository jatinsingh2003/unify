import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { orgId } = auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const platform = searchParams.get("platform"); // optional filter

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const supabase = await createClient();

  let query = supabase
    .from("daily_metrics")
    .select("date, platform, spend, revenue, conversions, clicks, impressions")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (platform) query = query.eq("platform", platform);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Group by date, sum across platforms
  const byDate = new Map<
    string,
    { date: string; spend: number; revenue: number; conversions: number; clicks: number }
  >();

  for (const row of data ?? []) {
    const existing = byDate.get(row.date) ?? {
      date: row.date,
      spend: 0,
      revenue: 0,
      conversions: 0,
      clicks: 0,
    };
    byDate.set(row.date, {
      date: row.date,
      spend: existing.spend + Number(row.spend ?? 0),
      revenue: existing.revenue + Number(row.revenue ?? 0),
      conversions: existing.conversions + Number(row.conversions ?? 0),
      clicks: existing.clicks + Number(row.clicks ?? 0),
    });
  }

  return NextResponse.json({ series: Array.from(byDate.values()) });
}
