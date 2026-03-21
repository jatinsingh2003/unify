// lib/inngest/functions.ts
// syncPlatform + nightlySync — rewritten to match your actual schema.
//
// KEY DIFFERENCE from v1:
//   - campaigns are upserted first to get their UUID (campaigns.id)
//   - that UUID is then used as campaign_id FK in daily_metrics
//   - integrations stores tokens in plain columns (not tokens_encrypted)

import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { getGoogleAccessToken, getGoogleCustomerIds, fetchGoogleCampaigns, fetchGoogleDailyMetrics } from "@/lib/platforms/google-ads";
import { getMetaAccessToken, getMetaAdAccounts, fetchMetaCampaigns, fetchMetaDailyInsights } from "@/lib/platforms/meta-ads";
import { getShopifyTokens, fetchShopifyOrders } from "@/lib/platforms/shopify";
import { normalizeGoogleCampaign, normalizeGoogleMetrics, normalizeMetaCampaign, normalizeMetaMetrics, normalizeShopifyOrders } from "@/lib/normalizer";

function lastNDays(n: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

// Upsert campaigns and return a map of platform_campaign_id → UUID
async function upsertCampaignsGetIds(rows: any[]): Promise<Record<string, string>> {
  if (!rows.length) return {};
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("campaigns")
    .upsert(rows, { onConflict: "client_id,platform,platform_campaign_id" })
    .select("id, platform_campaign_id");
  if (error) throw new Error(`Campaign upsert failed: ${error.message}`);
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.platform_campaign_id] = row.id;
  return map;
}

async function upsertMetrics(rows: any[]) {
  if (!rows.length) return;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("daily_metrics")
    .upsert(rows, { onConflict: "campaign_id,date" });
  if (error) throw new Error(`Metrics upsert failed: ${error.message}`);
}

// ─── syncPlatform ─────────────────────────────────────────────────────────────

export const syncPlatform = inngest.createFunction(
  { id: "sync-platform", retries: 3 },
  { event: "sync/platform.requested" },
  async ({ event, step }) => {
    const { clientId, platform, days = 30 } = event.data as {
      clientId: string; platform: "google" | "meta" | "shopify"; days?: number;
    };
    const dateRange = lastNDays(days);

    if (platform === "google") {
      const accessToken = await step.run("get-google-token", () => getGoogleAccessToken(clientId));
      const customerIds = await step.run("list-customers", () => getGoogleCustomerIds(accessToken));

      for (const customerId of customerIds) {
        await step.run(`sync-google-${customerId}`, async () => {
          const [rawCampaigns, rawMetrics] = await Promise.all([
            fetchGoogleCampaigns(accessToken, customerId),
            fetchGoogleDailyMetrics(accessToken, customerId, dateRange),
          ]);

          const campaignRows = rawCampaigns.map(r => normalizeGoogleCampaign(r, clientId));
          const idMap = await upsertCampaignsGetIds(campaignRows);

          const metricRows = rawMetrics
            .map(r => {
              const campId = String(r.campaign.id);
              const uuid = idMap[campId];
              if (!uuid) return null;
              return normalizeGoogleMetrics(r, clientId, uuid, r.segments?.date ?? dateRange.end);
            })
            .filter(Boolean);

          await upsertMetrics(metricRows);
        });
      }
    }

    if (platform === "meta") {
      const accessToken = await step.run("get-meta-token", () => getMetaAccessToken(clientId));
      const adAccounts = await step.run("list-accounts", () => getMetaAdAccounts(accessToken));

      for (const adAccountId of adAccounts) {
        await step.run(`sync-meta-${adAccountId}`, async () => {
          const [rawCampaigns, rawInsights] = await Promise.all([
            fetchMetaCampaigns(accessToken, adAccountId),
            fetchMetaDailyInsights(accessToken, adAccountId, dateRange),
          ]);

          const campaignRows = rawCampaigns.map(r => normalizeMetaCampaign(r, clientId));
          const idMap = await upsertCampaignsGetIds(campaignRows);

          const metricRows = rawInsights
            .map(r => {
              const uuid = idMap[r.campaign_id];
              if (!uuid) return null;
              return normalizeMetaMetrics(r, clientId, uuid);
            })
            .filter(Boolean);

          await upsertMetrics(metricRows);
        });
      }
    }

    if (platform === "shopify") {
      const tokens = await step.run("get-shopify-tokens", () => getShopifyTokens(clientId));

      await step.run("sync-shopify", async () => {
        const orders = await fetchShopifyOrders(tokens, dateRange);

        // Get or create the synthetic shopify_orders campaign row
        const supabase = createServiceClient();
        const campaignRow = {
          client_id: clientId,
          platform: "shopify",
          platform_campaign_id: "shopify_orders",
          name: "Shopify Orders",
          status: "active",
          campaign_type: "ecommerce",
        };
        const idMap = await upsertCampaignsGetIds([campaignRow]);
        const uuid = idMap["shopify_orders"];
        if (!uuid) throw new Error("Failed to get Shopify campaign UUID");

        const byDate = orders.reduce((acc: Record<string, any[]>, o: any) => {
          const date = o.created_at.split("T")[0];
          if (!acc[date]) acc[date] = [];
          acc[date].push(o);
          return acc;
        }, {});

        const metricRows = Object.entries(byDate).map(([date, dayOrders]) =>
          normalizeShopifyOrders(dayOrders, clientId, uuid, date)
        );
        await upsertMetrics(metricRows);
      });
    }

    // Update last_synced_at on the integration
    const supabase = createServiceClient();
    await supabase.from("integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("client_id", clientId).eq("platform", platform);

    return { ok: true, clientId, platform, dateRange };
  }
);

// ─── nightlySync ──────────────────────────────────────────────────────────────

export const nightlySync = inngest.createFunction(
  { id: "nightly-sync", retries: 1 },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const supabase = createServiceClient();
    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("client_id, platform")
      .eq("active", true);

    if (error) throw new Error(`Failed to load integrations: ${error.message}`);
    if (!integrations?.length) return { synced: 0 };

    await step.run("fire-sync-events", async () => {
      await Promise.all(
        integrations.map(i =>
          inngest.send({ name: "sync/platform.requested", data: { clientId: i.client_id, platform: i.platform, days: 1 } })
        )
      );
    });

    return { synced: integrations.length };
  }
);
