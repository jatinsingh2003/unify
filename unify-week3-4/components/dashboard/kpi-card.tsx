// components/dashboard/kpi-card.tsx
// Individual KPI metric card with trend indicator.

"use client";

import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string;
  change: number | null; // percentage change vs previous period
  icon?: React.ReactNode;
  loading?: boolean;
}

export function KpiCard({ title, value, change, icon, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-3" />
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
    );
  }

  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm font-medium">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>

      <p className="text-2xl font-bold tracking-tight">{value}</p>

      {change !== null ? (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isPositive && "text-green-500",
            isNegative && "text-red-500",
            !isPositive && !isNegative && "text-muted-foreground"
          )}
        >
          {isPositive && <ArrowUpIcon className="w-3 h-3" />}
          {isNegative && <ArrowDownIcon className="w-3 h-3" />}
          {!isPositive && !isNegative && <MinusIcon className="w-3 h-3" />}
          <span>
            {isPositive ? "+" : ""}
            {change.toFixed(1)}% vs prev period
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No previous data</span>
      )}
    </div>
  );
}
