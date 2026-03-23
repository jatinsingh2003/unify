/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
// components/dashboard/alerts-banner.tsx
// Shows a warning if average ROAS for the last 7 days is below 2.
import { createServiceClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { AlertTriangle } from "lucide-react";

interface Props {
  orgId: string | null; // allow null, will re-fetch from auth
  from: string;
  to: string;
}

export async function AlertsBanner({ orgId: _orgId, from, to }: Props) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const supabase = createServiceClient();

  // Fetch last 7 days for current period
  const { data: current } = await supabase
    .from("daily_metrics")
    .select("spend, revenue")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to);

  if (!current?.length) return null;

  const totSpend   = current.reduce((s, r) => s + (r.spend ?? 0), 0);
  const totRevenue = current.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const roas       = totSpend > 0 ? totRevenue / totSpend : null;

  if (roas === null || roas >= 2) return null;

  // Previous 7 days for change %
  const prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - 7);
  const prevTo   = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const { data: prev } = await supabase
    .from("daily_metrics")
    .select("spend, revenue")
    .eq("client_id", orgId)
    .gte("date", fmt(prevFrom))
    .lte("date", fmt(prevTo));

  const prevSpend   = (prev ?? []).reduce((s, r) => s + (r.spend ?? 0), 0);
  const prevRevenue = (prev ?? []).reduce((s, r) => s + (r.revenue ?? 0), 0);
  const prevRoas    = prevSpend > 0 ? prevRevenue / prevSpend : null;
  const change      = prevRoas !== null && prevRoas > 0 ? ((roas - prevRoas) / prevRoas) * 100 : null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>
        <span className="font-semibold">Low ROAS alert:</span> Your ROAS over the last 7 days is{" "}
        <span className="font-mono font-semibold">{roas.toFixed(2)}x</span>
        {change !== null && (
          <span className="ml-1">({change > 0 ? "+" : ""}{change.toFixed(1)}% vs. prior period)</span>
        )}
        . Consider reviewing your ad spend or creative performance.
      </p>
    </div>
  );
}
