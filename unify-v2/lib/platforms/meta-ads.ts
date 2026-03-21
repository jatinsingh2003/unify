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
  if (!res.ok) throw new Error(`Failed to list Meta ad accounts: ${await res.text()}`);
  const data = await res.json();
  return (data.data ?? []).map((a: any) => a.id as string);
}

export async function fetchMetaCampaigns(accessToken: string, adAccountId: string): Promise<any[]> {
  const res = await fetch(`${META_GRAPH}/${adAccountId}/campaigns?fields=id,name,status,objective&access_token=${accessToken}`);
  if (!res.ok) throw new Error(`Meta campaign fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchMetaDailyInsights(
  accessToken: string, adAccountId: string, dateRange: { start: string; end: string }
): Promise<any[]> {
  const res = await fetch(
    `${META_GRAPH}/${adAccountId}/insights?fields=campaign_id,date_start,spend,impressions,clicks,actions,action_values` +
    `&time_increment=1&time_range=${encodeURIComponent(JSON.stringify({ since: dateRange.start, until: dateRange.end }))}` +
    `&level=campaign&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Meta insights fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.data ?? [];
}
