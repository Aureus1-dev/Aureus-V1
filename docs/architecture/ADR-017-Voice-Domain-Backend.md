# ADR-017 — Voice Domain (Backend)

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-16 |
| Domain | Voice (backend increment) |
| Authority | AFX-002, AFX-003, ADR-015, Founder Decision — Continuous Voice Architecture, Founder Approval — Revised Backend Voice Domain Implementation Plan |

---

## Context

Voice is a Version 1 launch requirement (Founder directive, following DOMAIN-001). AFX-003 (Voice & Presence Canon) governs how Aureus is experienced during live conversation; no voice/speech backend infrastructure existed anywhere in the codebase prior to this ADR (confirmed by exhaustive search before design began).

Two architectures were compared: a request/response design extending the existing `IAiProvider` completion pattern, and a streaming/continuous-conversation design via OpenAI's Realtime API. The Founder explicitly instructed evaluation against "Aureus Version 1's long-term vision rather than the shortest implementation" and approved the streaming design (Option 2), then attached nine mandatory architectural decisions, and — upon approving implementation — added a tenth requirement: a Conversation Timing Layer treated as first-class backend architecture, with its behavior validated in the Domain Readiness Report.

This ADR records the engineering decisions made implementing that approved design.

---

## Decisions

### 1. Client connects directly to the provider; no backend audio proxy

**Decision:** The backend brokers a short-lived, member-scoped OpenAI Realtime client secret (`POST /ai/voice/sessions`); the browser then connects directly to OpenAI over WebRTC. The backend never proxies audio.

**Rationale:** This is the OpenAI-recommended integration shape for browser clients and is the only way to avoid exposing `OPENAI_API_KEY` to the client while also avoiding a backend media-relay component this V1 has no operational capacity to run. Direct consequence: the backend has no visibility into raw audio or per-token realtime usage — every other decision below is shaped by that boundary.

### 2. One Steward, one canonical conversation

**Decision:** Voice reuses the existing `AiConversation`/`AiMessage` models (WO-029) rather than a parallel voice-only history. `AiVoiceSession` attaches to an `AiConversation`; every finalized voice utterance becomes an ordinary `AiMessage` row.

**Rationale:** A member's steward relationship is one relationship regardless of modality. Text and voice history must be one readable timeline, not two systems a member (or Steward reviewing on their behalf) has to reconcile.

### 3. Persistence rules: finalized-only, accurate incompleteness, idempotent

**Decision:** `AiMessage` gained additive fields — `completionStatus` (`COMPLETE`/`INTERRUPTED`/`CANCELLED`, default `COMPLETE`), `voiceSessionId`, `providerItemId` — with a unique constraint on `(voiceSessionId, providerItemId)`. The sync endpoint (`POST /ai/voice/sessions/:id/events`) only ever accepts finalized messages; there is no partial/draft variant of the message DTO. An interrupted steward reply is persisted with `completionStatus: INTERRUPTED`, never silently as `COMPLETE`.

**Rationale:** Directly implements the Founder's instruction not to treat unstable partial transcription as a final member message, and to represent interrupted output accurately. The unique constraint makes re-delivery (client reconnect/retry) safe by construction rather than by convention.

### 4. Conversation Timing Layer: policy, evidence, enforcement

**Decision:** Because Decision 1 rules out backend audio-frame visibility, "first-class backend architecture" for timing is delivered as three concrete mechanisms rather than a reimplementation of voice-activity detection:

- **Policy** — `voice-timing-policy.ts` defines a mandated `turn_detection` configuration (`semantic_vad`, `eagerness: 'low'`, with a `server_vad` fallback shape) injected into every brokered session. The client cannot supply or override this; `StartVoiceSessionDto` has no field for it.
- **Evidence** — a new append-only `AiTurnEvent` model (`MEMBER_SPEECH_STARTED/STOPPED`, `MEMBER_TURN_FINALIZED`, `STEWARD_RESPONSE_STARTED/COMPLETED/INTERRUPTED`, `SILENCE_TIMEOUT`), idempotent on `(voiceSessionId, type, providerItemId)`, reported through the same `/events` endpoint.
- **Enforcement** — the backend is the arbiter of a completed turn: a `USER` message can only be persisted if a `MEMBER_TURN_FINALIZED` turn event with the same `providerItemId` already exists. A pause, a `SILENCE_TIMEOUT`, or the client's own claim is never sufficient on its own.

