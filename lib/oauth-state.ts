/**
 * lib/oauth-state.ts
 *
 * Stateless OAuth CSRF protection using HMAC-SHA256.
 * Encodes orgId + timestamp + nonce into the state param — no Redis needed.
 *
 * Format (base64url):  orgId|timestamp|nonce|hmac
 */

import crypto from "crypto";

const SECRET = process.env.ENCRYPTION_KEY ?? "dev-secret-change-me";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Create a signed state token embedding the orgId. */
export function createOAuthState(orgId: string): string {
  const nonce     = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now().toString();
  const payload   = `${orgId}|${timestamp}|${nonce}`;
  const hmac      = sign(payload);
  return Buffer.from(`${payload}|${hmac}`).toString("base64url");
}

/**
 * Verify the state token and return the orgId.
 * Returns null if invalid, tampered, or older than maxAgeMs (default 10 min).
 */
export function verifyOAuthState(
  state: string,
  maxAgeMs = 10 * 60 * 1000
): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts   = decoded.split("|");
    if (parts.length !== 4) return null;

    const [orgId, timestamp, nonce, hmac] = parts;
    const payload  = `${orgId}|${timestamp}|${nonce}`;
    const expected = sign(payload);

    // Constant-time comparison to prevent timing attacks
    const match = crypto.timingSafeEqual(
      Buffer.from(hmac,     "hex"),
      Buffer.from(expected, "hex")
    );
    if (!match) return null;

    // Check expiry
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > maxAgeMs) return null;

    return orgId;
  } catch {
    return null;
  }
}
