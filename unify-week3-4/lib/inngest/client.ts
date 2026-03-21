// lib/inngest/client.ts
// Singleton Inngest client — import this everywhere you need inngest.send() or createFunction()

import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "unify" });
