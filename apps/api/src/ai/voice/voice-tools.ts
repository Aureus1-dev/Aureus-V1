import { INTERFACE_ALLOWED_ROUTES, INTERFACE_TOOL_SPECS } from '../common/interface-tools';

/**
 * Dynamic Screen Orchestration — the realtime-session-format view of the
 * shared toolset defined once in `ai/common/interface-tools.ts` (DOMAIN-005
 * Founder Decision 2, unified with the text modality by DOMAIN-007 Founder
 * Decision 1). Backend-owned and never accepted from the client, mirroring
 * how `voice-timing-policy.ts`'s `turn_detection` is "injected into every
 * brokered session and never accepted from the client."
 *
 * `VOICE_ALLOWED_ROUTES` and `VOICE_TOOLS` are re-exported under their
 * original DOMAIN-005 names so every existing call site (`voice-session.
 * service.ts`, `voice-provider.interface.ts`, and their tests) is
 * unaffected by this Domain's unification of the two modalities' toolsets.
 */
export const VOICE_ALLOWED_ROUTES = INTERFACE_ALLOWED_ROUTES;
export type VoiceAllowedRoute = (typeof VOICE_ALLOWED_ROUTES)[number];

export const VOICE_TOOLS: readonly Record<string, unknown>[] = INTERFACE_TOOL_SPECS.map((spec) => ({
  type: 'function',
  name: spec.name,
  description: spec.description,
  parameters: spec.parameters,
}));
