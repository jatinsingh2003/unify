"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DailyRow {
  date: string;
  spend: number;
  revenue: number;
}

interface Props {
  data: DailyRow[];
}

export function CampaignDailyChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        No daily data for this period.
      </div>
    );
  }

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), "MMM d")} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v: number, n: string) => [fmtCurrency(v), n]}
          labelFormatter={l => format(parseISO(l), "MMM d, yyyy")}
        />
        <Legend />
        <Area type="monotone" dataKey="spend"   stroke="#6366f1" strokeWidth={2} fill="url(#cs)" name="Spend"   />
        <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#cr)" name="Revenue" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
