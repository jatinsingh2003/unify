"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

interface Props {
  from: string;
  to: string;
}

const PRESETS = [
  { label: "7d", days: 7 },
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
    <div className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-white/5 px-1.5 py-1.5 backdrop-blur-md">
      <CalendarDays className="w-3.5 h-3.5 text-slate-500 ml-2" />

      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyRange(daysAgo(p.days), todayStr)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activePreset === p.label
                ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
        <input
          type="date"
          defaultValue={from}
          max={to}
          onChange={(e) => applyRange(e.target.value, to)}
          className="text-[10px] uppercase font-bold tracking-widest border-none bg-transparent outline-none text-slate-400 w-[95px] cursor-pointer hover:text-white transition-colors"
        />
        <span className="text-[10px] text-slate-600 font-bold italic">→</span>
        <input
          type="date"
          defaultValue={to}
          min={from}
          max={todayStr}
          onChange={(e) => applyRange(from, e.target.value)}
          className="text-[10px] uppercase font-bold tracking-widest border-none bg-transparent outline-none text-slate-400 w-[95px] cursor-pointer hover:text-white transition-colors"
        />
      </div>
    </div>
  );
}
