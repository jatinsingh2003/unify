import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Custom reports — coming in Week 6
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
        <p className="text-sm font-medium">Reports are under construction</p>
        <p className="text-xs text-muted-foreground mt-1">
          Custom date-range exports, channel comparisons, and PDF exports are coming soon.
        </p>
      </div>
    </div>
  );
}
