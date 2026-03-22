// app/api/integrations/shopify/connect/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { buildShopifyAuthUrl } from "@/lib/platforms/shopify";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop))
    return NextResponse.json({ error: "Invalid shop domain. Must be *.myshopify.com" }, { status: 400 });
  const state = crypto.randomBytes(16).toString("hex");
  await kv.set(`shopify:oauth:state:${state}`, orgId, 600);
  return NextResponse.redirect(buildShopifyAuthUrl(shop, state));
}
