// lib/platforms/google-ads.ts
// Handles Google Ads API calls + automatic token refresh.

import { decrypt, encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v17";

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix ms
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
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
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Google doesn't rotate refresh tokens
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

// ─── Get Valid Access Token ───────────────────────────────────────────────────

export async function getGoogleAccessToken(clientId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("tokens_encrypted")
    .eq("client_id", clientId)
    .eq("platform", "google")
    .single();

  if (error || !data) throw new Error("Google integration not found");

  let tokens: GoogleTokens = JSON.parse(decrypt(data.tokens_encrypted));

  if (Date.now() > tokens.expires_at - 60_000) {
    tokens = await refreshGoogleToken(tokens.refresh_token);
    const { error: updateErr } = await supabase
      .from("integrations")
      .update({ tokens_encrypted: encrypt(JSON.stringify(tokens)) })
      .eq("client_id", clientId)
      .eq("platform", "google");
    if (updateErr) console.error("Failed to save refreshed Google token:", updateErr);
  }

  return tokens.access_token;
}

// ─── Fetch Customer IDs ───────────────────────────────────────────────────────

export async function getGoogleCustomerIds(accessToken: string): Promise<string[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers:listAccessibleCustomers`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
      },
    }
  );
  if (!res.ok) throw new Error(`Failed to list Google customers: ${await res.text()}`);
  const data = await res.json();
  // Returns resource names like "customers/1234567890"
  return (data.resourceNames ?? []).map((r: string) => r.replace("customers/", ""));
}

// ─── Fetch Campaigns ─────────────────────────────────────────────────────────

export async function fetchGoogleCampaigns(
  accessToken: string,
  customerId: string
): Promise<any[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type
    FROM campaign
    WHERE campaign.status != 'REMOVED'
  `;

  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Google Ads campaign fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.results ?? [];
}

// ─── Fetch Daily Metrics ──────────────────────────────────────────────────────

export async function fetchGoogleDailyMetrics(
  accessToken: string,
  customerId: string,
  dateRange: { start: string; end: string } // YYYY-MM-DD
): Promise<any[]> {
  const query = `
    SELECT
      campaign.id,
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      AND campaign.status != 'REMOVED'
  `;

  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Google Ads metrics fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.results ?? [];
}
