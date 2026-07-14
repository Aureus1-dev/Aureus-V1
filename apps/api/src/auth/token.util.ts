import { randomBytes, createHash } from 'crypto';

/**
 * Generates a high-entropy opaque token (refresh / password-reset / email-verification)
 * and its SHA-256 hash for storage. Only the hash is persisted; the plaintext token
 * is returned once to the caller and never stored (OAS-SEC-003 — credential protection).
 *
 * SHA-256 (not bcrypt) is used here because these tokens are cryptographically random
 * with far more entropy than a human-chosen password, so a slow KDF is unnecessary —
 * a fast, deterministic hash allows an indexed lookup by hash at verification time.
 */
export function generateOpaqueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashOpaqueToken(token) };
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
