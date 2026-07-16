/**
 * Dynamic Screen Orchestration — the fixed, backend-owned toolset exposed
 * to the realtime voice model (Founder Decision, DOMAIN-005: "Approve
 * Dynamic Screen Orchestration"). Backend-owned and never accepted from
 * the client, mirroring how `voice-timing-policy.ts`'s `turn_detection`
 * is "injected into every brokered session and never accepted from the
 * client" — the member's own client cannot expand what the steward is
 * allowed to do mid-session.
 *
 * This is an allow-list, not a deny-list. The steward can only ever
 * navigate to an approved route, highlight something the client has
 * registered as currently visible, or move keyboard focus to a
 * registered form field. No tool exists for submitting applications,
 * approving transactions, spending money, accepting agreements, or
 * deleting anything — Human Agency (Founder Decision 5) is enforced by
 * what is absent from this list, not by a runtime permission check on a
 * broader capability the model could otherwise reach for.
 */
export const VOICE_ALLOWED_ROUTES = ['home', 'journey', 'opportunities', 'conversation', 'welcome'] as const;

export type VoiceAllowedRoute = (typeof VOICE_ALLOWED_ROUTES)[number];

export const VOICE_TOOLS: readonly Record<string, unknown>[] = [
  {
    type: 'function',
    name: 'navigate_to_route',
    description:
      "Navigate the member's screen to a different part of Aureus while continuing to talk, so they can see what you're describing. Only call this when it genuinely helps the member follow along — never merely because a topic was mentioned in passing.",
    parameters: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          enum: VOICE_ALLOWED_ROUTES,
          description: 'The Aureus screen to open.',
        },
      },
      required: ['route'],
    },
  },
  {
    type: 'function',
    name: 'focus_interface_target',
    description:
      "Draw the member's attention to a specific, currently-visible item on their screen (a goal, an opportunity, a next step) by its registered semantic target id — scrolling to it, highlighting it, and opening it if it is collapsed. Only reference a target id you have actually been told is currently visible.",
    parameters: {
      type: 'object',
      properties: {
        targetId: {
          type: 'string',
          description: 'The semantic target id to highlight, e.g. "Home.NextMission" or "Opportunity.Card.<id>".',
        },
      },
      required: ['targetId'],
    },
  },
  {
    type: 'function',
    name: 'focus_form_field',
    description:
      'Move keyboard focus to a specific, currently-visible form field so the member can type into it directly. Only use this for a target id you have been told is currently registered.',
    parameters: {
      type: 'object',
      properties: {
        targetId: {
          type: 'string',
          description: 'The semantic target id of the form field to focus.',
        },
      },
      required: ['targetId'],
    },
  },
] as const;
