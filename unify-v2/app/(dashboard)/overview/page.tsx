import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { PerformanceChart } from "@/components/dashboard/performance-chart";

export default function OverviewPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">All platforms · Last 30 days</p>
      </div>
      <KpiGrid days={30} platform="all" />
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-4">Spend vs Revenue</h2>
        <PerformanceChart days={30} platform="all" />
      </div>
    </div>
  );
}
