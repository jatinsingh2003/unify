import type { Metadata } from "next";
import { Suspense } from "react";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { ChannelBreakdown } from "@/components/dashboard/channel-breakdown";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { KpiGridSkeleton } from "@/components/dashboard/kpi-grid-skeleton";
import { ChartSkeleton } from "@/components/dashboard/chart-skeleton";

export const metadata: Metadata = { title: "Overview" };

// Default to last 30 days
function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function OverviewPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const defaults = getDefaultDates();
  const from = searchParams.from ?? defaults.from;
  const to = searchParams.to ?? defaults.to;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unified performance across all channels
          </p>
        </div>
        <DateRangePicker from={from} to={to} />
      </div>

      {/* KPI cards */}
      <Suspense fallback={<KpiGridSkeleton />}>
        <KpiGrid from={from} to={to} />
      </Suspense>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <PerformanceChart from={from} to={to} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<ChartSkeleton />}>
            <ChannelBreakdown from={from} to={to} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
