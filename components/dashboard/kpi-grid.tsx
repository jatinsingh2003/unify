import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { KpiCard } from "./kpi-card";
import { formatCurrency, formatNumber, formatMultiplier, formatPercent } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  MousePointerClick,
  Target,
  Repeat2,
} from "lucide-react";

interface Props {
  from: string;
  to: string;
}

interface Totals {
  spend: number;
  revenue: number;
  conversions: number;
  orders: number;
  clicks: number;
  impressions: number;
  roas: number;
  cpa: number;
  ctr: number;
  aov: number;
}

async function getMetrics(orgId: string, from: string, to: string): Promise<Totals> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("daily_metrics")
    .select("spend, revenue, conversions, orders, clicks, impressions")
    .eq("client_id", orgId)
    .gte("date", from)
    .lte("date", to);

  const rows = data ?? [];
  const t = rows.reduce(
    (acc, r) => ({
      spend:       acc.spend       + Number(r.spend ?? 0),
      revenue:     acc.revenue     + Number(r.revenue ?? 0),
      conversions: acc.conversions + Number(r.conversions ?? 0),
      orders:      acc.orders      + Number(r.orders ?? 0),
      clicks:      acc.clicks      + Number(r.clicks ?? 0),
      impressions: acc.impressions + Number(r.impressions ?? 0),
    }),
    { spend: 0, revenue: 0, conversions: 0, orders: 0, clicks: 0, impressions: 0 }
  );

  return {
    ...t,
    roas: t.spend > 0 ? t.revenue / t.spend : 0,
    cpa:  t.conversions > 0 ? t.spend / t.conversions : 0,
    ctr:  t.impressions > 0 ? t.clicks / t.impressions : 0,
    aov:  t.orders > 0 ? t.revenue / t.orders : 0,
  };
}

export async function KpiGrid({ from, to }: Props) {
  const { orgId } = auth();
  if (!orgId) return null;

  const metrics = await getMetrics(orgId, from, to);

  const cards = [
    {
      title: "Total Spend",
      value: formatCurrency(metrics.spend, "USD", true),
      icon: DollarSign,
      description: "Ad spend across all platforms",
      color: "blue" as const,
    },
    {
      title: "Revenue",
      value: formatCurrency(metrics.revenue, "USD", true),
      icon: TrendingUp,
      description: "Attributed conversion revenue",
      color: "emerald" as const,
    },
    {
      title: "ROAS",
      value: formatMultiplier(metrics.roas),
      icon: Repeat2,
      description: "Return on ad spend",
      color: metrics.roas >= 2 ? ("emerald" as const) : ("amber" as const),
    },
    {
      title: "Conversions",
      value: formatNumber(metrics.conversions),
      icon: Target,
      description: "Total conversion actions",
      color: "violet" as const,
    },
    {
      title: "CPA",
      value: metrics.cpa > 0 ? formatCurrency(metrics.cpa) : "—",
      icon: ShoppingCart,
      description: "Cost per acquisition",
      color: "blue" as const,
    },
    {
      title: "Clicks",
      value: formatNumber(metrics.clicks),
      icon: MousePointerClick,
      description: `CTR: ${formatPercent(metrics.ctr)}`,
      color: "slate" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}
