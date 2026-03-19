"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

interface Props {
  from: string;
  to: string;
}

const PRESETS = [
  { label: "7d",  days: 7  },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function applyRange(f: string, t: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", f);
    params.set("to", t);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Determine active preset
  const todayStr = today();
  const activePreset = PRESETS.find(
    (p) => from === daysAgo(p.days) && to === todayStr
  )?.label;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-1 py-1">
      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />

      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => applyRange(daysAgo(p.days), todayStr)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            activePreset === p.label
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Custom date inputs */}
      <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
        <input
          type="date"
          defaultValue={from}
          max={to}
          onChange={(e) => applyRange(e.target.value, to)}
          className="text-xs border-none bg-transparent outline-none text-muted-foreground w-28 cursor-pointer"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <input
          type="date"
          defaultValue={to}
          min={from}
          max={todayStr}
          onChange={(e) => applyRange(from, e.target.value)}
          className="text-xs border-none bg-transparent outline-none text-muted-foreground w-28 cursor-pointer"
        />
      </div>
    </div>
  );
}
