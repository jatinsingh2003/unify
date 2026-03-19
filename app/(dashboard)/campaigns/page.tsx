import type { Metadata } from "next";
import { Suspense } from "react";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TableSkeleton } from "@/components/campaigns/table-skeleton";

export const metadata: Metadata = { title: "Campaigns" };

function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function CampaignsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; platform?: string };
}) {
  const defaults = getDefaultDates();
  const from = searchParams.from ?? defaults.from;
  const to = searchParams.to ?? defaults.to;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All campaigns across connected platforms
          </p>
        </div>
        <DateRangePicker from={from} to={to} />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CampaignsTable from={from} to={to} platform={searchParams.platform} />
      </Suspense>
    </div>
  );
}
