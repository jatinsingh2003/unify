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
    <div className="min-h-screen bg-background p-6 lg:p-10 space-y-12 transition-colors duration-500">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Operational Pulse</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white italic">Campaigns</h1>
            <p className="text-slate-500 text-sm mt-3 max-w-lg font-medium italic">
              Monitoring deployment velocity across <span className="text-white font-bold">Omni-channel</span> nodes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
            <DateRangePicker from={from} to={to} />
          </div>
        </div>

        <Suspense fallback={<TableSkeleton />}>
          <div className="rounded-[2rem] bg-card p-1 shadow-2xl border border-white/5 overflow-hidden group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            <CampaignsTable from={from} to={to} platform={searchParams.platform} />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
