// app/api/integrations/shopify/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";
import { exchangeShopifyCode, ShopifyTokens } from "@/lib/platforms/shopify";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  if (!code || !shop || !state || !hmac)
    return NextResponse.redirect(new URL("/integrations?error=missing_params", req.url));

  const orgId = await kv.get<string>(`shopify:oauth:state:${state}`);
  if (!orgId) return NextResponse.redirect(new URL("/integrations?error=invalid_state", req.url));
  await kv.del(`shopify:oauth:state:${state}`);

  // Verify HMAC
  const params = Object.fromEntries(searchParams.entries());
  delete params.hmac;
  const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const digest = crypto.createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!).update(message).digest("hex");
  if (digest !== hmac) return NextResponse.redirect(new URL("/integrations?error=hmac_mismatch", req.url));

  const accessToken = await exchangeShopifyCode(shop, code);
  const tokens: ShopifyTokens = { access_token: accessToken, shop };

  const supabase = createServiceClient();
  const { error } = await supabase.from("integrations").upsert(
    {
      client_id: orgId,
      platform: "shopify",
      access_token: accessToken,
      refresh_token: null,
      expires_at: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString(), // Shopify tokens don't expire
      tokens_encrypted: encrypt(JSON.stringify(tokens)), // store shop domain too
      active: true,
      status: "active",
      connected_at: new Date().toISOString(),
      account_id: shop,
    },
    { onConflict: "client_id,platform" }
  );

  if (error) return NextResponse.redirect(new URL("/integrations?error=save_failed", req.url));
  return NextResponse.redirect(new URL("/integrations?success=shopify", req.url));
}
