// app/api/integrations/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/oauth-state";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state)
    return NextResponse.redirect(new URL(`/integrations?error=${error ?? "missing_params"}`, req.url));

  const orgId = verifyOAuthState(state);
  if (!orgId) {
    console.warn("[google/callback] Invalid or expired CSRF state.");
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", req.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/api/integrations/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[google/callback] Token exchange failed:", body);
    return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", req.url));
  }

  const tokenData = await tokenRes.json();
  const supabase = createServiceClient();

  const { error: dbError } = await supabase.from("integrations").upsert(
    {
      client_id: orgId,
      platform: "google",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      active: true,
    },
    { onConflict: "client_id,platform" }
  );

  if (dbError) {
    console.error("[google/callback] DB upsert failed:", JSON.stringify(dbError));
    return NextResponse.redirect(
      new URL(`/integrations?error=save_failed&detail=${encodeURIComponent(dbError.message)}`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/integrations?success=google", req.url));
}
