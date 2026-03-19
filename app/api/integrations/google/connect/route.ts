import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as crypto from "crypto";
import { kv } from "@/lib/kv";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/adwords",
].join(" ");

export async function GET() {
  const { userId, orgId } = auth();
  if (!userId || !orgId) {
    return NextResponse.redirect(new URL("/sign-in", process.env.APP_URL!));
  }

  // Generate a CSRF state token — includes orgId so callback can verify
  const state = crypto.randomBytes(32).toString("hex");
  const statePayload = JSON.stringify({ state, orgId, userId });

  // Store in Redis with 10-minute TTL
  await kv.set(`oauth:google:${state}`, statePayload, 600);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/integrations/google/callback`,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",   // Required to get refresh_token
    prompt: "consent",         // Forces refresh_token even on re-auth
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
