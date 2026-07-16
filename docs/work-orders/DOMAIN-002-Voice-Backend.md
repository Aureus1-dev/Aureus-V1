# DOMAIN-002 — Voice (Backend Increment)

| Field | Value |
|---|---|
| Domain Number | DOMAIN-002 |
| Title | Voice |
| Status | Backend increment complete; frontend increment not started |
| Priority | High (Version 1 launch requirement, Founder directive) |
| Date | 2026-07-16 |
| Process | Domain Delivery — backend-then-frontend sequencing explicitly Founder-approved for this Domain (see Founder Decision — Continuous Voice Architecture, §8 Implementation Sequence), not a self-directed split |

---

## Objective

Give Aureus a realtime, continuous voice conversation capability with a member's AI Steward, governed by AFX-003 (Voice & Presence Canon) and AFX-002 (Conversation Canon), built on the streaming architecture (OpenAI Realtime API, backend-brokered ephemeral credentials, direct client WebRTC) the Founder approved after a comparative options analysis.

**This PR is the backend increment only.** Per the Founder-approved implementation sequence, the frontend Voice Domain (WebRTC client, mic permission UX, mute/barge-in controls) is a separate, subsequent Domain. **Per the standing Domain Completion Rule, Voice as a whole is not yet complete** — a member cannot yet have a live voice conversation, because no client exists yet. What this PR completes is the backend's own deliverable: every capability the frontend will need is implemented, tested, and ready to build against.

## Scope

- **Realtime session brokering** (`POST /ai/voice/sessions`) — issues a short-lived, member-scoped OpenAI Realtime client secret; the permanent `OPENAI_API_KEY` never reaches a client.
- **Canonical conversation integration** — voice sessions attach to the same `AiConversation`/`AiMessage` records text conversations use (WO-029); no parallel voice-only history.
- **Conversation Timing Layer** — policy (mandated `turn_detection` config, non-overridable by the client), evidence (`AiTurnEvent` log), and enforcement (a member turn can only be finalized on recorded evidence, never a client claim alone).
- **Event synchronization** (`POST /ai/voice/sessions/:id/events`) — finalized-only message + turn-event sync, idempotent on provider item ID.
- **Session lifecycle** (`POST /ai/voice/sessions/:id/end`) — explicit member-initiated end; idempotent. Duration-limit and reconnection-supersession as automatic backend checkpoints.
- **Cost/audit integration** — one `AiRequest` ledger row per session-broker attempt, reusing the existing single-ledger pattern (ADR-015 Decision 3).

## Governing Documents

