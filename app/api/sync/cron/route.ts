import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

// Vercel cron job — configure in vercel.json
// Cron: "0 2 * * *" (2am UTC)
export async function GET(req: Request) {
  // Verify this is a legitimate Vercel Cron call
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({
    name: "sync/nightly.triggered",
    data: { triggeredAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() });
}
