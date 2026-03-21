// components/dashboard/channel-breakdown.tsx
// Donut chart showing spend breakdown by platform.

"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS: Record<string, string> = {
  google: "#4285F4",
  meta: "#1877F2",
  shopify: "#96BF48",
};

interface Props {
  days?: number;
}

export function ChannelBreakdown({ days = 30 }: Props) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch spend for each platform in parallel
    Promise.all(
      ["google", "meta", "shopify"].map((p) =>
        fetch(`/api/metrics/overview?days=${days}&platform=${p}`)
          .then((r) => r.json())
          .then((json) => ({ name: p, value: json.current?.spend ?? 0 }))
      )
    )
      .then((results) => {
        setData(results.filter((r) => r.value > 0));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatLabel = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
            No spend data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name] ?? "#888"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(value)
                }
              />
              <Legend formatter={formatLabel} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
