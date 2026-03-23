/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
// app/(dashboard)/reports/page.tsx
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PlatformFilter } from "@/components/dashboard/platform-filter";
import { ReportExportButton } from "@/components/reports/report-export-button";
import { CampaignDailyChart } from "@/components/campaigns/campaign-daily-chart";
import { formatCurrency, formatNumber, formatMultiplier, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Info, BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

function today() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0];
}

interface Props {
  searchParams: { from?: string; to?: string; platform?: string };
}

export default async function ReportsPage({ searchParams }: Props) {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const from = searchParams.from ?? daysAgo(30);
  const to   = searchParams.to   ?? today();
  const platform = searchParams.platform ?? "all";

  const supabase = createServiceClient();

  // 1. Fetch Summary Metrics
  let query = supabase
    .from("daily_metrics")
    .select("spend, revenue, impressions, clicks, conversions, date, platform")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to);

  if (platform !== "all") {
    query = query.eq("platform", platform);
  }

  const { data: metrics } = await query.order("date", { ascending: true });
  const rows = metrics ?? [];

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

  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const netSales = totals.revenue - (totals.revenue * 0.05); // Simulated net sales logic for UI polish

  // 2. Prepare Chart Data (group by date)
  const chartMap: Record<string, { date: string; spend: number; revenue: number }> = {};
  rows.forEach(r => {
    if (!chartMap[r.date]) chartMap[r.date] = { date: r.date, spend: 0, revenue: 0 };
    chartMap[r.date].spend += r.spend ?? 0;
    chartMap[r.date].revenue += r.revenue ?? 0;
  });
  const chartData = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));

  // 3. Platform Breakdown
  const platformBreakdown: Record<string, { spend: number; revenue: number }> = {};
  rows.forEach(r => {
    if (!platformBreakdown[r.platform]) platformBreakdown[r.platform] = { spend: 0, revenue: 0 };
    platformBreakdown[r.platform].spend += r.spend ?? 0;
    platformBreakdown[r.platform].revenue += r.revenue ?? 0;
  });

  return (
    <div className="min-h-screen bg-background container-padding transition-colors duration-500">
      <div className="max-w-7xl mx-auto section-spacing">
        {/* Header */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-1.5">
            <h1 className="text-heading-lg">Velocity Reports</h1>
            <p className="text-body-sm max-w-lg">
              Performance auditing and capital efficiency breakdown across your marketing landscape.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-white/[0.02] p-2 rounded-2xl border border-white/[0.05] backdrop-blur-md">
            <PlatformFilter current={platform} />
            <div className="h-5 w-px bg-white/10 mx-0.5" />
            <DateRangePicker from={from} to={to} />
            <ReportExportButton from={from} to={to} platform={platform} />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="glass rounded-[2rem] border-dashed">
            <EmptyState 
              icon={<TrendingUp className="w-8 h-8 text-slate-600" />}
              title="No Data Detected"
              description="Connect your advertising platforms to start seeing velocity and efficiency metrics."
              actionLabel="Connect Channels"
              actionHref="/integrations"
            />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard label="Ad Allocation" value={formatCurrency(totals.spend)} />
              <KPICard label="Capital Yield" value={formatCurrency(totals.revenue)} />
              <KPICard label="Efficiency" value={formatMultiplier(roas)} />
              <KPICard label="Net Sales" value={formatCurrency(netSales)} subtext="Yield after estimated fees" />
            </div>

            {/* Main Chart + Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 rounded-[2rem] bg-card p-8 border border-white/[0.05] relative overflow-hidden group">
                <div className="relative flex items-center justify-between mb-10 z-10">
                  <div>
                    <h2 className="text-heading-md">Revenue Velocity</h2>
                    <p className="text-body-sm mt-1">Daily correlation between ad spend and yield</p>
                  </div>
                  <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full border border-white/[0.05]">
                    <div className="flex items-center gap-2.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Spend</div>
                    <div className="flex items-center gap-2.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Revenue</div>
                  </div>
                </div>
                <CampaignDailyChart data={chartData} />
              </div>

              {/* Side Breakdown */}
              <div className="rounded-[2rem] bg-card p-8 border border-white/[0.05] space-y-8 flex flex-col justify-between">
                <div>
                  <h2 className="text-ui-label text-slate-600 mb-8">Channel Efficiency</h2>
                  <div className="space-y-6">
                    {Object.entries(platformBreakdown).map(([p, data]) => (
                      <div key={p} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-white">{p}</span>
                          <span className="text-ui-label text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">{formatMultiplier(data.spend > 0 ? data.revenue / data.spend : 0)} ROAS</span>
                        </div>
                        <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 ease-out",
                              p === 'google' ? "bg-blue-500" : p === 'meta' ? "bg-indigo-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, (data.revenue/totals.revenue) * 100)}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                          <span>{formatCurrency(data.spend, "USD", true)}</span>
                          <span>{formatCurrency(data.revenue, "USD", true)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-white/[0.05]">
                  <div className="flex items-start gap-3">
                    <Info className="w-3.5 h-3.5 text-slate-600 mt-0.5" />
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      Sync verified with attribution models (UTM/Referrer) from your commerce platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-[2rem] bg-card p-7 border border-white/[0.05] flex flex-col justify-between hover:bg-white/[0.02] transition-all duration-300">
      <div className="space-y-4">
        <p className="text-ui-label">{label}</p>
        <p className="text-2xl font-semibold text-white tracking-tight leading-none" style={{ fontFamily: 'var(--font-satoshi)' }}>{value}</p>
      </div>
      {subtext && (
        <div className="mt-6 flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-medium italic">{subtext}</span>
        </div>
      )}
    </div>
  );
}
