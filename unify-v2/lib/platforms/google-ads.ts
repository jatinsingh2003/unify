// lib/platforms/google-ads.ts
// Uses your integrations table schema:
//   access_token, refresh_token, expires_at (timestamptz), account_id

import { createServiceClient } from "@/lib/supabase/server";

const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v17";

async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_at: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const data = await res.json();
  const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return { access_token: data.access_token, expires_at };
}

export async function getGoogleAccessToken(clientId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("client_id", clientId)
    .eq("platform", "google")
    .single();

  if (error || !data) throw new Error("Google integration not found");

  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt - 60_000) {
    const refreshed = await refreshGoogleToken(data.refresh_token);
    await supabase
      .from("integrations")
      .update({ access_token: refreshed.access_token, expires_at: refreshed.expires_at })
      .eq("client_id", clientId).eq("platform", "google");
    return refreshed.access_token;
  }
  return data.access_token;
}

export async function getGoogleCustomerIds(accessToken: string): Promise<string[]> {
  const res = await fetch(
    "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
    { headers: { Authorization: `Bearer ${accessToken}`, "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN! } }
  );
  if (!res.ok) throw new Error(`Failed to list Google customers: ${await res.text()}`);
  const data = await res.json();
  return (data.resourceNames ?? []).map((r: string) => r.replace("customers/", ""));
}

export async function fetchGoogleCampaigns(accessToken: string, customerId: string): Promise<any[]> {
  const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED'`;
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Google campaign fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.results ?? [];
}

export async function fetchGoogleDailyMetrics(
  accessToken: string, customerId: string, dateRange: { start: string; end: string }
): Promise<any[]> {
  const query = `SELECT campaign.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}' AND campaign.status != 'REMOVED'`;
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Google metrics fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.results ?? [];
}