**Rationale:** AFX-003 §4/§5 and AFX-002 require that Aureus not mistake a pause for a finished thought and not interrupt. `eagerness: 'low'` is the concrete encoding of "avoid responding merely because a brief silence occurred." Making member-turn finalization contingent on recorded evidence — not client assertion — is what makes this a backend rule instead of a client-side convention that any bug or race could quietly violate.

### 5. Privacy and security

**Decision:** `OPENAI_API_KEY` never reaches the client — only the ephemeral `client_secret` from the broker response does. Raw audio is never referenced or persisted anywhere in this schema or service layer. Microphone access is entirely a frontend concern gated behind explicit member action (out of scope for this backend increment, but no backend endpoint here initiates or expects audio without a prior explicit session start). Session credentials are short-lived, member-bound (`AiVoiceSession.userId`, ownership-checked on every endpoint), and revocable (`POST /ai/voice/sessions/:id/end`). Voice grants no tool/action permission beyond what authenticated text conversation already has — no new privileged endpoint was added.

### 6. Cost and operational controls

**Decision:** Session brokering writes one `AiRequest` row (`capability: VOICE_CONVERSATION`) per attempt, `SUCCESS` or `FAILED`, mirroring `AiRequestsService`'s single-ledger pattern (ADR-015 Decision 3). Because realtime usage happens directly between client and provider, `promptTokens`/`completionTokens`/`costUsd` are recorded as `0` — this row is an authorization/audit event, not a token meter. Duration is enforced as a natural re-authorization checkpoint: a session cannot be synced past 30 minutes (`MAX_SESSION_DURATION_MS`); the backend ends it (`DURATION_LIMIT`) and rejects the call rather than running a scheduler against every open session. One active session per member is enforced by superseding (`RECONNECT_SUPERSEDED`) rather than hard-rejecting, since continuity lives in durable `AiMessage`/`AiTurnEvent` history, not provider session state — reconnection is graceful by construction.

**Known V1 limitation, stated honestly:** exact per-token realtime cost is not observable from this backend without either a media proxy (rejected by Decision 1) or a provider-side usage webhook (out of scope for V1). This is a deliberate scope boundary, not an oversight.

### 7. Explicit V1 deferrals

Not built in this increment: the frontend Voice Domain (WebRTC client, mute/barge-in UI, mic permission flow) — sequenced as a separate subsequent Domain per the original plan; multi-speaker diarization (AFX-003 §6); visual-presence orchestration (AFX-003 §7-8, depends on the still-deferred Dynamic Screen Orchestration); per-token realtime cost metering (see Decision 6).

### 8. Provider abstraction, mirrored but not merged with `IAiProvider`

**Decision:** A new `IVoiceProvider` interface (`brokerSession`) parallels `IAiProvider` (`complete`) rather than extending it — a session-broker call has a different shape than a text completion. `OpenAiVoiceProvider` and `StubVoiceProvider` mirror `OpenAiProvider`/`StubAiProvider` exactly, selected by whether `OPENAI_API_KEY` is configured (no `AI_PROVIDER=anthropic` branch: Anthropic has no realtime voice product).

### 9. Module placement

**Decision:** Voice's controller/service/repositories are registered directly in `ai.module.ts` (not wrapped in their own `@Module`), matching how `ConversationsController`/`RecommendationsService`/etc. are already organized in this module — a separate `VoiceModule` would have been the only feature in `AiModule` requiring cross-module token exports for no architectural benefit. `VoiceProviderModule` remains its own `@Module`, mirroring `AiProviderModule`.

---

## Consequences

- A member's voice and text history are one timeline; nothing about the Steward's memory changes based on modality.
- Timing is now something the Domain Readiness Report can test directly (turn-event ordering, enforcement rejections, idempotency) rather than something only observable by ear.
- The 30-minute duration checkpoint and single-active-session policy require no new infrastructure (no cron, no queue).
- The explicit non-goal — per-token realtime cost visibility — should be revisited once OpenAI's usage-reporting surface for Realtime sessions is evaluated, or if a future decision reverses the no-proxy boundary.
