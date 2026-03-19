import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { getValidGoogleToken, fetchGoogleMetrics } from "@/lib/platforms/google-ads";
import { getValidMetaToken, fetchMetaMetrics } from "@/lib/platforms/meta-ads";
import {
  normalizeGoogleCampaign,
  normalizeGoogleMetrics,
  normalizeMetaCampaign,
  normalizeMetaMetrics,
} from "@/lib/normalizer";

type Platform = "google_ads" | "meta_ads" | "shopify";

interface SyncEvent {
  data: {
    clientId: string;
    platform: Platform;
    trigger: "cron" | "manual" | "oauth_connect";
    dateStr?: string; // override date, defaults to yesterday
  };
}

/**
 * Returns yesterday's date in YYYY-MM-DD format (UTC).
 */
function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

// ─── Main sync function ───────────────────────────────────────────────────────

export const syncPlatform = inngest.createFunction(
  {
    id: "sync-platform",
    retries: 3,
    concurrency: { limit: 5 }, // max 5 concurrent platform syncs globally
    throttle: {
      limit: 1,
      period: "30m",
      key: "event.data.clientId-event.data.platform", // 1 manual sync per 30min per client/platform
    },
  },
  { event: "sync/platform.requested" },
  async ({ event, step }: { event: SyncEvent; step: Parameters<Parameters<typeof inngest.createFunction>[2]>[0]["step"] }) => {
    const { clientId, platform, dateStr } = event.data;
    const syncDate = dateStr ?? yesterday();

    // ── Step 1: Load integration ────────────────────────────────────────────
    const integration = await step.run("load-integration", async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("client_id", clientId)
        .eq("platform", platform)
        .eq("status", "active")
        .single();

      if (error || !data) {
        throw new Error(
          `No active ${platform} integration for client ${clientId}`
        );
      }
      return data;
    });

    // ── Step 2: Fetch raw metrics from platform API ─────────────────────────
    const rawMetrics = await step.run("fetch-platform-data", async () => {
      if (platform === "google_ads") {
        const token = await getValidGoogleToken(integration);
        return fetchGoogleMetrics(token, integration.account_id, syncDate);
      }

      if (platform === "meta_ads") {
        const token = await getValidMetaToken(integration);
        return fetchMetaMetrics(token, integration.account_id, syncDate);
      }

      throw new Error(`Platform ${platform} not yet implemented`);
    });

    if (!rawMetrics.length) {
      return { synced: 0, date: syncDate, platform };
    }

    // ── Step 3: Upsert campaigns ────────────────────────────────────────────
    await step.run("upsert-campaigns", async () => {
      const supabase = createServiceClient();

      const campaigns = rawMetrics.map((row) => {
        const normalized =
          platform === "google_ads"
            ? normalizeGoogleCampaign(row as Parameters<typeof normalizeGoogleCampaign>[0])
            : normalizeMetaCampaign(row as Parameters<typeof normalizeMetaCampaign>[0]);

        return {
          client_id: clientId,
          platform,
          platform_campaign_id: normalized.platform_campaign_id,
          name: normalized.name,
          status: normalized.status,
          campaign_type: normalized.campaign_type,
          daily_budget: normalized.daily_budget,
          currency: normalized.currency,
        };
      });

      const { error } = await supabase
        .from("campaigns")
        .upsert(campaigns, {
          onConflict: "client_id,platform,platform_campaign_id",
          ignoreDuplicates: false,
        });

      if (error) throw new Error(`Campaign upsert failed: ${error.message}`);
    });

    // ── Step 4: Load campaign ID map (platform_id → uuid) ──────────────────
    const campaignIdMap = await step.run("load-campaign-ids", async () => {
      const supabase = createServiceClient();
      const platformIds = rawMetrics.map((r) =>
        platform === "google_ads"
          ? (r as Parameters<typeof normalizeGoogleCampaign>[0]).campaignId
          : (r as Parameters<typeof normalizeMetaCampaign>[0]).campaignId
      );

      const { data, error } = await supabase
        .from("campaigns")
        .select("id, platform_campaign_id")
        .eq("client_id", clientId)
        .eq("platform", platform)
        .in("platform_campaign_id", platformIds);

      if (error) throw new Error(`Campaign ID lookup failed: ${error.message}`);
      return Object.fromEntries((data ?? []).map((c) => [c.platform_campaign_id, c.id]));
    });

    // ── Step 5: Upsert daily_metrics ────────────────────────────────────────
    const synced = await step.run("upsert-metrics", async () => {
      const supabase = createServiceClient();

      const metricsRows = rawMetrics.map((row) => {
        const normalized =
          platform === "google_ads"
            ? normalizeGoogleMetrics(
                row as Parameters<typeof normalizeGoogleMetrics>[0],
                clientId
              )
            : normalizeMetaMetrics(
                row as Parameters<typeof normalizeMetaMetrics>[0],
                clientId
              );

        const campaignUuid = campaignIdMap[normalized.platform_campaign_id];
        if (!campaignUuid) return null;

        return {
          client_id: clientId,
          campaign_id: campaignUuid,
          platform,
          date: normalized.date,
          spend: normalized.spend,
          impressions: normalized.impressions,
          clicks: normalized.clicks,
          conversions: normalized.conversions,
          revenue: normalized.revenue,
          orders: normalized.orders,
          ctr: normalized.ctr,
          cpc: normalized.cpc,
          cpa: normalized.cpa,
          roas: normalized.roas,
          aov: normalized.aov,
          raw_data: normalized.raw_data,
        };
      }).filter(Boolean);

      const { error } = await supabase
        .from("daily_metrics")
        .upsert(metricsRows as NonNullable<(typeof metricsRows)[0]>[], {
          onConflict: "client_id,campaign_id,date,platform",
          ignoreDuplicates: false,
        });

      if (error) throw new Error(`Metrics upsert failed: ${error.message}`);
      return metricsRows.length;
    });

    // ── Step 6: Update last_sync_at on integration ──────────────────────────
    await step.run("mark-synced", async () => {
      const supabase = createServiceClient();
      await supabase
        .from("integrations")
        .update({ last_sync_at: new Date().toISOString(), status: "active" })
        .eq("id", integration.id);
    });

    return { synced, date: syncDate, platform, clientId };
  }
);

// ─── Nightly fan-out ──────────────────────────────────────────────────────────

export const nightlySync = inngest.createFunction(
  { id: "nightly-sync", retries: 1 },
  { cron: "0 2 * * *" }, // 2am UTC daily
  async ({ step }: { step: Parameters<Parameters<typeof inngest.createFunction>[2]>[0]["step"] }) => {
    // Load all active integrations
    const integrations = await step.run("load-integrations", async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("integrations")
        .select("client_id, platform")
        .eq("status", "active");
      return data ?? [];
    });

    // Fan out — one event per (client, platform)
    const events = integrations.map((i) => ({
      name: "sync/platform.requested" as const,
      data: {
        clientId: i.client_id,
        platform: i.platform as Platform,
        trigger: "cron" as const,
      },
    }));

    if (events.length > 0) {
      await inngest.send(events);
    }

    return { dispatched: events.length };
  }
);
