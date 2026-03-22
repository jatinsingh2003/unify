// app/(dashboard)/campaigns/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CampaignDailyChart } from "@/components/campaigns/campaign-daily-chart";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatCurrency, formatNumber, formatMultiplier, formatPercent, cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Target, Zap } from "lucide-react";
import { differenceInDays, subDays, format, parseISO } from "date-fns";

export const metadata: Metadata = { title: "Campaign Detail" };

function today() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0];
}

const PLATFORM_BADGE: Record<string, string> = {
  google:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  meta:    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  shopify: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_BADGE: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  archived: "bg-slate-800 text-slate-500 border-white/5",
};

interface Props {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}

export default async function CampaignDetailPage({ params, searchParams }: Props) {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const from = searchParams.from ?? daysAgo(30);
  const to   = searchParams.to   ?? today();

  const supabase = createServiceClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, platform, status, campaign_type")
    .eq("id", params.id)
    .eq("client_id", orgId)
    .single();

  if (!campaign) return notFound();

  // Calculate Previous Period for Comparison
  const start = parseISO(from);
  const end   = parseISO(to);
  const days  = differenceInDays(end, start) + 1;
  const prevTo   = subDays(start, 1);
  const prevFrom = subDays(prevTo, days - 1);

  const fromStr = from;
  const toStr   = to;
  const prevFromStr = format(prevFrom, "yyyy-MM-dd");
  const prevToStr   = format(prevTo, "yyyy-MM-dd");

  // Fetch Current & Previous Metrics
  const { data: metrics } = await supabase
    .from("daily_metrics")
    .select("date, spend, revenue, impressions, clicks, conversions")
    .eq("campaign_id", params.id)
    .gte("date", prevFromStr)
    .lte("date", toStr);

  const rows = metrics ?? [];
  const currentRows = rows.filter(r => r.date >= fromStr && r.date <= toStr);
  const prevRows    = rows.filter(r => r.date >= prevFromStr && r.date <= prevToStr);

  const calcTotals = (items: any[]) => items.reduce(
    (acc, r) => ({
      spend:       acc.spend       + (r.spend ?? 0),
      revenue:     acc.revenue     + (r.revenue ?? 0),
      impressions: acc.impressions + (r.impressions ?? 0),
      clicks:      acc.clicks      + (r.clicks ?? 0),
      conversions: acc.conversions + (r.conversions ?? 0),
    }),
    { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const curT = calcTotals(currentRows);
  const prvT = calcTotals(prevRows);

  const getTrend = (cur: number, prv: number) => {
    if (prv === 0) return null;
    return ((cur - prv) / prv) * 100;
  };

  const kpis = [
    { label: "Allocation",    value: formatCurrency(curT.spend), trend: getTrend(curT.spend, prvT.spend), inverse: true },
    { label: "Yield",         value: formatCurrency(curT.revenue), trend: getTrend(curT.revenue, prvT.revenue) },
    { label: "Efficiency",    value: curT.spend > 0 ? formatMultiplier(curT.revenue / curT.spend) : "—", trend: getTrend(curT.spend > 0 ? curT.revenue / curT.spend : 0, prvT.spend > 0 ? prvT.revenue / prvT.spend : 0) },
    { label: "Audience",      value: formatNumber(curT.impressions), trend: getTrend(curT.impressions, prvT.impressions) },
    { label: "Engagement",    value: formatNumber(curT.clicks), trend: getTrend(curT.clicks, prvT.clicks) },
    { label: "Conversion",    value: formatNumber(curT.conversions), trend: getTrend(curT.conversions, prvT.conversions) },
  ];

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 space-y-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-6">
            <Link href="/campaigns" className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em] italic group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retrace Deployment
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Node Intelligence</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white italic">{campaign.name}</h1>
              <div className="flex items-center gap-4 mt-5">
                <span className={cn("text-[10px] font-bold px-3 py-1 rounded-md border uppercase tracking-widest", PLATFORM_BADGE[campaign.platform] || "bg-slate-800 text-slate-500 border-white/5")}>
                  {campaign.platform}
                </span>
                <span className={cn("text-[10px] font-bold px-3 py-1 rounded-md border uppercase tracking-widest", STATUS_BADGE[campaign.status ?? "active"])}>
                  {campaign.status ?? "active"}
                </span>
                {campaign.campaign_type && (
                  <span className="text-[10px] font-black text-slate-600 flex items-center gap-2 uppercase tracking-widest italic ml-2">
                    <Target className="w-4 h-4" /> {campaign.campaign_type}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
            <DateRangePicker from={from} to={to} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {kpis.map(kpi => (
            <div key={kpi.label} className="rounded-3xl bg-card p-6 border border-white/5 flex flex-col justify-between hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 group">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 group-hover:text-slate-400">{kpi.label}</p>
              <div>
                <p className="text-2xl font-black text-white tracking-tight italic">{kpi.value}</p>
                {kpi.trend !== null && (
                  <div className={cn("flex items-center gap-1 mt-3 text-[10px] font-bold uppercase tracking-widest italic", 
                    (kpi.trend >= 0 !== !!kpi.inverse) ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {kpi.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(kpi.trend).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Chart Area */}
        <div className="rounded-[2.5rem] bg-card p-10 shadow-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative flex items-center justify-between mb-10 z-10">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight italic flex items-center gap-3">
                <Zap className="w-5 h-5 text-indigo-500 fill-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /> Deployment Pulse
              </h2>
              <p className="text-slate-500 text-xs mt-1 font-medium italic">High-velocity tracking of ad allocation vs yield</p>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full border border-white/5 italic">
              <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Allocation</div>
              <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Yield</div>
            </div>
          </div>
          <CampaignDailyChart data={currentRows.map(r => ({ date: r.date, spend: r.spend ?? 0, revenue: r.revenue ?? 0 }))} />
        </div>

        {/* Table Breakdown */}
        <div className="rounded-[2rem] bg-card shadow-2xl border border-white/5 overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest italic flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-400" /> Operational Journal
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  {["Date", "Allocation", "Yield", "Efficiency", "Conv.", "Conv. Rate", "CPA"].map(h => (
                    <th key={h} className="px-8 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentRows.slice().reverse().map(r => {
                  const roas = r.spend > 0 ? r.revenue / r.spend : 0;
                  const cr   = r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0;
                  const cpa  = r.conversions > 0 ? r.spend / r.conversions : 0;
                  return (
                    <tr key={r.date} className="hover:bg-white/[0.03] transition-all duration-300 group">
                      <td className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-wider tabular-nums italic group-hover:text-white transition-colors">{r.date}</td>
                      <td className="px-8 py-5 font-bold text-white tabular-nums tracking-tight">{formatCurrency(r.spend ?? 0)}</td>
                      <td className="px-8 py-5 font-bold text-white tabular-nums tracking-tight">{formatCurrency(r.revenue ?? 0)}</td>
                      <td className="px-8 py-5 tabular-nums">
                        {roas > 0 ? (
                          <span className={cn("text-[11px] font-black italic", roas >= 4 ? "text-emerald-400" : roas >= 2.5 ? "text-indigo-400" : "text-amber-400")}>
                            {formatMultiplier(roas, 2)} ROAS
                          </span>
                        ) : <span className="text-slate-700 italic font-medium">pending</span>}
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-500 tabular-nums">{formatNumber(r.conversions ?? 0)}</td>
                      <td className="px-8 py-5 tabular-nums text-slate-600 font-bold italic tracking-tighter">{cr > 0 ? formatPercent(cr) : "—"}</td>
                      <td className="px-8 py-5 tabular-nums font-bold text-slate-500">{cpa > 0 ? formatCurrency(cpa) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
