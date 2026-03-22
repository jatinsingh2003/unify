// lib/platforms/shopify.ts
// Shopify uses tokens_encrypted column (added by migration)
// because Shopify tokens don't expire and have no refresh_token

import { decrypt, encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";

export interface ShopifyTokens {
  access_token: string;
  shop: string;
}

export async function getShopifyTokens(clientId: string): Promise<ShopifyTokens> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("tokens_encrypted")
    .eq("client_id", clientId)
    .eq("platform", "shopify")
    .single();
  if (error || !data?.tokens_encrypted) throw new Error("Shopify integration not found");
  return JSON.parse(decrypt(data.tokens_encrypted)) as ShopifyTokens;
}

export async function exchangeShopifyCode(shop: string, code: string): Promise<string> {
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

export async function fetchShopifyOrders(tokens: ShopifyTokens, dateRange: { start: string; end: string }): Promise<unknown[]> {
  let url: string | null = `https://${tokens.shop}/admin/api/2024-01/orders.json?status=any` +
    `&created_at_min=${dateRange.start}T00:00:00Z&created_at_max=${dateRange.end}T23:59:59Z` +
    `&limit=250&fields=id,order_number,total_price,subtotal_price,total_discounts,created_at,financial_status,landing_site,referring_site`;
  
  const allOrders: unknown[] = [];

  while (url) {
    const res: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": tokens.access_token, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Shopify orders fetch failed: ${await res.text()}`);
    
    const data = await res.json();
    allOrders.push(...((data.orders as unknown[]) ?? []));

    // Handle Link-header pagination
    const linkHeader: string | null = res.headers.get("Link");
    url = null; // Default to stop
    if (linkHeader) {
      const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) url = nextMatch[1];
    }
  }

  return allOrders;
}

export function buildShopifyAuthUrl(shop: string, state: string): string {
  const redirectUri = `${process.env.APP_URL}/api/integrations/shopify/callback`;
  return `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}` +
    `&scope=read_orders,read_analytics&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}
