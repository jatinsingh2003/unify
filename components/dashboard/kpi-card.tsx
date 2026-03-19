import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Color = "blue" | "emerald" | "amber" | "violet" | "rose" | "slate";

const colorMap: Record<Color, { bg: string; icon: string }> = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-500" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-500" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-500" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-500" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-500" },
  slate:   { bg: "bg-slate-100",  icon: "text-slate-500" },
};

interface KpiCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  color: Color;
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: KpiCardProps) {
  const { bg, icon } = colorMap[color];

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/20 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", bg)}>
          <Icon className={cn("w-3.5 h-3.5", icon)} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
