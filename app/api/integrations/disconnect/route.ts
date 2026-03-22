// app/api/integrations/disconnect/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { platform } = await req.json();
    if (!platform) return NextResponse.json({ error: "Missing platform" }, { status: 400 });

    const supabase = createServiceClient();
    
    // Delete the integration record for this org and platform
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("client_id", orgId)
      .eq("platform", platform);

    if (error) {
      console.error(`[disconnect] Logout failed for ${platform}:`, error);
      return NextResponse.json({ error: `Failed to disconnect ${platform}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[disconnect] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
