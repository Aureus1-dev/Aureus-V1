/**
 * Version identifier for the current arrival consent + "what to expect"
 * copy (Gate B — B3). Bump this whenever the consent copy changes
 * materially; a member who granted an earlier version is no longer
 * considered current and is asked to re-consent. Mirrored (not shared) in
 * apps/web/lib/config/consent.ts, matching the V1 feature-scope precedent
 * (B1) — the two apps intentionally do not share a package for one string.
 */
export const CURRENT_CONSENT_VERSION = 'v1-2026-07';
