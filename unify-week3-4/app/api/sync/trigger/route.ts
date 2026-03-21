// app/api/sync/trigger/route.ts
// Manual sync trigger endpoint — called from the Integrations page "Sync Now" button.
// Rate limited to 1 sync per platform per client per 10 minutes via Upstash Redis.

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { kv } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await req.json();
  if (!["google", "meta", "shopify"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // Rate limit: 1 manual sync per platform per org per 10 minutes
  const rateLimitKey = `sync:ratelimit:${orgId}:${platform}`;
  const existing = await kv.get(rateLimitKey);
  if (existing) {
    return NextResponse.json(
      { error: "Sync already in progress. Please wait 10 minutes." },
      { status: 429 }
    );
  }
  await kv.set(rateLimitKey, "1", { ex: 600 }); // 10 min TTL

  await inngest.send({
    name: "sync/platform.requested",
    data: { clientId: orgId, platform, days: 30 },
  });

  return NextResponse.json({ ok: true, message: `Sync started for ${platform}` });
}
