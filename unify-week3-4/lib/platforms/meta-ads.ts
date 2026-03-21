// lib/platforms/meta-ads.ts
// Handles Meta Graph API calls + automatic token refresh.

import { decrypt, encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";

const META_GRAPH = "https://graph.facebook.com/v19.0";

export interface MetaTokens {
  access_token: string;
  expires_at: number; // unix ms — long-lived tokens last 60 days
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

async function refreshMetaToken(shortToken: string): Promise<MetaTokens> {
  const res = await fetch(
    `${META_GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&fb_exchange_token=${shortToken}`
  );
  if (!res.ok) throw new Error(`Meta token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 5_184_000) * 1000, // default 60 days
  };
}

// ─── Get Valid Access Token ───────────────────────────────────────────────────

export async function getMetaAccessToken(clientId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("tokens_encrypted")
    .eq("client_id", clientId)
    .eq("platform", "meta")
    .single();

  if (error || !data) throw new Error("Meta integration not found");

  let tokens: MetaTokens = JSON.parse(decrypt(data.tokens_encrypted));

  // Refresh if within 7 days of expiry
  if (Date.now() > tokens.expires_at - 7 * 24 * 3600 * 1000) {
    tokens = await refreshMetaToken(tokens.access_token);
    const { error: updateErr } = await supabase
      .from("integrations")
      .update({ tokens_encrypted: encrypt(JSON.stringify(tokens)) })
      .eq("client_id", clientId)
      .eq("platform", "meta");
    if (updateErr) console.error("Failed to save refreshed Meta token:", updateErr);
  }

  return tokens.access_token;
}

// ─── Fetch Ad Accounts ───────────────────────────────────────────────────────

export async function getMetaAdAccounts(accessToken: string): Promise<string[]> {
  const res = await fetch(
    `${META_GRAPH}/me/adaccounts?fields=id,name&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Failed to list Meta ad accounts: ${await res.text()}`);
  const data = await res.json();
  return (data.data ?? []).map((a: any) => a.id as string);
}

// ─── Fetch Campaigns ─────────────────────────────────────────────────────────

export async function fetchMetaCampaigns(
  accessToken: string,
  adAccountId: string
): Promise<any[]> {
  const fields = "id,name,status,objective";
  const res = await fetch(
    `${META_GRAPH}/${adAccountId}/campaigns?fields=${fields}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Meta campaign fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.data ?? [];
}

// ─── Fetch Daily Insights ─────────────────────────────────────────────────────

export async function fetchMetaDailyInsights(
  accessToken: string,
  adAccountId: string,
  dateRange: { start: string; end: string }
): Promise<any[]> {
  const fields =
    "campaign_id,date_start,spend,impressions,clicks,actions,action_values";
  const res = await fetch(
    `${META_GRAPH}/${adAccountId}/insights` +
      `?fields=${fields}` +
      `&time_increment=1` +
      `&time_range=${encodeURIComponent(
        JSON.stringify({ since: dateRange.start, until: dateRange.end })
      )}` +
      `&level=campaign` +
      `&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Meta insights fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.data ?? [];
}
