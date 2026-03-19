import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { encrypt } from "@/lib/encryption";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const APP_URL = process.env.APP_URL!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // User denied access
  if (errorParam) {
    return NextResponse.redirect(
      `${APP_URL}/integrations?error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=missing_params`);
  }

  // ── CSRF verification ────────────────────────────────────────────────────
  const stored = await kv.get(`oauth:google:${state}`);
  if (!stored) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=invalid_state`);
  }

  // One-time use — delete immediately
  await kv.del(`oauth:google:${state}`);

  const { orgId } = JSON.parse(stored) as { state: string; orgId: string; userId: string };

  // ── Exchange code for tokens ─────────────────────────────────────────────
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${APP_URL}/api/integrations/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[google-callback] token exchange failed:", err);
    return NextResponse.redirect(`${APP_URL}/integrations?error=token_exchange_failed`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  };

  if (!tokens.refresh_token) {
    // This happens when the user has already authorized before and didn't see
    // the consent screen. Tell them to revoke and reconnect.
    return NextResponse.redirect(
      `${APP_URL}/integrations?error=no_refresh_token`
    );
  }

  // ── Fetch Google Ads customer ID ─────────────────────────────────────────
  let accountId = "unknown";
  try {
    const custRes = await fetch(
      "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
        },
      }
    );
    if (custRes.ok) {
      const custData = (await custRes.json()) as {
        resourceNames?: string[];
      };
      // Take first accessible customer
      const first = custData.resourceNames?.[0];
      accountId = first ? first.replace("customers/", "") : "unknown";
    }
  } catch (e) {
    console.warn("[google-callback] could not fetch customer ID:", e);
  }

  // ── Persist encrypted tokens ─────────────────────────────────────────────
  const supabase = createServiceClient();
  const { error: dbError } = await supabase.from("integrations").upsert(
    {
      client_id: orgId,
      platform: "google_ads",
      access_token: encrypt(tokens.access_token),
      refresh_token: encrypt(tokens.refresh_token),
      expires_at: new Date(
        Date.now() + tokens.expires_in * 1000
      ).toISOString(),
      account_id: accountId,
      status: "active",
    },
    { onConflict: "client_id,platform" }
  );

  if (dbError) {
    console.error("[google-callback] db upsert failed:", dbError);
    return NextResponse.redirect(`${APP_URL}/integrations?error=db_error`);
  }

  // ── Trigger initial sync via Inngest ─────────────────────────────────────
  await inngest.send({
    name: "sync/platform.requested",
    data: { clientId: orgId, platform: "google_ads", trigger: "oauth_connect" },
  });

  return NextResponse.redirect(`${APP_URL}/integrations?connected=Google+Ads`);
}
