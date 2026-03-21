// lib/inngest/functions.ts
// Inngest background job functions:
//   1. syncPlatform  — syncs one platform for one client (triggered manually or by nightly)
//   2. nightlySync   — fires syncPlatform for every active integration every night at 2 AM

import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getGoogleAccessToken,
  getGoogleCustomerIds,
  fetchGoogleCampaigns,
  fetchGoogleDailyMetrics,
} from "@/lib/platforms/google-ads";
import {
  getMetaAccessToken,
  getMetaAdAccounts,
  fetchMetaCampaigns,
  fetchMetaDailyInsights,
} from "@/lib/platforms/meta-ads";
import { getShopifyToken, fetchShopifyOrders } from "@/lib/platforms/shopify";
import {
  normalizeGoogleCampaign,
  normalizeGoogleMetrics,
  normalizeMetaCampaign,
  normalizeMetaMetrics,
  normalizeShopifyOrders,
} from "@/lib/normalizer";

// ─── Helper: date range (last N days) ────────────────────────────────────────

function lastNDays(n: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

// ─── Helper: upsert campaigns ─────────────────────────────────────────────────

async function upsertCampaigns(rows: any[]) {
  if (!rows.length) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("campaigns").upsert(rows, {
    onConflict: "client_id,platform,external_campaign_id",
  });
  if (error) throw new Error(`Campaign upsert failed: ${error.message}`);
}

// ─── Helper: upsert daily metrics ────────────────────────────────────────────

async function upsertMetrics(rows: any[]) {
  if (!rows.length) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("daily_metrics").upsert(rows, {
    onConflict: "client_id,platform,external_campaign_id,date",
  });
  if (error) throw new Error(`Metrics upsert failed: ${error.message}`);
}

// ─── syncPlatform ─────────────────────────────────────────────────────────────

export const syncPlatform = inngest.createFunction(
  {
    id: "sync-platform",
    retries: 3,
    throttle: { limit: 5, period: "1m" }, // max 5 syncs per minute per deployment
  },
  { event: "sync/platform.requested" },
  async ({ event, step }) => {
    const { clientId, platform, days = 30 } = event.data as {
      clientId: string;
      platform: "google" | "meta" | "shopify";
      days?: number;
    };

    const dateRange = lastNDays(days);

    if (platform === "google") {
      const accessToken = await step.run("get-google-token", () =>
        getGoogleAccessToken(clientId)
      );

      const customerIds = await step.run("list-google-customers", () =>
        getGoogleCustomerIds(accessToken)
      );

      for (const customerId of customerIds) {
        await step.run(`sync-google-customer-${customerId}`, async () => {
          const [rawCampaigns, rawMetrics] = await Promise.all([
            fetchGoogleCampaigns(accessToken, customerId),
            fetchGoogleDailyMetrics(accessToken, customerId, dateRange),
          ]);

          const campaigns = rawCampaigns.map((r) =>
            normalizeGoogleCampaign(r, clientId)
          );
          const metrics = rawMetrics.map((r) =>
            normalizeGoogleMetrics(r, clientId, r.segments?.date ?? dateRange.end)
          );

          await Promise.all([upsertCampaigns(campaigns), upsertMetrics(metrics)]);
        });
      }
    }

    if (platform === "meta") {
      const accessToken = await step.run("get-meta-token", () =>
        getMetaAccessToken(clientId)
      );

      const adAccounts = await step.run("list-meta-accounts", () =>
        getMetaAdAccounts(accessToken)
      );

      for (const adAccountId of adAccounts) {
        await step.run(`sync-meta-account-${adAccountId}`, async () => {
          const [rawCampaigns, rawInsights] = await Promise.all([
            fetchMetaCampaigns(accessToken, adAccountId),
            fetchMetaDailyInsights(accessToken, adAccountId, dateRange),
          ]);

          const campaigns = rawCampaigns.map((r) =>
            normalizeMetaCampaign(r, clientId)
          );
          const metrics = rawInsights.map((r) =>
            normalizeMetaMetrics(r, clientId)
          );

          await Promise.all([upsertCampaigns(campaigns), upsertMetrics(metrics)]);
        });
      }
    }

    if (platform === "shopify") {
      const tokens = await step.run("get-shopify-token", () =>
        getShopifyToken(clientId)
      );

      await step.run("sync-shopify-orders", async () => {
        const orders = await fetchShopifyOrders(tokens, dateRange);

        // Group orders by day and upsert one row per day
        const byDate = orders.reduce((acc: Record<string, any[]>, o: any) => {
          const date = o.created_at.split("T")[0];
          if (!acc[date]) acc[date] = [];
          acc[date].push(o);
          return acc;
        }, {});

        const metrics = Object.entries(byDate).map(([date, dayOrders]) =>
          normalizeShopifyOrders(dayOrders, clientId, date)
        );

        await upsertMetrics(metrics);
      });
    }

    return { ok: true, clientId, platform, dateRange };
  }
);

// ─── nightlySync ──────────────────────────────────────────────────────────────

export const nightlySync = inngest.createFunction(
  { id: "nightly-sync", retries: 1 },
  { cron: "0 2 * * *" }, // 2 AM UTC every night
  async ({ step }) => {
    const supabase = createServiceClient();

    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("client_id, platform")
      .eq("active", true);

    if (error) throw new Error(`Failed to load integrations: ${error.message}`);
    if (!integrations?.length) return { synced: 0 };

    // Fire a sync event for each active integration — Inngest handles fan-out
    await step.run("fire-sync-events", async () => {
      await Promise.all(
        integrations.map((i) =>
          inngest.send({
            name: "sync/platform.requested",
            data: { clientId: i.client_id, platform: i.platform, days: 1 },
          })
        )
      );
    });

    return { synced: integrations.length };
  }
);
