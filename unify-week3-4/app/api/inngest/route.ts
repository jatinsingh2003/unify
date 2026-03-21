// app/api/inngest/route.ts
// Inngest webhook endpoint — receives events from the Inngest cloud or dev server.
// This is the single entry point for ALL Inngest functions.

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { syncPlatform, nightlySync } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncPlatform, nightlySync],
});
