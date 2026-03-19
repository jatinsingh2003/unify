/**
 * Lightweight Redis client using Upstash REST API.
 * Compatible with Vercel KV (same interface) and Upstash directly.
 *
 * Used for:
 * - OAuth CSRF state tokens (10min TTL, one-time use)
 * - Rate limiting manual syncs (1 per 30min per client)
 * - Query caching (optional, future)
 */

const KV_URL = process.env.KV_REST_API_URL!;
const KV_TOKEN = process.env.KV_REST_API_TOKEN!;

async function kvRequest(command: string[]): Promise<unknown> {
  const res = await fetch(`${KV_URL}/${command.join("/")}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.result;
}

export const kv = {
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await kvRequest(["SET", key, value, "EX", String(ttlSeconds)]);
    } else {
      await kvRequest(["SET", key, value]);
    }
  },

  async get(key: string): Promise<string | null> {
    const result = await kvRequest(["GET", key]);
    return result as string | null;
  },

  async del(key: string): Promise<void> {
    await kvRequest(["DEL", key]);
  },

  async exists(key: string): Promise<boolean> {
    const result = await kvRequest(["EXISTS", key]);
    return result === 1;
  },

  /** Increment a counter, optionally setting TTL on first creation */
  async incr(key: string): Promise<number> {
    const result = await kvRequest(["INCR", key]);
    return result as number;
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await kvRequest(["EXPIRE", key, String(ttlSeconds)]);
  },
};
