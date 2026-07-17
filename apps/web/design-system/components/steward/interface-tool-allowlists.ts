/**
 * The frontend's own defense-in-depth mirror of the backend's fixed
 * `open_panel`/`close_panel` allow-list (`apps/api/src/ai/common/
 * interface-tools.ts`) — one AI Steward, two communication modalities,
 * one set of safe actions (DOMAIN-007 Founder Decision 1). The route
 * allow-list already exists as `VOICE_ALLOWED_ROUTE_PATHS` in
 * `../voice/voice-routes.ts` and is reused as-is here, not duplicated —
 * per Founder Decision 4, "do not maintain a third independent route
 * allowlist."
 */
export const INTERFACE_ALLOWED_PANEL_IDS = ['steward-workspace'] as const;
export type InterfaceAllowedPanelId = (typeof INTERFACE_ALLOWED_PANEL_IDS)[number];
