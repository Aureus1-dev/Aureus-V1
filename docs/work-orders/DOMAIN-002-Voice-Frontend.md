# DOMAIN-002 — Voice (Frontend Increment)

| Field | Value |
|---|---|
| Domain Number | DOMAIN-002 |
| Title | Voice |
| Status | Frontend increment complete — Voice Domain (backend + frontend) now complete end-to-end, pending manual device validation |
| Priority | High (Version 1 launch requirement) |
| Date | 2026-07-16 |
| Process | Second and final increment of the Voice Domain, per the Founder-approved backend-then-frontend sequence recorded in `DOMAIN-002-Voice-Backend.md` |

---

## Objective

Complete the Voice Domain by building the WebRTC client, the continuous-conversation experience, and every member-facing control the backend increment (`DOMAIN-002-Voice-Backend.md`, merged) was built to serve: listening/thinking/speaking presence, barge-in, mute and end-session controls, a live transcript, text ↔ voice continuity, mobile responsiveness, and accessibility.

**Per the standing Domain Completion Rule, the Voice Domain is now complete**: a real member can open a conversation, switch to voice, speak naturally and continuously, be heard, hear a reply, interrupt it if they choose, see everything transcribed live, end the session, and find the same conversation intact when they switch back to typing — without any step requiring code that doesn't yet exist.

## Scope

