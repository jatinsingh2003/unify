// app/(dashboard)/overview/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PlatformFilter } from "@/components/dashboard/platform-filter";
import { ComparisonToggle } from "@/components/dashboard/comparison-toggle";
import { InsightsSummary } from "@/components/dashboard/insights-summary";

export const metadata: Metadata = { title: "Overview" };

function today() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0];
}

interface Props {
  searchParams: { from?: string; to?: string; platform?: string; compare?: string };
}

export default function OverviewPage({ searchParams }: Props) {
  const from = searchParams.from ?? daysAgo(30);
  const to = searchParams.to ?? today();
  const platform = searchParams.platform ?? "all";
  const compare = searchParams.compare === "1";

  return (
    <div className="min-h-screen bg-background container-padding transition-colors duration-500">
      <div className="max-w-7xl mx-auto section-spacing">
        {/* Header + Controls */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-1.5">
            <h1 className="text-heading-lg">Dashboard</h1>
            <p className="text-body-sm">
              Last 30 days performance
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 bg-white/[0.02] p-2 rounded-2xl border border-white/[0.05] backdrop-blur-sm">
            <PlatformFilter current={platform} />
            <div className="h-5 w-px bg-white/10 mx-0.5" />
            <DateRangePicker from={from} to={to} />
            <ComparisonToggle active={compare} />
          </div>
        </div>

        {/* Automated Insights Section */}
        <section className="space-y-6">
          <div className="px-1 flex items-center justify-between">
            <h2 className="text-ui-label">Performance Intelligence</h2>
          </div>
          <Suspense fallback={<div className="h-24 bg-white/[0.02] rounded-2xl animate-pulse" />}>
            <InsightsSummary from={from} to={to} />
          </Suspense>
        </section>

        {/* Vital KPIs Section */}
        <section className="space-y-6">
          <div className="px-1 flex items-center justify-between">
            <h2 className="text-ui-label">Vital Metrics</h2>
          </div>
          <KpiGrid from={from} to={to} platform={platform} compare={compare} />
        </section>

        {/* Performance Visualization Section */}
        <section className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
            <h2 className="text-heading-md">Revenue Velocity</h2>
            <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/[0.02] px-5 py-2 rounded-full border border-white/[0.05]">
              <div className="flex items-center gap-2.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Ad Spend</div>
              <div className="flex items-center gap-2.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Net Revenue</div>
            </div>
          </div>
          
          <div className="rounded-[2rem] bg-card p-10 border border-white/[0.05] relative overflow-hidden group">
            <PerformanceChart from={from} to={to} platform={platform} />
          </div>
        </section>
      </div>
    </div>
  );
}
