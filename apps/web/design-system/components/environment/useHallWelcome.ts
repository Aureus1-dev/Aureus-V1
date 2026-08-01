'use client';

import { useContext } from 'react';
import { ConversationContext } from '../../../state/conversation/ConversationContext';

/**
 * How lit the Hall is, from 0 to 1.
 *
 * ── The idea ───────────────────────────────────────────────────────
 *
 * Founder directive: the room begins at candlelight — "flickering
 * candles, warmth" — and as the member speaks it "brightens up, and
 * brightens up and brightens up" until the Hall is fully lit and
 * welcoming: *you're here now*.
 *
 * So brightness is not a theme, a preference, or a time of day. It is
 * the state of the relationship, rendered as light. A room at 0 is a
 * room kept warm for someone who has not arrived yet: a few candles
 * burning, everything else in shadow, patient. A room at 1 is a room
 * with someone in it.
 *
 * That is why the curve below is shaped the way it is. The first thing a
 * member says changes the room *the most* — someone spoke, and the Hall
 * answers — and every exchange after that adds a little less, so the
 * light approaches full without ever snapping to it. A linear ramp would
 * have made the tenth message as significant as the first, which is
 * false: the first one is the one where a stranger became a guest.
 *
 * ── Why it never returns to darkness ───────────────────────────────
 *
 * It only rises within a session. AUREUS-003: the Hall "should never
 * punish absence or create guilt for time away." A room that dimmed
 * while a member sat thinking would be the architecture growing
 * impatient with them, and nothing in this house is ever allowed to do
 * that.
 */

/**
 * How much of the remaining darkness each exchange lifts.
 *
 * At 0.42, a first message takes the room from 0 to 0.42, a second to
 * 0.66, a fourth past 0.88 — welcomed in the space of a real
 * conversation, not a transaction and not a slow grind.
 */
const LIFT_PER_EXCHANGE = 0.42;

/** Where the room sits before anyone has spoken: candlelit, waiting. */
export const HALL_AT_REST = 0;

export function useHallWelcome(): number {
  // Read optionally, never required. The Hall is lit during arrival, during
  // session restoration and in tests, none of which have a conversation —
  // and a room that cannot be lit until someone speaks is the opposite of
  // the idea. No conversation means nothing has been said, which is
  // exactly candlelight.
  const conversation = useContext(ConversationContext);
  if (!conversation) return HALL_AT_REST;

  const { activeConversationId, messagesByConversation, pendingMessages, pendingResponse } =
    conversation.state;

  const committed = activeConversationId
    ? (messagesByConversation[activeConversationId]?.length ?? 0)
    : 0;
  // A member who has just pressed send has spoken, even though nothing
  // has come back yet. The room answers the speaking, not the reply —
  // waiting in a room that has not acknowledged you is the loneliest
  // moment in any interface.
  const inFlight = pendingMessages.length > 0 || pendingResponse ? 1 : 0;

  const exchanges = committed + inFlight;
  if (exchanges === 0) return HALL_AT_REST;

  // Each exchange lifts the same *fraction* of what is still dark, so the
  // light approaches full and never quite arrives — which is also true of
  // any real room with a fire in it.
  return 1 - Math.pow(1 - LIFT_PER_EXCHANGE, exchanges);
}
