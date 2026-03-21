// app/api/integrations/meta/connect/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = crypto.randomBytes(16).toString("hex");
  await kv.set(`meta:oauth:state:${state}`, orgId, { ex: 600 });
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.APP_URL}/api/integrations/meta/callback`,
    scope: "ads_read,ads_management,business_management,read_insights",
    response_type: "code", state,
  });
  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
