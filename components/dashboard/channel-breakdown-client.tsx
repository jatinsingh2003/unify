"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatMultiplier } from "@/lib/utils";

const PLATFORM_COLORS: Record<string, string> = {
  google_ads: "#4285F4",
  meta_ads:   "#0866FF",
  shopify:    "#96BF48",
};

interface ChannelData {
  platform: string;
  label: string;
  spend: number;
  revenue: number;
  conversions: number;
}

export function ChannelBreakdownClient({ data }: { data: ChannelData[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-sm text-muted-foreground">
        <p>No connected platforms yet.</p>
        <a href="/integrations" className="text-primary text-xs mt-1 hover:underline">
          Connect a platform →
        </a>
      </div>
    );
  }

  const totalSpend = data.reduce((s, d) => s + d.spend, 0);

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="spend"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            strokeWidth={2}
            stroke="hsl(0 0% 100%)"
          >
            {data.map((entry) => (
              <Cell
                key={entry.platform}
                fill={PLATFORM_COLORS[entry.platform] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value, "USD", true),
              name,
            ]}
            contentStyle={{
              fontSize: 12,
              border: "1px solid hsl(220 13% 91%)",
              borderRadius: "8px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend + stats */}
      <div className="space-y-2">
        {data.map((entry) => {
          const pct = totalSpend > 0 ? (entry.spend / totalSpend) * 100 : 0;
          const roas = entry.spend > 0 ? entry.revenue / entry.spend : 0;
          return (
            <div key={entry.platform} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: PLATFORM_COLORS[entry.platform] ?? "#94a3b8" }}
              />
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {entry.label}
              </span>
              <span className="text-xs font-medium tabular-nums">
                {formatCurrency(entry.spend, "USD", true)}
              </span>
              <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                {pct.toFixed(0)}%
              </span>
              {roas > 0 && (
                <span className="text-xs text-emerald-600 w-12 text-right tabular-nums">
                  {formatMultiplier(roas, 1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
