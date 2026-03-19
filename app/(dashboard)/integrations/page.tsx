import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { IntegrationCard } from "@/components/integrations/integration-card";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const { orgId } = auth();
  const supabase = await createClient();

  const { data: integrations } = await supabase
    .from("integrations")
    .select("platform, status, account_id, last_sync_at")
    .eq("client_id", orgId!);

  const byPlatform = Object.fromEntries(
    (integrations ?? []).map((i) => [i.platform, i])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your ad platforms to start syncing data
        </p>
      </div>

      {searchParams.connected && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          ✓ Successfully connected {searchParams.connected}
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          Connection failed: {searchParams.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <IntegrationCard
          platform="google_ads"
          label="Google Ads"
          description="Import campaigns, spend, clicks, and conversions from Google Ads."
          integration={byPlatform["google_ads"]}
          connectHref="/api/integrations/google/connect"
        />
        <IntegrationCard
          platform="meta_ads"
          label="Meta Ads"
          description="Sync Facebook and Instagram campaign data including ROAS and CPM."
          integration={byPlatform["meta_ads"]}
          connectHref="/api/integrations/meta/connect"
        />
        <IntegrationCard
          platform="shopify"
          label="Shopify"
          description="Pull order revenue, AOV, and sales data from your Shopify store."
          integration={byPlatform["shopify"]}
          connectHref="/integrations/shopify/setup"
          comingSoon={false}
        />
      </div>
    </div>
  );
}
