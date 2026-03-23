// lib/platforms/meta-ads.ts
// Uses your integrations table: access_token, expires_at (timestamptz)

import { createServiceClient } from "@/lib/supabase/server";

const META_GRAPH = "https://graph.facebook.com/v19.0";

export async function getMetaAccessToken(clientId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("access_token, expires_at")
    .eq("client_id", clientId)
    .eq("platform", "meta")
    .single();

  if (error || !data) throw new Error("Meta integration not found");

  const expiresAt = new Date(data.expires_at).getTime();
  // Refresh if within 7 days of expiry
  if (Date.now() > expiresAt - 7 * 24 * 3600 * 1000) {
    const res = await fetch(
      `${META_GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}` +
      `&fb_exchange_token=${data.access_token}`
    );
    if (!res.ok) throw new Error(`Meta token refresh failed: ${await res.text()}`);
    const refreshed = await res.json();
    const expires_at = new Date(Date.now() + (refreshed.expires_in ?? 5_184_000) * 1000).toISOString();
    await supabase.from("integrations")
      .update({ access_token: refreshed.access_token, expires_at })
      .eq("client_id", clientId).eq("platform", "meta");
    return refreshed.access_token;
  }
  return data.access_token;
}

export async function getMetaAdAccounts(accessToken: string): Promise<string[]> {
  const res = await fetch(`${META_GRAPH}/me/adaccounts?fields=id,name&access_token=${accessToken}`);
  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[meta-ads] Failed to list accounts. Status: ${res.status} ${res.statusText}`);
    console.error(`[meta-ads] Raw Response: ${rawBody}`);
    throw new Error(`Failed to list Meta ad accounts: HTTP ${res.status}`);
  }

  try {
    const data = JSON.parse(rawBody);
    return (data.data ?? []).map((a: { id: string }) => a.id);
  } catch (err) {
    console.error("[meta-ads] Failed to parse account JSON:", err);
    console.error("[meta-ads] Raw Response:", rawBody);
    throw new Error("Meta API returned invalid JSON for ad accounts.");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchMetaCampaigns(accessToken: string, adAccountId: string): Promise<any[]> {
  const res = await fetch(`${META_GRAPH}/${adAccountId}/campaigns?fields=id,name,status,objective&access_token=${accessToken}`);
  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[meta-ads] Campaign fetch failed. Status: ${res.status} ${res.statusText}`);
    console.error(`[meta-ads] Raw Response: ${rawBody}`);
    throw new Error(`Meta campaign fetch failed: HTTP ${res.status}`);
  }

  try {
    const data = JSON.parse(rawBody);
    return data.data ?? [];
  } catch (err) {
    console.error("[meta-ads] Failed to parse campaign JSON:", err);
    console.error("[meta-ads] Raw Response:", rawBody);
    throw new Error("Meta API returned invalid campaign JSON.");
  }
}

export async function fetchMetaDailyInsights(
  accessToken: string, adAccountId: string, dateRange: { start: string; end: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const res = await fetch(
    `${META_GRAPH}/${adAccountId}/insights?fields=campaign_id,date_start,spend,impressions,clicks,actions,action_values` +
    `&time_increment=1&time_range=${encodeURIComponent(JSON.stringify({ since: dateRange.start, until: dateRange.end }))}` +
    `&level=campaign&access_token=${accessToken}`
  );
  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[meta-ads] Insights fetch failed. Status: ${res.status} ${res.statusText}`);
    console.error(`[meta-ads] Raw Response: ${rawBody}`);
    throw new Error(`Meta insights fetch failed: HTTP ${res.status}`);
  }

  try {
    const data = JSON.parse(rawBody);
    return data.data ?? [];
  } catch (err) {
    console.error("[meta-ads] Failed to parse insights JSON:", err);
    console.error("[meta-ads] Raw Response:", rawBody);
    throw new Error("Meta API returned invalid insights JSON.");
  }
}
