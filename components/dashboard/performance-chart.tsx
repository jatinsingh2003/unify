import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { PerformanceChartClient } from "./performance-chart-client";

interface Props { from: string; to: string }

export async function PerformanceChart({ from, to }: Props) {
  const { orgId } = auth();
  if (!orgId) return null;

  const supabase = await createClient();

  const { data } = await supabase
    .from("daily_metrics")
    .select("date, spend, revenue, conversions")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  // Aggregate by date across platforms
  const byDate = new Map<string, { date: string; spend: number; revenue: number; conversions: number }>();
  for (const row of data ?? []) {
    const existing = byDate.get(row.date) ?? { date: row.date, spend: 0, revenue: 0, conversions: 0 };
    byDate.set(row.date, {
      date: row.date,
      spend:       existing.spend       + Number(row.spend ?? 0),
      revenue:     existing.revenue     + Number(row.revenue ?? 0),
      conversions: existing.conversions + Number(row.conversions ?? 0),
    });
  }

  const series = Array.from(byDate.values());

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Performance Over Time</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Spend vs revenue across all channels</p>
      </div>
      <PerformanceChartClient data={series} />
    </div>
  );
}
