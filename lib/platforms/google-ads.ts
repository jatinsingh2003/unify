import { decrypt, encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";

const TOKEN_REFRESH_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://googleads.googleapis.com/v17";

interface GoogleIntegration {
  id: string;
  client_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  account_id: string;
}

/**
 * Get a valid access token, refreshing if < 5 minutes from expiry.
 */
export async function getValidGoogleToken(
  integration: GoogleIntegration
): Promise<string> {
  const expiresInMs =
    new Date(integration.expires_at).getTime() - Date.now();

  if (expiresInMs > 5 * 60 * 1000) {
    return decrypt(integration.access_token);
  }

  // Refresh
  const res = await fetch(TOKEN_REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: decrypt(integration.refresh_token),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${await res.text()}`);
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
      expires_at: new Date(
        Date.now() + fresh.expires_in * 1000
      ).toISOString(),
    })
    .eq("id", integration.id);

  return fresh.access_token;
}

export interface GoogleCampaignMetrics {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  campaignType: string;
  dailyBudget: number;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

/**
 * Fetch yesterday's campaign metrics using Google Ads Query Language (GAQL).
 * One API call per client per day.
 */
export async function fetchGoogleMetrics(
  accessToken: string,
  customerId: string,
  dateStr: string // YYYY-MM-DD
): Promise<GoogleCampaignMetrics[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.target_spend.cpc_bid_ceiling_micros,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      segments.date
    FROM campaign
    WHERE segments.date = '${dateStr}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 1000
  `;

  const res = await fetch(
    `${API_BASE}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
        "login-customer-id": customerId,
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Google Ads API error ${res.status}: ${await res.text()}`
    );
  }

  // SearchStream returns NDJSON (one JSON object per line)
  const text = await res.text();
  const results: GoogleCampaignMetrics[] = [];

  for (const line of text.split("\n").filter(Boolean)) {
    let parsed: { results?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    for (const row of parsed.results ?? []) {
      const campaign = row.campaign as Record<string, unknown>;
      const metrics = row.metrics as Record<string, unknown>;
      const segments = row.segments as Record<string, unknown>;

      results.push({
        campaignId: String(campaign.id ?? ""),
        campaignName: String(campaign.name ?? ""),
        campaignStatus: String(campaign.status ?? "").toLowerCase(),
        campaignType: String(
          campaign.advertising_channel_type ?? ""
        ).toLowerCase(),
        dailyBudget: 0, // budget requires separate query
        date: String(segments.date ?? dateStr),
        spend: Number(metrics.cost_micros ?? 0) / 1_000_000,
        impressions: Number(metrics.impressions ?? 0),
        clicks: Number(metrics.clicks ?? 0),
        conversions: Number(metrics.conversions ?? 0),
        conversionValue: Number(metrics.conversions_value ?? 0),
      });
    }
  }

  return results;
}
