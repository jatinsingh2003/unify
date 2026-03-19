import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "unify",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
