// app/api/integrations/google/connect/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = crypto.randomBytes(16).toString("hex");
  await kv.set(`google:oauth:state:${state}`, orgId, { ex: 600 });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/integrations/google/callback`,
    response_type: "code",
    scope: ["https://www.googleapis.com/auth/adwords", "https://www.googleapis.com/auth/userinfo.email"].join(" "),
    access_type: "offline", prompt: "consent", state,
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
