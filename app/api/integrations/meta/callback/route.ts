import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

const TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const LONG_LIVED_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const APP_URL = process.env.APP_URL!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      `${APP_URL}/integrations?error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=missing_params`);
  }

  // CSRF check
  const stored = await kv.get(`oauth:meta:${state}`);
  if (!stored) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=invalid_state`);
  }
  await kv.del(`oauth:meta:${state}`);

  const { orgId } = JSON.parse(stored) as { orgId: string };

  // Exchange short-lived code for short-lived token
  const shortRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: `${APP_URL}/api/integrations/meta/callback`,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!shortRes.ok) {
    console.error("[meta-callback] short token exchange failed:", await shortRes.text());
    return NextResponse.redirect(`${APP_URL}/integrations?error=token_exchange_failed`);
  }

  const shortToken = (await shortRes.json()) as { access_token: string };

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `${LONG_LIVED_URL}?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: shortToken.access_token,
    })}`
  );

  if (!longRes.ok) {
    console.error("[meta-callback] long token exchange failed:", await longRes.text());
    return NextResponse.redirect(`${APP_URL}/integrations?error=long_token_failed`);
  }

  const longToken = (await longRes.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Fetch Meta Ad Account ID
  let accountId = "unknown";
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name&access_token=${longToken.access_token}`
    );
    if (meRes.ok) {
      const meData = (await meRes.json()) as {
        data?: Array<{ id: string; name: string }>;
      };
      accountId = meData.data?.[0]?.id ?? "unknown";
    }
  } catch (e) {
    console.warn("[meta-callback] could not fetch ad account:", e);
  }

  // Persist encrypted tokens
  // Meta doesn't give a refresh_token — we store the long-lived token as both
  const supabase = createServiceClient();
  const { error } = await supabase.from("integrations").upsert(
    {
      client_id: orgId,
      platform: "meta_ads",
      access_token: encrypt(longToken.access_token),
      refresh_token: encrypt(longToken.access_token), // same — re-exchange when needed
      expires_at: new Date(
        Date.now() + longToken.expires_in * 1000
      ).toISOString(),
      account_id: accountId,
      status: "active",
    },
    { onConflict: "client_id,platform" }
  );

  if (error) {
    console.error("[meta-callback] db upsert failed:", error);
    return NextResponse.redirect(`${APP_URL}/integrations?error=db_error`);
  }

  await inngest.send({
    name: "sync/platform.requested",
    data: { clientId: orgId, platform: "meta_ads", trigger: "oauth_connect" },
  });

  return NextResponse.redirect(`${APP_URL}/integrations?connected=Meta+Ads`);
}
