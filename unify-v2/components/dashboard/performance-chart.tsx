"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";

interface Props { days?: number; platform?: string; }

export function PerformanceChart({ days = 30, platform = "all" }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics/timeseries?days=${days}&platform=${platform}`)
      .then(r => r.json()).then(json => { setData(json.series ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days, platform]);

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div>;
  if (!data.length) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data yet — connect a platform and run a sync.</div>;

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), "MMM d")} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number, n: string) => [fmt(v), n.charAt(0).toUpperCase() + n.slice(1)]} labelFormatter={l => format(parseISO(l), "MMM d, yyyy")} />
        <Legend />
        <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2} fill="url(#spend)" name="Spend" />
        <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenue)" name="Revenue" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
