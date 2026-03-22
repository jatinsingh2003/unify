// app/api/sync/trigger/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { kv } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await req.json();
  if (!["google", "meta", "shopify"].includes(platform))
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });

  const rateLimitKey = `sync:ratelimit:${orgId}:${platform}`;
  const existing = await kv.get(rateLimitKey);
  if (existing)
    return NextResponse.json({ error: "Sync already in progress. Wait 10 minutes." }, { status: 429 });

  await kv.set(rateLimitKey, "1", 600);
  await inngest.send({ name: "sync/platform.requested", data: { clientId: orgId, platform } });

  return NextResponse.json({ ok: true, message: `Sync started for ${platform}` });
}
