"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Info, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Insight {
  type: "positive" | "negative" | "neutral";
  label: string;
  message: string;
}

export function InsightsSummary({ from, to }: { from: string; to: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/metrics/insights?from=${from}&to=${to}`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data);
        }
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [from, to]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/5" />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center">
        <Sparkles className="w-5 h-5 text-slate-600 mb-3" />
        <p className="text-ui-label text-slate-500">Generating intelligence from your marketing data...</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="px-1">
        <h2 className="text-ui-label text-slate-600">Performance Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, idx) => (
            <motion.div
              key={insight.message}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className={cn(
                "p-5 rounded-2xl border transition-all hover:bg-white/[0.02] cursor-default group relative overflow-hidden",
                insight.type === "positive" 
                  ? "bg-emerald-500/[0.02] border-emerald-500/10" 
                  : insight.type === "negative"
                  ? "bg-rose-500/[0.02] border-rose-500/10"
                  : "bg-white/[0.01] border-white/[0.05]"
              )}
            >
              <div className="flex items-start gap-4 h-full">
                <div className={cn(
                  "mt-0.5 p-2 rounded-xl border shrink-0",
                  insight.type === "positive" 
                    ? "bg-emerald-500/10 border-emerald-500/10 text-emerald-400" 
                    : insight.type === "negative"
                    ? "bg-rose-500/10 border-rose-500/10 text-rose-400"
                    : "bg-white/5 border-white/[0.05] text-indigo-400"
                )}>
                  {insight.type === "positive" ? <TrendingUp className="w-4 h-4" /> : 
                   insight.type === "negative" ? <TrendingDown className="w-4 h-4" /> : 
                   <Lightbulb className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-ui-label mb-1">{insight.label}</h4>
                  <p className="text-xs text-white leading-relaxed font-medium">{insight.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
