import { decrypt, encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";

const GRAPH_URL = "https://graph.facebook.com/v21.0";

interface MetaIntegration {
  id: string;
  client_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  account_id: string;
}

/**
 * Meta uses long-lived tokens (60 days). Re-exchange when < 7 days from expiry.
 */
export async function getValidMetaToken(
  integration: MetaIntegration
): Promise<string> {
  const expiresInMs =
    new Date(integration.expires_at).getTime() - Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (expiresInMs > sevenDaysMs) {
    return decrypt(integration.access_token);
  }

  // Re-exchange for a fresh long-lived token
  const res = await fetch(
    `${GRAPH_URL}/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: decrypt(integration.access_token),
    })}`
  );

  if (!res.ok) {
    throw new Error(`Meta token refresh failed: ${await res.text()}`);
  }

  const fresh = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const supabase = createServiceClient();
  await supabase
    .from("integrations")
    .update({
      access_token: encrypt(fresh.access_token),
      refresh_token: encrypt(fresh.access_token),
      expires_at: new Date(
        Date.now() + fresh.expires_in * 1000
      ).toISOString(),
    })
    .eq("id", integration.id);

  return fresh.access_token;
}

export interface MetaCampaignMetrics {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  objective: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  // Actions (conversions) returned as array by Meta API
  purchases: number;
  purchaseValue: number;
  results: number;
  resultValue: number;
}

/**
 * Fetch campaign insights for a specific date.
 * One API call per client per day using date_preset or time_range.
 */
export async function fetchMetaMetrics(
  accessToken: string,
  adAccountId: string,
  dateStr: string // YYYY-MM-DD
): Promise<MetaCampaignMetrics[]> {
  // Normalise account ID — Meta may return "act_123456" or just "123456"
  const accountId = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  const fields = [
    "campaign_id",
    "campaign_name",
    "objective",
    "spend",
    "impressions",
    "clicks",
    "reach",
    "actions",
    "action_values",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    level: "campaign",
    time_range: JSON.stringify({ since: dateStr, until: dateStr }),
    limit: "500",
    access_token: accessToken,
  });

  const res = await fetch(
    `${GRAPH_URL}/${accountId}/insights?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error(`Meta Ads API error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
    paging?: { next?: string };
  };

  const results: MetaCampaignMetrics[] = [];

  // Handle pagination — fetch all pages
  let page = json;
  while (true) {
    for (const row of page.data ?? []) {
      const actions = (row.actions as Array<{ action_type: string; value: string }>) ?? [];
      const actionValues =
        (row.action_values as Array<{ action_type: string; value: string }>) ?? [];

      const findAction = (type: string, arr: typeof actions) =>
        Number(arr.find((a) => a.action_type === type)?.value ?? 0);

      const purchases = findAction("purchase", actions);
      const purchaseValue = findAction("purchase", actionValues);
      // "results" = primary optimization objective action
      const results_count =
        purchases ||
        findAction("lead", actions) ||
        findAction("complete_registration", actions) ||
        findAction("link_click", actions);
      const result_value =
        purchaseValue ||
        findAction("lead", actionValues) ||
        findAction("complete_registration", actionValues);

      results.push({
        campaignId: String(row.campaign_id ?? ""),
        campaignName: String(row.campaign_name ?? ""),
        campaignStatus: "active", // status not in insights, fetched separately if needed
        objective: String(row.objective ?? ""),
        date: dateStr,
        spend: Number(row.spend ?? 0),
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        reach: Number(row.reach ?? 0),
        purchases,
        purchaseValue,
        results: results_count,
        resultValue: result_value,
      });
    }

    if (!page.paging?.next) break;
    const nextRes = await fetch(page.paging.next);
    if (!nextRes.ok) break;
    page = await nextRes.json();
  }

  return results;
}
