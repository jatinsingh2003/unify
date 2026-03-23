// lib/platforms/google-ads.ts
import { createServiceClient } from "@/lib/supabase/server";

const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v19";

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
  const url = `${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
    },
  });

  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[google-ads] Failed to list customers. Status: ${res.status} ${res.statusText}`);
    console.error(`[google-ads] Raw Response: ${rawBody}`);
    throw new Error(`Failed to list Google customers: HTTP ${res.status}`);
  }

  try {
    const data = JSON.parse(rawBody);
    return (data.resourceNames ?? []).map((r: string) => r.replace("customers/", ""));
  } catch (err) {
    console.error("[google-ads] Failed to parse JSON response:", err);
    console.error("[google-ads] Raw Response:", rawBody);
    throw new Error("Google Ads API returned an invalid response (not JSON).");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchGoogleCampaigns(accessToken: string, customerId: string): Promise<any[]> {
  const query = "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED'";
  const url = `${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query }),
  });

  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[google-ads] Campaign fetch failed. Status: ${res.status} ${res.statusText}`);
    console.error(`[google-ads] Raw Response: ${rawBody}`);
    throw new Error(`Google campaign fetch failed: HTTP ${res.status}`);
  }

  try {
    const data = JSON.parse(rawBody);
    return data.results ?? [];
  } catch (err) {
    console.error("[google-ads] Failed to parse campaign JSON:", err);
    console.error("[google-ads] Raw Response:", rawBody);
    throw new Error("Google Ads API returned invalid campaign data (not JSON).");
  }
}

export async function fetchGoogleDailyMetrics(
  accessToken: string,
  customerId: string,
  dateRange: { start: string; end: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const query = `SELECT campaign.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}' AND campaign.status != 'REMOVED'`;
  const url = `${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query }),
  });

  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[google-ads] Metrics fetch failed. Status: ${res.status} ${res.statusText}`);
    console.error(`[google-ads] Raw Response: ${rawBody}`);
    throw new Error(`Google metrics fetch failed: HTTP ${res.status}`);
  }

  try {
    const data = JSON.parse(rawBody);
    return data.results ?? [];
  } catch (err) {
    console.error("[google-ads] Failed to parse metrics JSON:", err);
    console.error("[google-ads] Raw Response:", rawBody);
    throw new Error("Google Ads API returned invalid metrics data (not JSON).");
  }
}