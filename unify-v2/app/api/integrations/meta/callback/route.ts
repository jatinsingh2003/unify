// app/api/integrations/meta/callback/route.ts
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

  const orgId = await kv.get<string>(`meta:oauth:state:${state}`);
  if (!orgId) return NextResponse.redirect(new URL("/integrations?error=invalid_state", req.url));
  await kv.del(`meta:oauth:state:${state}`);

  // Short-lived token
  const shortRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&redirect_uri=${encodeURIComponent(`${process.env.APP_URL}/api/integrations/meta/callback`)}` +
    `&code=${code}`
  );
  if (!shortRes.ok) return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", req.url));
  const { access_token: shortToken } = await shortRes.json();

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}` +
    `&fb_exchange_token=${shortToken}`
  );
  if (!longRes.ok) return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", req.url));
  const longData = await longRes.json();

  const supabase = createServiceClient();
  const { error: dbError } = await supabase.from("integrations").upsert(
    {
      client_id: orgId,
      platform: "meta",
      access_token: longData.access_token,
      refresh_token: null,
      expires_at: new Date(Date.now() + (longData.expires_in ?? 5_184_000) * 1000).toISOString(),
      active: true,
      status: "active",
      connected_at: new Date().toISOString(),
    },
    { onConflict: "client_id,platform" }
  );

  if (dbError) return NextResponse.redirect(new URL("/integrations?error=save_failed", req.url));
  return NextResponse.redirect(new URL("/integrations?success=meta", req.url));
}
