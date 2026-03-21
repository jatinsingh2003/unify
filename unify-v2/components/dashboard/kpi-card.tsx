"use client";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string; value: string; change: number | null;
  icon?: React.ReactNode; loading?: boolean;
}

export function KpiCard({ title, value, change, icon, loading }: Props) {
  if (loading) return (
    <div className="rounded-xl border bg-card p-5 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-3" />
      <div className="h-8 w-32 bg-muted rounded mb-2" />
      <div className="h-3 w-20 bg-muted rounded" />
    </div>
  );
  const isPos = change !== null && change > 0;
  const isNeg = change !== null && change < 0;
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm font-medium">{title}</span>
        {icon && <span>{icon}</span>}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {change !== null ? (
        <div className={cn("flex items-center gap-1 text-xs font-medium",
          isPos && "text-green-500", isNeg && "text-red-500", !isPos && !isNeg && "text-muted-foreground")}>
          {isPos && <ArrowUpIcon className="w-3 h-3" />}
          {isNeg && <ArrowDownIcon className="w-3 h-3" />}
          {!isPos && !isNeg && <MinusIcon className="w-3 h-3" />}
          <span>{isPos ? "+" : ""}{change.toFixed(1)}% vs prev period</span>
        </div>
      ) : <span className="text-xs text-muted-foreground">No previous data</span>}
    </div>
  );
}
