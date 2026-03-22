// app/api/reports/export/route.ts
// Returns campaign metrics as a CSV download.

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function today() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from     = searchParams.get("from")     ?? daysAgo(30);
  const to       = searchParams.get("to")       ?? today();
  const platform = searchParams.get("platform") ?? "all";
  const format   = searchParams.get("format")   ?? "csv";

  const supabase = createServiceClient();

  // Fetch campaigns
  let cq = supabase
    .from("campaigns")
    .select("id, name, platform, status, campaign_type")
    .eq("client_id", orgId);
  if (platform !== "all") cq = cq.eq("platform", platform);
  const { data: campaigns } = await cq;
  if (!campaigns?.length) {
    return new NextResponse("Campaign,Platform,Status,Spend,Revenue,ROAS,Impressions,Clicks,Conversions,CTR,CPC,CPA\n", {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="unify-report-${from}-to-${to}.csv"`,
      },
    });
  }

  // Fetch metrics
  const { data: metrics } = await supabase
    .from("daily_metrics")
    .select("campaign_id, spend, revenue, impressions, clicks, conversions")
    .in("campaign_id", campaigns.map(c => c.id))
    .gte("date", from)
    .lte("date", to);

  // Aggregate by campaign
  const mMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};
  for (const r of metrics ?? []) {
    if (!mMap[r.campaign_id]) mMap[r.campaign_id] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    mMap[r.campaign_id].spend       += r.spend ?? 0;
    mMap[r.campaign_id].revenue     += r.revenue ?? 0;
    mMap[r.campaign_id].impressions += r.impressions ?? 0;
    mMap[r.campaign_id].clicks      += r.clicks ?? 0;
    mMap[r.campaign_id].conversions += r.conversions ?? 0;
  }

  const rows = campaigns.map(c => {
    const m = mMap[c.id] ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    const roas = m.spend > 0 ? m.revenue / m.spend : 0;
    const ctr  = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
    const cpc  = m.clicks > 0 ? m.spend / m.clicks : 0;
    const cpa  = m.conversions > 0 ? m.spend / m.conversions : 0;
    return [
      esc(c.name), esc(c.platform), esc(c.status),
      m.spend.toFixed(2), m.revenue.toFixed(2), roas.toFixed(2),
      m.impressions, m.clicks, m.conversions,
      ctr.toFixed(2), cpc.toFixed(2), cpa.toFixed(2),
    ].join(",");
  });

  const csv = [
    "Campaign,Platform,Status,Spend,Revenue,ROAS,Impressions,Clicks,Conversions,CTR,CPC,CPA",
    ...rows,
  ].join("\n");

  if (format === "json") {
    return NextResponse.json({
      meta: { orgId, from, to, platform },
      summary: { totals: mMap, count: campaigns.length },
      campaigns: campaigns.map(c => {
        const m = mMap[c.id] ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
        return {
          ...c,
          metrics: {
            ...m,
            roas: m.spend > 0 ? m.revenue / m.spend : 0,
            ctr:  m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
            cpc:  m.clicks > 0 ? m.spend / m.clicks : 0,
            cpa:  m.conversions > 0 ? m.spend / m.conversions : 0,
          }
        };
      })
    });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="unify-report-${from}-to-${to}.csv"`,
    },
  });
}
