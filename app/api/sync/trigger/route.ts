import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { kv } from "@/lib/kv";

const RATE_LIMIT_WINDOW = 30 * 60; // 30 minutes in seconds

export async function POST(req: Request) {
  const { orgId } = auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { platform?: string };
  const platform = body.platform;

  if (!platform || !["google_ads", "meta_ads", "shopify"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // Rate limit: 1 manual sync per 30 min per (client, platform)
  const rateLimitKey = `sync:ratelimit:${orgId}:${platform}`;
  const existing = await kv.get(rateLimitKey).catch(() => null);

  if (existing) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Manual sync is limited to once every 30 minutes per platform.",
      },
      { status: 429 }
    );
  }

  // Set rate limit token
  await kv.set(rateLimitKey, "1", RATE_LIMIT_WINDOW);

  // Fire Inngest event
  await inngest.send({
    name: "sync/platform.requested",
    data: {
      clientId: orgId,
      platform,
      trigger: "manual",
    },
  });

  return NextResponse.json({ ok: true, message: `Sync triggered for ${platform}` });
}
