export interface AccessTokenClaims {
  sub: string;
  email: string;
  roles: string[];
}

/**
 * Reads the member identity out of the access token's payload without a
 * network round-trip. This does not verify the signature — verification
 * already happened server-side when the token was issued; the frontend
 * only needs the claims to populate Session State (FPB-010 §3), never to
 * make an authorization decision (the backend re-checks every request).
 */
export function decodeAccessToken(accessToken: string): AccessTokenClaims | null {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const json = atob(padded);
    const claims = JSON.parse(json) as Partial<AccessTokenClaims>;
    if (!claims.sub || !claims.email || !Array.isArray(claims.roles)) return null;
    return { sub: claims.sub, email: claims.email, roles: claims.roles };
  } catch {
    return null;
  }
}
