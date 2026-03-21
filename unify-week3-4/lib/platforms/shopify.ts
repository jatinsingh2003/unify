// lib/platforms/shopify.ts
// Shopify Admin REST API client — Week 4 addition.
// Fetches orders for revenue data and stores OAuth tokens.

import { decrypt, encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";

export interface ShopifyTokens {
  access_token: string; // Shopify tokens don't expire, no refresh needed
  shop: string;         // e.g. "my-store.myshopify.com"
}

// ─── Get Token ───────────────────────────────────────────────────────────────

export async function getShopifyToken(clientId: string): Promise<ShopifyTokens> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("tokens_encrypted")
    .eq("client_id", clientId)
    .eq("platform", "shopify")
    .single();

  if (error || !data) throw new Error("Shopify integration not found");
  return JSON.parse(decrypt(data.tokens_encrypted)) as ShopifyTokens;
}

// ─── Exchange OAuth Code for Token ───────────────────────────────────────────

export async function exchangeShopifyCode(
  shop: string,
  code: string
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// ─── Fetch Orders ─────────────────────────────────────────────────────────────

export async function fetchShopifyOrders(
  tokens: ShopifyTokens,
  dateRange: { start: string; end: string }
): Promise<any[]> {
  const url =
    `https://${tokens.shop}/admin/api/2024-01/orders.json` +
    `?status=any` +
    `&created_at_min=${dateRange.start}T00:00:00Z` +
    `&created_at_max=${dateRange.end}T23:59:59Z` +
    `&limit=250` +
    `&fields=id,total_price,created_at,financial_status`;

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": tokens.access_token,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Shopify orders fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.orders ?? [];
}

// ─── Shopify OAuth URL Builder ────────────────────────────────────────────────

export function buildShopifyAuthUrl(shop: string, state: string): string {
  const scopes = "read_orders,read_analytics";
  const redirectUri = `${process.env.APP_URL}/api/integrations/shopify/callback`;
  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_CLIENT_ID}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`
  );
}
