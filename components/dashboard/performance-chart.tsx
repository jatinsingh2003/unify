/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ShoppingCartIcon } from "lucide-react";

interface Props { from: string; to: string; platform?: string; }

export function PerformanceChart({ from, to, platform = "all" }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ from, to, platform });
    fetch(`/api/metrics/timeseries?${params}`)
      .then(r => r.json()).then(json => { setData(json.series ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [from, to, platform]);

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20" />
      </div>
      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest animate-pulse">Analyzing velocity...</p>
    </div>
  );
  
  if (!data.length) return (
    <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
      <div className="w-16 h-16 rounded-full bg-indigo-500/5 flex items-center justify-center mb-6 ring-1 ring-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
        <ShoppingCartIcon className="w-6 h-6 text-indigo-500/40" />
      </div>
      <h3 className="text-sm font-bold text-slate-300 tracking-tight mb-2">No Performance Data Yet</h3>
      <p className="text-[11px] text-slate-500 font-medium max-w-xs text-center leading-relaxed">
        Connect your Shopify store or ad platforms in the <span className="text-indigo-400">Channels</span> section to begin tracking your marketing velocity.
      </p>
    </div>
  );

  const fmtCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
        <XAxis 
          dataKey="date" 
          tickFormatter={d => format(parseISO(d), "MMM d")} 
          tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis 
          tickFormatter={fmtCurrency} 
          tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
          axisLine={false}
          tickLine={false}
          dx={-10}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(11, 15, 20, 0.8)', 
            backdropFilter: 'blur(12px)',
            borderRadius: '12px', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            padding: '12px'
          }}
          itemStyle={{ fontSize: '11px', fontWeight: 600, padding: '2px 0' }}
          labelStyle={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}
          formatter={(v: number, n: string) => [fmtCurrency(v), n]} 
          labelFormatter={l => format(parseISO(l), "MMMM d, yyyy")} 
        />
        <Legend 
          verticalAlign="top" 
          align="right" 
          height={40} 
          iconType="circle" 
          iconSize={6}
          wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', paddingBottom: '20px' }}
        />
        <Area 
          type="monotone" 
          dataKey="spend" 
          stroke="#6366f1" 
          strokeWidth={3} 
          fill="url(#gSpend)" 
          name="Ad Spend" 
          animationDuration={2000}
        />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#10b981" 
          strokeWidth={3} 
          fill="url(#gRevenue)" 
          name="Net Revenue" 
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
