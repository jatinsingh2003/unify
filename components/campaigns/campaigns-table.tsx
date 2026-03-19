import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { formatCurrency, formatNumber, formatMultiplier, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  from: string;
  to: string;
  platform?: string;
}

const STATUS_STYLES: Record<string, string> = {
  active:  "bg-emerald-50 text-emerald-700 border-emerald-100",
  paused:  "bg-amber-50 text-amber-700 border-amber-100",
  removed: "bg-slate-100 text-slate-500 border-slate-200",
};

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: "Google",
  meta_ads:   "Meta",
  shopify:    "Shopify",
};

const PLATFORM_COLORS: Record<string, string> = {
  google_ads: "text-blue-600 bg-blue-50",
  meta_ads:   "text-blue-700 bg-blue-100",
  shopify:    "text-green-700 bg-green-50",
};

export async function CampaignsTable({ from, to, platform }: Props) {
  const { orgId } = auth();
  if (!orgId) return null;

  const supabase = await createClient();

  // Join campaigns with aggregated metrics for the date range
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
      .eq("client_id", orgId)
      .order("name"),
    metricsQuery,
  ]);

  // Aggregate metrics by campaign_id
  const metricsByCampaign = new Map<
    string,
    { spend: number; revenue: number; conversions: number; clicks: number; impressions: number; orders: number }
  >();

  for (const row of metricsRes.data ?? []) {
    const existing = metricsByCampaign.get(row.campaign_id) ?? {
      spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, orders: 0,
    };
    metricsByCampaign.set(row.campaign_id, {
      spend:       existing.spend       + Number(row.spend ?? 0),
      revenue:     existing.revenue     + Number(row.revenue ?? 0),
      conversions: existing.conversions + Number(row.conversions ?? 0),
      clicks:      existing.clicks      + Number(row.clicks ?? 0),
      impressions: existing.impressions + Number(row.impressions ?? 0),
      orders:      existing.orders      + Number(row.orders ?? 0),
    });
  }

  const campaigns = (campaignsRes.data ?? [])
    .filter((c) => !platform || c.platform === platform)
    .map((c) => {
      const m = metricsByCampaign.get(c.id) ?? {
        spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, orders: 0,
      };
      return {
        ...c,
        ...m,
        roas: m.spend > 0 ? m.revenue / m.spend : 0,
        cpa:  m.conversions > 0 ? m.spend / m.conversions : 0,
        ctr:  m.impressions > 0 ? m.clicks / m.impressions : 0,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  if (!campaigns.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No campaigns found. Connect a platform to start syncing.
        </p>
        <a href="/integrations" className="text-xs text-primary hover:underline mt-2 inline-block">
          Go to Integrations →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Campaign", "Platform", "Status", "Spend", "Revenue", "ROAS", "Conv.", "CPA", "Clicks", "CTR"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium truncate max-w-[200px]" title={c.name}>
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {c.campaign_type ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    PLATFORM_COLORS[c.platform] ?? "bg-muted text-muted-foreground"
                  )}>
                    {PLATFORM_LABELS[c.platform] ?? c.platform}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full border capitalize",
                    STATUS_STYLES[c.status ?? "active"] ?? STATUS_STYLES.active
                  )}>
                    {c.status ?? "active"}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatCurrency(c.spend, "USD", true)}</td>
                <td className="px-4 py-3 tabular-nums">{formatCurrency(c.revenue, "USD", true)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {c.roas > 0 ? (
                    <span className={c.roas >= 2 ? "text-emerald-600 font-medium" : "text-amber-600"}>
                      {formatMultiplier(c.roas, 2)}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatNumber(c.conversions)}</td>
                <td className="px-4 py-3 tabular-nums">{c.cpa > 0 ? formatCurrency(c.cpa) : "—"}</td>
                <td className="px-4 py-3 tabular-nums">{formatNumber(c.clicks)}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {c.ctr > 0 ? formatPercent(c.ctr) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