- **WebRTC client integration** — direct browser-to-provider connection per the backend-mandated architecture (no audio proxy); the ephemeral credential from `POST /ai/voice/sessions` is the only credential the client ever holds.
- **Continuous conversation** — no press-and-release per utterance; the member speaks freely once a session is open.
- **Listening / thinking / speaking states** — a state machine driven directly by the provider's realtime events, translated through a dedicated event-mapping layer that mirrors the backend's Conversation Timing Layer vocabulary.
- **Voice animation** — a calm, state-driven orb (deliberately not audio-reactive/flashy — AFX-003 §2, §10: presence, not a performance).
- **Barge-in** — both natural (speaking over the steward, handled by the provider under the backend's `interrupt_response: true` policy) and an explicit **Interrupt** button as the accessible alternative for members who cannot reliably speak over the steward.
- **Mute / End session controls** — session-level, not per-turn.
- **Live transcript** — an `aria-live` region rendering both sides of the conversation as text, which is how a Deaf or hard-of-hearing member follows a voice conversation at all, not a cosmetic caption.
- **Text ↔ voice continuity** — a Talk/Type toggle inside the existing Conversation Core surface, both bound to the same `conversationId`; ending a voice session refreshes the text view.
- **Mobile responsiveness** and **accessibility** — built in throughout via the existing token/breakpoint/reduced-motion system, not a separate pass.

## Governing Documents

**Canons:** AFX-002 (Conversation), AFX-003 (Voice & Presence — primary governing canon, §2–§5, §7, §9–§10), BRAND-008.
**Blueprints:** FPB-002, FPB-005 §3/§7, FPB-006 (motion tokens), FPB-009, FPB-010 §3/§7 (state reuse), FPB-011 (Accessibility), FPB-012 (Responsive).
**Backend contract:** `DOMAIN-002-Voice-Backend.md`, `ADR-017-Voice-Domain-Backend.md` — every endpoint, DTO, and Timing Layer event this increment consumes was defined there and is unchanged here.

## Backend Audit

No backend changes were made or needed. This increment consumes exactly the three endpoints DOMAIN-002's backend increment shipped: `POST /ai/voice/sessions`, `POST /ai/voice/sessions/:id/events`, `POST /ai/voice/sessions/:id/end`, plus the pre-existing `GET /ai/conversations/:id/messages` (for post-session continuity refresh).

## Frontend Audit / Existing Reusable Infrastructure

Reused unmodified: the `lib/api/*.ts` client pattern, the `useReducer` + `classifyError` + `useCallback` + `use<Domain>()` context pattern (`ConversationContext`, `JourneyContext`, etc.), the `Card`/`Button`/`EmptyState`/`ErrorState`/`VisuallyHidden` primitives, the full design token system (color/motion/spacing/breakpoints) including the `prefers-reduced-motion` handling already built into `app/globals.css` and `build-theme-css.ts`, and the `ConversationContext`/`ConversationSurface` this Domain extends rather than forks.

**New infrastructure this increment adds** (and that a future Domain could reuse): `ConversationContext.refreshMessages(id)` — a cache-bypassing refetch, additive to the existing cache-trusting `selectConversation`.

## Domain Ownership

**Owns:** `apps/web/lib/api/voice.ts`; `apps/web/lib/voice/{realtime-event-mapper,webrtc-client}.ts`; `apps/web/state/voice/VoiceContext.tsx`; `apps/web/design-system/components/voice/**`; the Talk/Type toggle inside `ConversationSurface.tsx`; `ConversationContext.refreshMessages`.

**Depends on:** DOMAIN-002's backend increment (merged), `ConversationContext` (extended additively, not forked), `SessionContext`.

**Explicitly does not own:** any backend change; Dynamic Screen Orchestration or visual-presence automation (AFX-003 §7–§8, still deferred); multi-speaker diarization (AFX-003 §6); a standalone `/voice` route — voice lives inside the existing Conversation Core surface by design, since text and voice are one experience, not two.

## Architecture

**Event translation is isolated from connection management.** `RealtimeEventMapper` (`lib/voice/realtime-event-mapper.ts`) is the only code in the frontend that knows OpenAI's realtime wire format, and it is a pure-ish, fully unit-testable class with no DOM/WebRTC dependency — a deliberate split from `VoiceWebRtcClient` (`lib/voice/webrtc-client.ts`), which owns `getUserMedia`/`RTCPeerConnection`/the SDP exchange and is tested against mocked browser APIs. This mirrors the backend's own `IVoiceProvider` abstraction (ADR-017 Decision 8): if the realtime event vocabulary changes, exactly one file changes.

**State machine.** `VoiceContext` translates normalized events into `idle → connecting → listening → thinking → speaking` transitions. Critically, `member-speech-started`/`member-speech-stopped` never advance the state past `listening` on their own — only a `member-turn-finalized` event (which the backend itself will reject persisting without corresponding Timing Layer evidence) or a `response.created` from the steward moves the state forward. This is the same "a pause is never a finished thought" discipline (AFX-003 §4) enforced on the backend, now also true of the client's own presentation, not just its network calls.

**Barge-in is represented honestly.** When `response.done` arrives with `status: 'cancelled'` or `'incomplete'`, the transcript entry is marked `interrupted`, not silently completed — and synced to the backend as `completionStatus: 'INTERRUPTED'`, matching exactly what the backend enforces on its side.

**Continuity is a refetch, not a merge.** Rather than attempting to reconcile two independently-tracked message caches, ending a voice session simply calls `ConversationContext.refreshMessages(conversationId)`, which always refetches from the backend — the single source of truth — rather than trying to keep a client-side voice transcript and a client-side text history consistent with each other by hand.

## Testing

- **Unit** (pure/near-pure logic): `realtime-event-mapper.test.ts` (9 tests) — every event type, transcript delta assembly, barge-in vs. clean completion, stale-transcript-can't-leak-into-next-response.
- **Unit** (mocked browser APIs): `webrtc-client.test.ts` (11 tests) — mic requested only on `connect()`, full offer/answer exchange with the ephemeral secret (never a permanent key), malformed-event resilience, mute/interrupt/disconnect.
- **State machine**: `VoiceContext.test.tsx` (12 tests) — full session lifecycle, the "pause never finalizes a turn" behavior, thinking→speaking transitions, barge-in marking, mute, interrupt delegation, end-session flush-then-teardown, connection-lost and broker-failure error classification.
- **Component + accessibility** (`jest-axe` on every one): `VoiceOrb` (2), `VoiceStateLabel` (3), `VoiceControls` (6 — including that Interrupt only appears while speaking), `LiveTranscript` (5 — including the interrupted-entry marker and the streaming placeholder).
- **Integration**: `VoiceSurface.test.tsx` (9 tests) — the full component tree wired to real (non-mocked) `VoiceProvider`/`ConversationProvider`, with only the network boundary (`lib/api/voice`, `lib/api/conversations`, `lib/voice/webrtc-client`) mocked; covers sign-in gating, explicit-action mic gating, live transcript rendering, mute, end-and-refresh, and error states.
- **Continuity**: one new test added to `ConversationSurface.test.tsx` proving the Talk/Type toggle passes the same `conversationId` through and that returning to Type shows what was said by voice; one new test added to `ConversationContext.test.tsx` proving `refreshMessages` bypasses the cache `selectConversation` trusts.
- **New test infrastructure**: a `scrollIntoView` polyfill was added to `jest.setup.ts` (jsdom doesn't implement it), since `LiveTranscript`'s auto-scroll is the first component in this codebase to need it — a reusable addition, not a one-off hack.
- **Totals**: 59 new tests (57 in 8 new files + 2 additive in existing files). Full `apps/web` regression: **34 suites, 161 tests, all passing** (includes every prior Domain's tests, unchanged).
- **Full pipeline**: `next lint` clean, `tsc --noEmit` clean, `next build` succeeds (29 static routes, `/home` through `/welcome`, no errors).
- **Not automated** (requires real hardware/network — see the companion Manual Device Validation Plan): a live OpenAI Realtime connection, real microphone/speaker round-trip, real barge-in by voice, mobile Safari/Chrome-specific behavior, and a screen-reader pass on a real device.

## Architecture Compliance

- **Governing Canons followed**: AFX-002, AFX-003 (throughout), BRAND-008.
- **Governing Blueprints followed**: FPB-002, FPB-005, FPB-006, FPB-009, FPB-010, FPB-011, FPB-012.
- **Architectural deviations**: none from the backend-defined contract. One scoping decision made explicitly: voice lives inside the existing `/conversation` route via a mode toggle rather than a new standalone route, since the whole point of this increment is that voice and text are one conversation, not two destinations.

## Risks and How They Were Addressed

1. **Realtime wire-format coupling** — isolated entirely to `RealtimeEventMapper`, unit-tested independent of any browser API, so a provider protocol change touches one file.
2. **"Beautiful animation" vs. AFX-003's anti-attention-seeking mandate** — resolved by choosing a calm, state-driven breathing pulse over an audio-reactive waveform; deliberate, documented in `VoiceOrb.tsx`'s own comment, not an oversight.
3. **Accessibility of barge-in** — a purely voice-based interrupt would exclude any member who cannot reliably speak over the steward; the explicit **Interrupt** button (`VoiceControls`) is a first-class, equally-supported path, not an afterthought.
4. **jsdom cannot exercise real WebRTC/audio** — addressed by the mock-boundary split described above (event translation fully tested for real; connection management tested against faithful mocks of the actual browser APIs used) plus the companion Manual Device Validation Plan for what remains genuinely untestable in this environment.

## What Remains

Per the Manual Device Validation Plan (`DOMAIN-002-Voice-Frontend-Manual-Validation-Plan.md`): a real-device pass across the browser/OS matrix, real barge-in and mute behavior, mobile-specific checks (notably iOS Safari), and a screen-reader pass — none of which this environment can execute (no audio hardware, no live network path to OpenAI). This is stated as an open follow-up, not claimed as done.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] A member can open a live voice connection to their steward via explicit action (no automatic/hidden listening).
- [x] The conversation is continuous — no press-and-release per utterance.
- [x] Listening, thinking, and speaking are each visually and textually (accessibly) distinguishable states.
- [x] The member can interrupt the steward, by voice or by an explicit accessible control.
- [x] The member can mute and end the session at any time, independent of any in-progress turn.
- [x] Everything said, by either party, is visible as live text, not audio-only.
- [x] The same conversation is genuinely shared between text and voice, verified by a real refetch after the session ends.
- [x] The experience adapts to mobile viewport widths using the existing breakpoint system.
- [x] Every new component passes `jest-axe` with zero violations, uses real semantic controls, and respects `prefers-reduced-motion`.
- [x] `apps/web` builds, lints, and type-checks cleanly; 161/161 tests pass, including 59 new tests for this increment.
- [ ] Manual device validation — designed, documented, **not yet executed** (requires hardware unavailable in this environment).
