import type { CarryReason } from './types';

/**
 * Carry Boundary signal detection (review addendum §5.2 / §5.3).
 *
 * This is deliberately a small set of explicit, deterministic phrase
 * patterns — not a model call. Slice 0 must be able to prove, in a unit
 * test with no network and no AI, that a plain goal statement never
 * trips the Carry Boundary and that an explicit durable-carry request
 * always does. A real implementation may eventually route this decision
 * through Aureus itself; the *rule* it must enforce (goal existence alone
 * is never sufficient, an explicit durable-carry request always is) is
 * what this module encodes and what the tests pin down.
 */
const STRONG_SIGNAL_PATTERNS: Array<{ pattern: RegExp; reason: CarryReason }> = [
  {
    pattern:
      /keep (on )?working on this|carry this (through|forward)|continue this (on|later|tomorrow)/i,
    reason: {
      id: 'continue-later',
      why: 'To pick this work back up, Aureus needs a place to securely keep it between visits.',
    },
  },
  {
    pattern: /remind me (tomorrow|later|next|in a)|notify me|watch for updates|monitor (this|it)/i,
    reason: {
      id: 'monitoring',
      why: 'Keeping watch on this after you leave requires an account so updates can reach you.',
    },
  },
  {
    pattern: /remember this|track (this|the) deadline|come back to this/i,
    reason: {
      id: 'reminder',
      why: 'To remember this across visits, Aureus needs a place to keep it that only you can reach.',
    },
  },
  {
    pattern: /save (these|this|my) (document|documents|record|records)/i,
    reason: {
      id: 'documents',
      why: 'Keeping documents safe across visits and devices requires a secure account.',
    },
  },
  {
    pattern: /connect (my|our) (account|accounts|calendar|bank)/i,
    reason: {
      id: 'connected-account',
      why: 'Connecting an outside account requires your permission to be tied to a real identity.',
    },
  },
];

/**
 * Returns the Carry Boundary reason a message explicitly asks for, or
 * `null` if it does not. A bare goal statement ("I need housing", "I lost
 * my job", "help me find a place to live") must always return `null` —
 * per the addendum's non-signal list, a goal is not consent for
 * persistent stewardship.
 */
export function detectCarryBoundarySignal(text: string): CarryReason | null {
  for (const { pattern, reason } of STRONG_SIGNAL_PATTERNS) {
    if (pattern.test(text)) return reason;
  }
  return null;
}

const URGENT_PATTERNS =
  /(emergency|immediate danger|in danger|unsafe right now|about to be evicted today|crisis|hurt (myself|someone)|not safe)/i;

/** Conservative, explicit keyword check — never the sole gate for a real safety system. */
export function detectUrgentSignal(text: string): boolean {
  return URGENT_PATTERNS.test(text);
}
