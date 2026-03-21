// app/api/integrations/google/callback/route.ts
// Saves tokens to integrations table using YOUR column names:
//   access_token, refresh_token, expires_at (timestamptz)

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state)
    return NextResponse.redirect(new URL(`/integrations?error=${error ?? "missing_params"}`, req.url));

  const orgId = await kv.get<string>(`google:oauth:state:${state}`);
  if (!orgId) return NextResponse.redirect(new URL("/integrations?error=invalid_state", req.url));
  await kv.del(`google:oauth:state:${state}`);

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
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", req.url));

  const tokenData = await tokenRes.json();
  const supabase = createServiceClient();

  const { error: dbError } = await supabase.from("integrations").upsert(
    {
      client_id: orgId,
      platform: "google",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      active: true,
      status: "active",
      connected_at: new Date().toISOString(),
    },
    { onConflict: "client_id,platform" }
  );

  if (dbError) {
    console.error("Google token save failed:", dbError);
    return NextResponse.redirect(new URL("/integrations?error=save_failed", req.url));
  }
  return NextResponse.redirect(new URL("/integrations?success=google", req.url));
}
