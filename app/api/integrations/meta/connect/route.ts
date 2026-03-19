import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as crypto from "crypto";
import { kv } from "@/lib/kv";

const META_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const SCOPES = "ads_read,ads_management,business_management,read_insights";

export async function GET() {
  const { userId, orgId } = auth();
  if (!userId || !orgId) {
    return NextResponse.redirect(new URL("/sign-in", process.env.APP_URL!));
  }

  const state = crypto.randomBytes(32).toString("hex");
  const statePayload = JSON.stringify({ state, orgId, userId });
  await kv.set(`oauth:meta:${state}`, statePayload, 600);

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.APP_URL}/api/integrations/meta/callback`,
    scope: SCOPES,
    state,
    response_type: "code",
  });

  return NextResponse.redirect(`${META_AUTH_URL}?${params.toString()}`);
}
