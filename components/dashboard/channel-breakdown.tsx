import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { ChannelBreakdownClient } from "./channel-breakdown-client";

interface Props { from: string; to: string; days?: number }

export async function ChannelBreakdown({ from, to }: Props) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_metrics")
    .select("platform, spend, revenue, conversions")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to);

  const byPlatform = new Map<string, { spend: number; revenue: number; conversions: number }>();
  for (const row of data ?? []) {
    const existing = byPlatform.get(row.platform) ?? { spend: 0, revenue: 0, conversions: 0 };
    byPlatform.set(row.platform, {
      spend:       existing.spend       + Number(row.spend ?? 0),
      revenue:     existing.revenue     + Number(row.revenue ?? 0),
      conversions: existing.conversions + Number(row.conversions ?? 0),
    });
  }

  const chartData = Array.from(byPlatform.entries()).map(([platform, metrics]) => ({
    platform,
    label: platform === "google_ads" ? "Google Ads" : platform === "meta_ads" ? "Meta Ads" : "Shopify",
    ...metrics,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Channel Breakdown</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Spend share by platform</p>
      </div>
      <ChannelBreakdownClient data={chartData} />
    </div>
  );
}
