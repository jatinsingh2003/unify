import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { formatCurrency, formatNumber, formatMultiplier, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  from: string;
  to: string;
  platform?: string;
}

const STATUS_STYLES: Record<string, string> = {
  active:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  removed: "bg-slate-800 text-slate-500 border-white/5",
};

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: "Google",
  meta_ads:   "Meta",
  shopify:    "Shopify",
};

const PLATFORM_COLORS: Record<string, string> = {
  google_ads: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  meta_ads:   "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  shopify:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export async function CampaignsTable({ from, to, platform }: Props) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const supabase = createServiceClient(); // Fixed: Use the standard helper

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
      <div className="p-20 text-center bg-card">
        <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 italic font-black text-2xl tracking-tighter">U</div>
          <p className="text-sm text-slate-500 font-medium italic">
            Deployment nodes not found. Syncing infrastructure required.
          </p>
          <Link href="/integrations" className="text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
            Connect Channels →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              {["Campaign", "Status", "Allocation", "Yield", "Efficiency", "Conv.", "CPA", "CTR"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-white/[0.03] transition-all duration-300 cursor-pointer group">
                <td className="px-6 py-5">
                  <Link href={`/campaigns/${c.id}`} className="block">
                    <p className="font-bold text-white truncate max-w-[200px] group-hover:text-indigo-400 transition-colors" title={c.name}>
                      {c.name}
                    </p>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1 italic leading-none">
                      {PLATFORM_LABELS[c.platform] ?? c.platform} • {c.campaign_type ?? "DEPLOY"}
                    </p>
                  </Link>
                </td>
                <td className="px-6 py-5">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest",
                    STATUS_STYLES[c.status ?? "active"] ?? STATUS_STYLES.active
                  )}>
                    {c.status ?? "active"}
                  </span>
                </td>
                <td className="px-6 py-5 tabular-nums text-white font-medium">{formatCurrency(c.spend, "USD", true)}</td>
                <td className="px-6 py-5 tabular-nums text-white font-medium">{formatCurrency(c.revenue, "USD", true)}</td>
                <td className="px-6 py-5 tabular-nums">
                  {c.roas > 0 ? (
                    <span className={cn("text-[11px] font-black italic", c.roas >= 2.5 ? "text-emerald-400" : "text-amber-400")}>
                      {formatMultiplier(c.roas, 2)} ROAS
                    </span>
                  ) : <span className="text-slate-700 italic font-medium">pending</span>}
                </td>
                <td className="px-6 py-5 tabular-nums text-slate-400">{formatNumber(c.conversions)}</td>
                <td className="px-6 py-5 tabular-nums text-slate-400">{c.cpa > 0 ? formatCurrency(c.cpa) : "—"}</td>
                <td className="px-6 py-5 tabular-nums text-slate-500 font-bold italic tracking-tighter">
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