**Canons:** AFX-002 (Conversation), AFX-003 (Voice & Presence — the primary governing canon for this increment), BRAND-008 (institutional tone, distinguished from AFX-003's presence/timing concerns).
**Architecture:** ADR-015 (AI Intelligence Engine — the `IAiProvider`/`AiRequestsService`/single-ledger precedents this Domain reuses), ADR-017 (this Domain's own engineering decisions, full detail).
**Founder Decisions:** Founder Decision — Continuous Voice Architecture (9 mandatory decisions); Founder Approval — Proceed with implementation, plus the Conversation Timing Layer requirement.

## Backend Audit

No pre-existing voice/speech infrastructure existed anywhere in the codebase (confirmed by exhaustive search before design began: zero matches for `speech|whisper|tts|webrtc|SpeechRecognition|SpeechSynthesis` in `apps/api/src` or `apps/web`; zero `ws`/`socket.io`/`@nestjs/schedule` dependency). Everything in this Domain is newly built.

## Domain Ownership

**Owns:** `apps/api/src/ai/voice/**` (controller, service, providers, repositories, DTOs, timing policy); additive `AiMessage` fields; new `AiVoiceSession`/`AiTurnEvent` models and their enums; `VOICE_CONVERSATION` capability on `AiCapability`; `VOICE_ASSISTANT_SYSTEM_PROMPT`.

**Depends on:** ADR-015's `AiConversation`/`AiMessage`/`AiRequest` repositories and `AiRequestsService`'s audit pattern (reused directly, not reimplemented); `OPENAI_API_KEY` (already configured for text completion — no new vendor onboarding).

**Explicitly does not own (this increment):** the frontend Voice Domain (WebRTC client, mic permission flow, mute/barge-in UI, visual presence) — next Domain; multi-speaker diarization (AFX-003 §6); Dynamic Screen Orchestration-dependent visual presence (AFX-003 §7-8); per-token realtime cost metering (stated limitation, ADR-017 Decision 6).

## Deliverables

- `prisma/schema.prisma` — `AiVoiceSession`, `AiTurnEvent` models; `AiMessageCompletionStatus`, `VoiceSessionEndReason`, `AiTurnEventType` enums; additive `AiMessage.{completionStatus,voiceSessionId,providerItemId}`; `AiCapability.VOICE_CONVERSATION`. Two migrations (`add_voice_domain`, `add_voice_capability`).
- `apps/api/src/ai/voice/voice-timing-policy.ts` — the Conversation Timing Layer policy.
- `apps/api/src/ai/voice/voice-session.service.ts`, `voice.controller.ts` — the three endpoints.
- `apps/api/src/ai/voice/providers/{voice-provider.interface,openai-voice.provider,stub-voice.provider,voice-provider.module}.ts`.
- `apps/api/src/ai/voice/repositories/{ai-voice-session,ai-turn-event}.repository.interface.ts` + Prisma implementations.
- `apps/api/src/ai/voice/dto/**` — `StartVoiceSessionDto`, `VoiceSessionResponseDto`, `SyncVoiceEventsDto` (+ nested `VoiceMessageEventDto`/`VoiceTurnEventDto`), `SyncVoiceEventsResponseDto`, `VoiceSessionStatusResponseDto`.
- `apps/api/src/ai/conversations/repositories/{ai-message.repository.interface,prisma-ai-message.repository}.ts` — extended additively with `createIfNotExists` (idempotent voice sync) and voice fields; `apps/api/src/ai/conversations/dto/message-response.dto.ts` — extended with `completionStatus`/`voiceSessionId`.
- `apps/api/src/ai/prompts/system-prompts.util.ts` — `VOICE_ASSISTANT_SYSTEM_PROMPT`.
- `apps/api/src/ai/ai.module.ts` — Voice registered alongside Conversations/Recommendations/Insights (same module, not a nested sub-module — matches existing convention).
- `.env.example` — `VOICE_MODEL`/`VOICE_NAME` documented, reusing `OPENAI_API_KEY`.
- `docs/architecture/ADR-017-Voice-Domain-Backend.md`, this report.

## Conversation Timing Layer — Validation (Founder-required)

Per the Founder's explicit instruction, timing behavior is validated, not merely asserted:

| Behavior (AFX-002 / AFX-003) | How it's enforced | How it's validated |
|---|---|---|
| "Avoid responding merely because a brief silence occurred" (§4) | `eagerness: 'low'` mandated in the timing policy, injected into every session, never client-supplied | `voice-session.service.spec.ts`: "injects the mandated Conversation Timing Layer policy into every brokered session, never a client-supplied one" |
| A pause/silence is never a completed turn (§4, §5) | `USER` messages require a prior `MEMBER_TURN_FINALIZED` turn event; `SILENCE_TIMEOUT` alone does not satisfy this | `voice-session.service.spec.ts`: "rejects a member message with no corresponding MEMBER_TURN_FINALIZED turn event"; "does not finalize a member turn merely because a pause/silence event was reported"; `ai.e2e.spec.ts`: real 400 over HTTP for an unbacked message |
| "Interrupted or incomplete steward output must be represented accurately" (Founder Decision 3) | `completionStatus: INTERRUPTED` persisted as reported, never silently normalized to `COMPLETE` | `voice-session.service.spec.ts` + `ai.e2e.spec.ts`: assistant message asserted `INTERRUPTED`, not `COMPLETE` |
| Turn-taking evidence is durable and ordered | `AiTurnEvent` persisted, queryable by `occurredAt` | `voice.integration.spec.ts`: real-DB idempotency and ordering |
| Re-delivered evidence does not corrupt the record | Idempotency on `(voiceSessionId, type, providerItemId)` for turn events, `(voiceSessionId, providerItemId)` for messages | `voice.integration.spec.ts` (real Postgres unique-constraint proof); `ai.e2e.spec.ts` (re-sync returns the same message id over HTTP) |

**Not validated in this increment (requires the frontend/live provider):** actual human-perceived pacing over a real WebRTC connection, real semantic-VAD behavior against live speech, and whether `eagerness: 'low'` "feels" right — these require the frontend Domain and manual device testing, listed below as a follow-up.

## Technical Risks and How They Were Addressed

1. **No backend visibility into raw audio timing** — resolved by scoping the Timing Layer to what the backend legitimately owns: policy injection, durable evidence, and turn-finalization enforcement (ADR-017 Decision 4), rather than attempting to reimplement VAD.
2. **Idempotent re-delivery under reconnect** — resolved with real database unique constraints plus repository-level catch-and-refetch on `P2002`, proven against a live Postgres instance (`voice.integration.spec.ts`), not just mocked.
3. **Duration/idle limits without a scheduler** — resolved as a checkpoint enforced on the next call after the threshold elapses, not a background watcher (ADR-017 Decision 6); stated honestly as "the session simply stops being usable," not "the session is proactively terminated the instant it expires."
4. **Cost visibility gap** — stated honestly as a scope boundary (ADR-017 Decision 6) rather than fabricating per-token numbers the backend cannot actually observe under the no-proxy architecture.

## Testing

- **Unit**: `voice-session.service.spec.ts` (19 tests) — session brokering, ownership, conversation reuse/creation, concurrency supersession, audit ledger writes on success/failure, Timing Layer enforcement, idempotency-adjacent behavior, duration-limit enforcement, end-session idempotency. `providers/stub-voice.provider.spec.ts` (2 tests).
- **Integration** (real PostgreSQL, no mocks): `voice.integration.spec.ts` (5 tests) — real FK enforcement (`AiVoiceSession` → `AiConversation`/`User`), real unique-constraint idempotency for both `AiTurnEvent` and `AiMessage`, confirms the voice unique constraint does not block ordinary text messages (both null).
- **End-to-end** (full app boot, real HTTP, stub provider): `ai.e2e.spec.ts` — new "Voice Domain" block (7 tests) — session start, Timing Layer 400 rejection over HTTP, accepted+interrupted message recording, idempotent re-sync, cross-member 403, end-session idempotency, reconnection supersession.
- **Regression**: full `apps/api` suite — **87 suites, 907 tests, all passing** (includes every prior Domain/Work Order's tests, unchanged).
- **Not automated** (requires live provider/hardware, listed as follow-up): a real OpenAI Realtime connection, real semantic-VAD timing feel, and the frontend WebRTC client — none of which exist yet in this increment.

## Architecture Compliance

- **Governing Canons followed**: AFX-002, AFX-003 (throughout — the primary canon), BRAND-008 (voice tone reused via `VOICE_ASSISTANT_SYSTEM_PROMPT`, distinguished from AFX-003's presence/timing scope).
- **Governing Architecture followed**: ADR-015 (provider abstraction, single-ledger audit pattern, module non-circularity), ADR-017 (this Domain's own decisions).
- **Founder's 9 mandatory decisions**: all addressed explicitly in ADR-017 Decisions 1-3, 5-9; cost/duration/concurrency in Decision 6.
- **Conversation Timing Layer requirement**: addressed as ADR-017 Decision 4 and validated per the table above.
- **Architectural deviations**: none from the approved plan. One scoping clarification made explicitly: `VoiceModule` was not created as its own `@Module` — Voice's controller/service/repositories are registered directly in `ai.module.ts`, matching how Conversations/Recommendations/Insights are already organized there (verified before writing code, not assumed).

## What Remains Before Voice (the Domain) Is Complete

Per the standing Domain Completion Rule, this backend increment alone does not complete the Voice Domain. Remaining, sequenced as the next Domain:
- Frontend Voice Domain: WebRTC client, mic permission flow (explicit member action, no hidden listening), mute/barge-in UX, visual session state.
- Manual device validation (real microphone/speaker/browser) — cannot be performed in this environment (no audio hardware, no live network path to OpenAI).
- A live-provider validation pass confirming `eagerness: 'low'` produces the intended conversational feel, with room to tune if it doesn't.

## Acceptance Criteria (this backend increment)

- [x] Ephemeral credential brokering never exposes the permanent API key.
- [x] Voice and text share one canonical conversation record.
- [x] Conversation Timing Layer implemented as backend policy + evidence + enforcement, not a frontend concern.
- [x] Interrupted/incomplete steward output represented accurately, never silently as complete.
- [x] Raw audio never referenced or persisted anywhere in this schema or service layer.
- [x] Session credentials are short-lived, member-scoped, ownership-checked, revocable.
- [x] Voice grants no broader tool/action permission than authenticated text conversation.
- [x] One active session per member, reconnection graceful by construction.
- [x] Duration limit enforced as a natural checkpoint, no new scheduler dependency.
- [x] `apps/api` builds, lints, and type-checks cleanly; 907/907 tests pass, including 33 new Voice Domain tests (19 unit + 5 integration + 2 provider + 7 e2e) and every pre-existing Domain/Work Order's tests unchanged.
