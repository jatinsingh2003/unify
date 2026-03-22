// app/api/notifications/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const supabase = createServiceClient();
  let q = supabase
    .from("notifications")
    .select("*")
    .eq("client_id", orgId)
    .order("created_at", { ascending: false });

  if (unreadOnly) {
    q = q.eq("read", false);
  }

  const { data, error } = await q.limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationIds, markAllAsRead } = await req.json();
  const supabase = createServiceClient();

  let q = supabase
    .from("notifications")
    .update({ read: true })
    .eq("client_id", orgId);

  if (!markAllAsRead && notificationIds?.length > 0) {
    q = q.in("id", notificationIds);
  } else if (!markAllAsRead) {
    return NextResponse.json({ error: "No notifications specified" }, { status: 400 });
  }

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
