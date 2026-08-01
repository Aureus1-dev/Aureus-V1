/**
 * What a visitor is told when Aureus cannot start a guest session for
 * them right now because the front door is at capacity (HTTP 429 from
 * `POST /auth/guest`).
 *
 * Deliberately not `domainErrorCopy('rate-limited')`, whose wording —
 * "You're moving a little quickly" — is right for a member clicking
 * through a surface faster than the API allows, and wrong here. A
 * visitor who has just arrived has done nothing quickly; the traffic is
 * other people's. Telling them otherwise would blame them for someone
 * else's load at the exact moment they are asking for help.
 *
 * The previous behaviour was worse than either: a silent redirect to
 * `/login`, which turned "no account required" into a login wall with no
 * explanation given.
 */
export const ARRIVAL_CAPACITY_TITLE = "We're seeing unusual traffic right now";

export const ARRIVAL_CAPACITY_DESCRIPTION =
  'Please try again in a moment — you do not need an account, and nothing is wrong on your end.';
