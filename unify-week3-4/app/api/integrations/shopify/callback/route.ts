// app/api/integrations/shopify/callback/route.ts
// Step 2 of Shopify OAuth — exchanges the code for an access token and saves it.

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";
import { exchangeShopifyCode, ShopifyTokens } from "@/lib/platforms/shopify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  if (!code || !shop || !state || !hmac) {
    return NextResponse.redirect(
      new URL("/integrations?error=missing_params", req.url)
    );
  }

  // Verify CSRF state token
  const orgId = await kv.get<string>(`shopify:oauth:state:${state}`);
  if (!orgId) {
    return NextResponse.redirect(
      new URL("/integrations?error=invalid_state", req.url)
    );
  }
  await kv.del(`shopify:oauth:state:${state}`);

  // Verify Shopify HMAC signature
  const params = Object.fromEntries(searchParams.entries());
  delete params.hmac;
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const digest = require("crypto")
    .createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!)
    .update(message)
    .digest("hex");

  if (digest !== hmac) {
    return NextResponse.redirect(
      new URL("/integrations?error=hmac_mismatch", req.url)
    );
  }

  // Exchange code for access token
  const accessToken = await exchangeShopifyCode(shop, code);

  const tokens: ShopifyTokens = { access_token: accessToken, shop };

  // Save to integrations table
  const supabase = createServiceClient();
  const { error } = await supabase.from("integrations").upsert(
    {
      client_id: orgId,
      platform: "shopify",
      tokens_encrypted: encrypt(JSON.stringify(tokens)),
      active: true,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "client_id,platform" }
  );

  if (error) {
    console.error("Shopify token save failed:", error);
    return NextResponse.redirect(
      new URL("/integrations?error=save_failed", req.url)
    );
  }

  return NextResponse.redirect(
    new URL("/integrations?success=shopify", req.url)
  );
}
