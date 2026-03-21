// components/dashboard/kpi-grid.tsx
// Fetches overview metrics and renders the 6-card KPI row.

"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "./kpi-card";
import {
  DollarSignIcon,
  TrendingUpIcon,
  MousePointerClickIcon,
  EyeIcon,
  ShoppingCartIcon,
  PercentIcon,
} from "lucide-react";

interface Props {
  days?: number;
  platform?: string;
}

interface OverviewData {
  current: {
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
    roas: number;
    ctr: number;
  };
  changes: Record<string, number | null>;
}

function fmt(value: number, type: "currency" | "number" | "percent" | "roas") {
  if (type === "currency")
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  if (type === "percent") return `${value.toFixed(2)}%`;
  if (type === "roas") return `${value.toFixed(2)}x`;
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

export function KpiGrid({ days = 30, platform = "all" }: Props) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics/overview?days=${days}&platform=${platform}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days, platform]);

  const cards = [
    {
      title: "Total Spend",
      value: data ? fmt(data.current.spend, "currency") : "$0",
      change: data?.changes.spend ?? null,
      icon: <DollarSignIcon className="w-4 h-4" />,
    },
    {
      title: "Revenue",
      value: data ? fmt(data.current.revenue, "currency") : "$0",
      change: data?.changes.revenue ?? null,
      icon: <TrendingUpIcon className="w-4 h-4" />,
    },
    {
      title: "ROAS",
      value: data ? fmt(data.current.roas, "roas") : "0x",
      change: data?.changes.roas ?? null,
      icon: <PercentIcon className="w-4 h-4" />,
    },
    {
      title: "Impressions",
      value: data ? fmt(data.current.impressions, "number") : "0",
      change: data?.changes.impressions ?? null,
      icon: <EyeIcon className="w-4 h-4" />,
    },
    {
      title: "Clicks",
      value: data ? fmt(data.current.clicks, "number") : "0",
      change: data?.changes.clicks ?? null,
      icon: <MousePointerClickIcon className="w-4 h-4" />,
    },
    {
      title: "Conversions",
      value: data ? fmt(data.current.conversions, "number") : "0",
      change: data?.changes.conversions ?? null,
      icon: <ShoppingCartIcon className="w-4 h-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} loading={loading} />
      ))}
    </div>
  );
}
