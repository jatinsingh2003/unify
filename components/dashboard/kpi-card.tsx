"use client";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/count-up";

interface Props {
  title: string; value: string; change: number | null;
  icon?: React.ReactNode; loading?: boolean;
}

export function KpiCard({ title, value, change, icon, loading }: Props) {
  if (loading) return (
    <div className="rounded-2xl bg-card/50 p-6 border border-white/5 animate-pulse">
      <div className="h-3 w-16 bg-white/5 rounded-full mb-4" />
      <div className="h-7 w-24 bg-white/5 rounded-lg mb-3" />
      <div className="h-3 w-12 bg-white/5 rounded-full" />
    </div>
  );

  const isPos = change !== null && change > 0;
  const isNeg = change !== null && change < 0;

  // Extract numeric value for CountUp
  const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ""));
  const prefix = value.match(/^\D+/)?.[0] || "";
  const suffix = value.match(/\D+$/)?.[0] || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative p-6 rounded-[2rem] bg-card border border-white/[0.05] group transition-all duration-300"
    >
      <div className="relative flex items-center justify-between z-10">
        <span className="text-ui-label">{title}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-slate-500 border border-white/[0.05] group-hover:text-indigo-400 transition-all duration-300">
            {icon}
          </div>
        )}
      </div>

      <div className="relative mt-4 z-10 flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-medium text-slate-500 leading-none">{prefix}</span>
          <CountUp 
            value={numValue} 
            className="text-kpi-value text-white"
            formatter={(val) => val.toLocaleString(undefined, { maximumFractionDigits: (numValue % 1 === 0 ? 0 : 2) })}
          />
          <span className="text-lg font-medium text-slate-500 leading-none">{suffix}</span>
        </div>

        {change !== null && (
          <div className="mt-4 flex items-center gap-2 self-start">
            <div className={cn(
              isPos ? "trend-up" : isNeg ? "trend-down" : "bg-white/[0.05] text-slate-500 border border-white/[0.05] px-2 py-0.5 rounded-full text-[10px] font-medium"
            )}>
              <span className="flex items-center gap-1">
                {isPos && <ArrowUpIcon className="w-2.5 h-2.5" />}
                {isNeg && <ArrowDownIcon className="w-2.5 h-2.5" />}
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-600 font-medium opacity-60">since last period</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
