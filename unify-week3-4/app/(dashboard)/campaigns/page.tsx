// app/(dashboard)/campaigns/page.tsx
// Campaigns page — full table with per-campaign metrics.

import { CampaignsTable } from "@/components/campaigns/campaigns-table";

export default function CampaignsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          All campaigns across Google Ads, Meta Ads, and Shopify.
        </p>
      </div>
      <CampaignsTable />
    </div>
  );
}
