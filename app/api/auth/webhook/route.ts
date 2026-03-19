import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();

  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: { type: string; data: Record<string, unknown> };

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as typeof evt;
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const supabase = createServiceClient();

  // --- Organization created → provision client row ---
  if (evt.type === "organization.created") {
    const org = evt.data as {
      id: string;
      name: string;
      created_at: number;
    };

    const { error } = await supabase.from("clients").upsert(
      {
        id: org.id,
        name: org.name,
        plan: "free",
        created_at: new Date(org.created_at).toISOString(),
        settings: {},
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("[webhook] failed to create client:", error);
      return new NextResponse("DB error", { status: 500 });
    }

    console.log(`[webhook] provisioned client for org ${org.id} (${org.name})`);
  }

  // --- Organization deleted → mark inactive (soft delete) ---
  if (evt.type === "organization.deleted") {
    const org = evt.data as { id: string };
    await supabase
      .from("clients")
      .update({ settings: { deleted: true } })
      .eq("id", org.id);
  }

  return NextResponse.json({ received: true });
}
