/**
 * Mirrors the backend's `VOICE_ALLOWED_ROUTES`
 * (`apps/api/src/ai/voice/voice-tools.ts`) — the fixed set of route keys
 * the `navigate_to_route` tool's JSON schema constrains the model to.
 * This map is the frontend's own defense-in-depth check (FPB-009 §8):
 * even though the model can only ever be offered these values by the
 * schema itself, `VoiceOrchestrator` looks the key up here rather than
 * trusting it directly, so an unexpected value safely no-ops instead of
 * being passed to the router. Keep in sync with the backend list by hand
 * — there is no shared package between `apps/api` and `apps/web` to
 * enforce this automatically.
 */
export const VOICE_ALLOWED_ROUTE_PATHS: Record<string, string> = {
  home: '/home',
  journey: '/journey',
  opportunities: '/opportunities',
  academy: '/academy',
  conversation: '/conversation',
  welcome: '/welcome',
};
