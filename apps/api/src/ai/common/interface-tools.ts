import type { AiToolDefinition } from '../providers/ai-provider.interface';

/**
 * Dynamic Screen Orchestration — the fixed, backend-owned toolset shared by
 * both the AI Steward's voice and text modalities (DOMAIN-005 Founder
 * Decision 2, extended to text by DOMAIN-007 Founder Decision 1: "one AI
 * Steward with multiple communication modalities... equivalent to the
 * already-approved safe voice interface tools"). Defined once here and
 * consumed by both `voice-tools.ts` (realtime session format) and
 * `ConversationsService` (Chat Completions / Messages API format via each
 * provider's own adapter) so the two modalities can never drift apart into
 * two different allow-lists.
 *
 * This is an allow-list, not a deny-list. No tool exists for submitting a
 * form, approving or dismissing on the member's behalf, spending money,
 * accepting an agreement, deleting information, transmitting information
 * externally, altering permissions, or any other irreversible or
 * legally-significant action — Human Agency is enforced by what is absent
 * from this list, not a runtime permission check on a broader capability
 * the model could otherwise reach for.
 */
export const INTERFACE_ALLOWED_ROUTES = ['home', 'journey', 'opportunities', 'academy', 'conversation', 'welcome'] as const;
export type InterfaceAllowedRoute = (typeof INTERFACE_ALLOWED_ROUTES)[number];

/**
 * The fixed set of informational panels the steward may open or close
 * (DOMAIN-007 Founder Decision 1). Deliberately narrow — today only the
 * standing Steward Workspace panel itself.
 */
export const INTERFACE_ALLOWED_PANELS = ['steward-workspace'] as const;
export type InterfaceAllowedPanel = (typeof INTERFACE_ALLOWED_PANELS)[number];

export const INTERFACE_TOOL_SPECS: readonly AiToolDefinition[] = [
  {
    name: 'navigate_to_route',
    description:
      "Navigate the member's screen to a different part of Aureus while continuing the conversation, so they can see what you're describing. Only call this when it genuinely helps the member follow along — never merely because a topic was mentioned in passing.",
    parameters: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          enum: INTERFACE_ALLOWED_ROUTES,
          description: 'The Aureus screen to open.',
        },
      },
      required: ['route'],
    },
  },
  {
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
  {
    name: 'open_panel',
    description: "Open one of Aureus's informational panels for the member, such as the Steward Workspace.",
    parameters: {
      type: 'object',
      properties: {
        panelId: {
          type: 'string',
          enum: INTERFACE_ALLOWED_PANELS,
          description: 'The panel to open.',
        },
      },
      required: ['panelId'],
    },
  },
  {
    name: 'close_panel',
    description: 'Close one of Aureus\'s informational panels for the member.',
    parameters: {
      type: 'object',
      properties: {
        panelId: {
          type: 'string',
          enum: INTERFACE_ALLOWED_PANELS,
          description: 'The panel to close.',
        },
      },
      required: ['panelId'],
    },
  },
] as const;
