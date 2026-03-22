// app/api/metrics/campaigns/[id]/route.ts
// Returns daily breakdown for a single campaign (for the detail page).

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })();
  const to   = searchParams.get("to")   ?? new Date().toISOString().split("T")[0];

  const supabase = createServiceClient();

  // Verify the campaign belongs to this org
  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .select("id, name, platform, status, campaign_type")
    .eq("id", params.id)
    .eq("client_id", orgId)
    .single();

  if (cErr || !campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Fetch daily metrics
  const { data: daily, error: mErr } = await supabase
    .from("daily_metrics")
    .select("date, spend, revenue, impressions, clicks, conversions, roas, ctr, cpc, cpa")
    .eq("campaign_id", params.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Totals
  const rows = daily ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      spend:       acc.spend       + (r.spend ?? 0),
      revenue:     acc.revenue     + (r.revenue ?? 0),
      impressions: acc.impressions + (r.impressions ?? 0),
      clicks:      acc.clicks      + (r.clicks ?? 0),
      conversions: acc.conversions + (r.conversions ?? 0),
    }),
    { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  return NextResponse.json({ campaign, daily: rows, totals });
}
