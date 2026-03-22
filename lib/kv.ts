/**
 * Lightweight Redis client using Upstash REST API.
 * Compatible with Vercel KV (same interface) and Upstash directly.
 *
 * Falls back to an in-memory Map when KV_REST_API_URL is not configured
 * (local dev without Upstash). THE IN-MEMORY STORE IS NOT PERSISTENT —
 * it resets on every server restart. It is only suitable for local dev.
 *
 * Used for:
 * - OAuth CSRF state tokens (10min TTL, one-time use)
 * - Rate limiting manual syncs (1 per 10min per client per platform)
 */

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// In-memory fallback for local dev (when KV creds are not set)
const memStore = new Map<string, { value: string; expiresAt: number | null }>();

function isKvConfigured() {
  return KV_URL && KV_URL !== "REPLACE_ME" && KV_TOKEN && KV_TOKEN !== "REPLACE_ME";
}

// --- REST-based path (production) ---

async function kvRequest(command: string[]): Promise<unknown> {
  const res = await fetch(`${KV_URL}/${command.join("/")}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.result;
}

// --- In-memory path (local dev) ---

function memSet(key: string, value: string, ttlSeconds?: number): void {
  memStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memDel(key: string): void {
  memStore.delete(key);
}

// --- Public interface ---

export const kv = {
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!isKvConfigured()) { memSet(key, value, ttlSeconds); return; }
    if (ttlSeconds) {
      await kvRequest(["SET", key, value, "EX", String(ttlSeconds)]);
    } else {
      await kvRequest(["SET", key, value]);
    }
  },

  async get<T = string>(key: string): Promise<T | null> {
    if (!isKvConfigured()) return memGet(key) as T | null;
    const result = await kvRequest(["GET", key]);
    return result as T | null;
  },

  async del(key: string): Promise<void> {
    if (!isKvConfigured()) { memDel(key); return; }
    await kvRequest(["DEL", key]);
  },

  async exists(key: string): Promise<boolean> {
    if (!isKvConfigured()) return memGet(key) !== null;
    const result = await kvRequest(["EXISTS", key]);
    return result === 1;
  },

  async incr(key: string): Promise<number> {
    if (!isKvConfigured()) {
      const current = parseInt(memGet(key) ?? "0", 10);
      memSet(key, String(current + 1));
      return current + 1;
    }
    const result = await kvRequest(["INCR", key]);
    return result as number;
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!isKvConfigured()) {
      const entry = memStore.get(key);
      if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
      return;
    }
    await kvRequest(["EXPIRE", key, String(ttlSeconds)]);
  },
};
