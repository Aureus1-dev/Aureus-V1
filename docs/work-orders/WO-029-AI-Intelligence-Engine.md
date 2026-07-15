# WO-029 — AI Intelligence Engine

| Field | Value |
|---|---|
| Work Order Number | WO-029 |
| Title | AI Intelligence Engine (PA-006) |
| Status | Complete |
| Priority | High (the founder-unblocked backend domain following WO-028) |
| Date | 2026-07-15 |

---

## Objective

Implement the AI Intelligence Engine as a platform orchestrator, not a general chatbot: a swappable-provider, tool-orchestrating, human-approved layer that helps members and stewards understand and act on their own Aureus data (Goals, Journeys, Opportunities, Resources, Knowledge, Academy, Stewardship, Business Portal), with request history, cost tracking, and rate limiting as first-class infrastructure, reusing every existing authorization/notification/repository pattern.

## Scope

- **Provider abstraction**: `IAiProvider` interface with `OpenAiProvider`/`AnthropicProvider` (real REST calls via runtime `fetch`, no vendor SDK) and `StubAiProvider` (safe, deterministic, zero-network default), selected via `AI_PROVIDER` env var through a DI factory (`AiProviderModule`).
- **Request infrastructure**: `AiRequestsService.runCompletion()` — the single call path every capability uses, unifying request history, cost tracking (static per-model pricing table), and audit logging (`AiRequest`, one row per provider call, success or failure).
- **Conversations (AI Question Answering)**: `AiConversation`/`AiMessage` conversation-memory abstraction, scoped by a fixed platform-assistant system prompt; owner-only access.
- **Insights (AI Opportunity/Resource Explanations, AI Journey Guidance, AI Academy Guidance, AI Knowledge Search)**: five stateless, grounded, single-shot capabilities, each assembling context via existing domain services before one provider call.
- **Recommendations (AI Recommendations)**: `AiRecommendation` — generates up to 3 personalized suggestions per category (Opportunity/Resource/Course) from each domain's own existing verified listing, with real nullable per-target-type FKs (reusing the `StewardshipRecommendation` shape), approve/dismiss workflow (status change only, never an auto-executed action), and a deterministic non-JSON-response fallback.
- Full Swagger documentation (`ai` tag).
- Unit, Prisma integration, and end-to-end automated tests.

## Out of Scope

- Real cloud AI provider credentials/live calls in this implementation environment — `AI_PROVIDER` defaults to `stub`; `OpenAiProvider`/`AnthropicProvider` are implemented but unexercised against a live vendor here (mirrors WO-023's untested-real-SMTP precedent).
- Autonomous agents, long-running workflows, or self-modifying behavior — explicitly excluded by the WO text; every capability is a single, deterministic, human-triggered request/response.
- Document Intelligence integration — conditional on a domain that does not yet exist.
- Any action that mutates a member's real platform state on the AI's own initiative (auto-enroll, auto-save, etc.) — recommendations are suggestion records only; the member always acts through the target domain's own existing endpoints.
- A persisted per-user AI spend cap — rate limiting reuses the existing in-memory `ThrottlerModule`, tightened per-route.
- Any change to `OpportunitiesModule`/`ResourcesModule`/`JourneysModule`/`GoalsModule`/`MilestonesModule`/`AcademyModule`/`KnowledgeModule`/`CommunicationModule` business logic — the AI Engine integrates via each module's existing exported services only.

## Dependencies

- WO-026 (Communication System) — supplies `NotificationsService.notify()` and the forward-provisioned `NotificationCategory.AI_GUIDANCE` value, consumed with zero further schema migration (the third such proof, after Academy/`ACADEMY`).
- WO-028 (Academy) — supplies `CoursesService`, consumed for Academy Guidance and Course recommendations.
- WO-027 (Knowledge System) — supplies `KnowledgeService`, consumed for Knowledge Search.
- WO-020/ADR-004 (Opportunity Engine), Resource Directory, Journey Engine, Goals — supply the read-only services orchestrated for grounding context.
- WO-011/ADR-011 (Stewardship System) — supplies the `StewardshipRecommendation` real-FK-per-target-type shape, reused verbatim for `AiRecommendation`.

## Source Documents

- PA-006 — AI Intelligence Engine Architecture
- PA-018 — Permissions & Access Architecture
- ADR-003 — User Module (layering pattern)
- ADR-009 — Email Delivery (provider-agnostic-transport / safe-fallback precedent reused for `AI_PROVIDER`)
- ADR-011 — Stewardship System (`StewardshipRecommendation` real-FK-per-target-type shape, reused for `AiRecommendation`)
- ADR-012 — Communication System (`notify()` integration point, `NotificationCategory.AI_GUIDANCE` forward provisioning)
- ADR-014 — Academy Foundation (single-code-path-for-related-concerns precedent, reused for request history/cost/audit)

## Deliverables

- ADR-015 — AI Intelligence Engine
- `apps/api/src/ai/**` (module, four sub-domain services/controllers/repositories/DTOs, provider abstraction, unit + integration + e2e tests)
- Prisma migration `add_ai_intelligence_engine`
- `docs/verification/WO-029-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `prisma/migrations/20260715184113_add_ai_intelligence_engine/`
- `apps/api/src/ai/ai.module.ts`, `ai.integration.spec.ts`, `ai.e2e.spec.ts`
- `apps/api/src/ai/common/ai-roles.util.ts`
- `apps/api/src/ai/providers/{ai-provider.interface,openai.provider,anthropic.provider,stub.provider,ai-provider.module}.ts` (+ `stub.provider.spec.ts`)
- `apps/api/src/ai/prompts/system-prompts.util.ts`
- `apps/api/src/ai/requests/{ai-requests.service,ai-requests.controller,ai-pricing.util}.ts` (+ spec)
- `apps/api/src/ai/requests/dto/{ai-request-response,paginated-ai-requests-response,list-ai-requests-query}.dto.ts`
- `apps/api/src/ai/requests/repositories/{ai-request.repository.interface,prisma-ai-request.repository}.ts`
- `apps/api/src/ai/conversations/{conversations.service,conversations.controller}.ts` (+ spec)
- `apps/api/src/ai/conversations/dto/{create-conversation,ask-question,conversation-response,paginated-conversations-response,message-response,list-conversations-query}.dto.ts`
- `apps/api/src/ai/conversations/repositories/{ai-conversation.repository.interface,prisma-ai-conversation.repository,ai-message.repository.interface,prisma-ai-message.repository}.ts`
- `apps/api/src/ai/insights/{insights.service,insights.controller}.ts` (+ spec)
- `apps/api/src/ai/insights/dto/{insight-response,knowledge-search,knowledge-search-response}.dto.ts`
- `apps/api/src/ai/recommendations/{recommendations.service,recommendations.controller}.ts` (+ spec)
- `apps/api/src/ai/recommendations/dto/{request-recommendations,recommendation-response,paginated-recommendations-response,list-recommendations-query}.dto.ts`
- `apps/api/src/ai/recommendations/repositories/{ai-recommendation.repository.interface,prisma-ai-recommendation.repository}.ts`
- `docs/architecture/ADR-015-AI-Intelligence-Engine.md`
- `docs/work-orders/WO-029-AI-Intelligence-Engine.md` (this file)
- `docs/verification/WO-029-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `prisma/schema.prisma` — `AiConversation`, `AiMessage`, `AiRequest`, `AiRecommendation` models; `AiProvider`, `AiCapability`, `AiRequestStatus`, `AiMessageRole`, `AiRecommendationStatus` enums; back-relations on `User`/`Opportunity`/`Resource`/`Course`.
- `apps/api/src/app.module.ts` — registers `AiModule`; adds `AI_PROVIDER`/`OPENAI_API_KEY`/`OPENAI_MODEL`/`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` to the Joi env-validation schema (all optional, safe-default pattern).
- `apps/api/src/main.ts` — Swagger `ai` tag.
- `.env.example` — documents the new AI provider env vars.
- `docs/releases/version-1-readiness.md` — WO-029 marked complete, AI Intelligence Engine moved off the Remaining Backend Domains list, scores recomputed, next WO recommendation updated.

## Database Changes

New migration `add_ai_intelligence_engine`: four new tables (`AiConversation`, `AiMessage`, `AiRequest`, `AiRecommendation`), five new enums, and additive back-relations on `User` (`aiConversations`/`aiRequests`/`aiRecommendations`), `Opportunity`/`Resource`/`Course` (`aiRecommendations`). No changes to any existing table's columns.

## API Changes

New: `POST/GET /ai/conversations`, `GET /ai/conversations/:id`, `GET/POST /ai/conversations/:id/messages`, `POST /ai/opportunities/:id/explain`, `POST /ai/resources/:id/explain`, `POST /ai/journeys/:id/guidance`, `POST /ai/academy/courses/:id/guidance`, `POST /ai/knowledge/search`, `POST/GET /ai/recommendations`, `GET /ai/recommendations/:id`, `POST /ai/recommendations/:id/{approve,dismiss}`, `GET /ai/requests/me`, `GET /ai/requests/:id`.

## Security Requirements

- All AI endpoints require `JwtAuthGuard`; every capability derives the caller's identity from the JWT, never the request body.
- Conversation/recommendation/request-history access is strictly owner-only (Platform/System Administrator override only for request-history support access) — never cross-user, resolved server-side from the loaded entity's real `userId`.
- Journey Guidance reuses `JourneysService.findById(id, caller)`'s existing ownership enforcement — a caller cannot request guidance for a journey they do not own.
- Recommendation approval/dismissal never triggers a mutating call into another domain — verified by the absence of any `EnrollmentsService`/`SavedOpportunitiesService`/etc. call in `RecommendationsService.approve()`/`.dismiss()`.
- AI-provider-calling endpoints carry a tighter `@Throttle()` override (10–20 req/min) on top of the platform's existing global rate limit, reflecting their real external cost.
- Provider API keys are read only from environment configuration (`ConfigService`), never logged, never included in any response DTO.

## Testing Requirements

- Unit: 5 spec files (28 tests) — `AiRequestsService` (success/failure logging, cost computation, owner/admin access), `ConversationsService` (create, ask with system-prompt-plus-history assembly, ownership), `InsightsService` (all five capabilities delegate to the correct domain service and capability enum), `RecommendationsService` (JSON-parse success path, non-JSON fallback path, existing-PENDING dedup, PENDING-only approve/dismiss guard), `StubAiProvider` (deterministic, zero-network completion).
- Integration: `ai.integration.spec.ts` (4 tests) — real PostgreSQL, no mocks: the real FK from `AiConversation`/`AiRequest` to `User` (including rejection for a nonexistent user), ordered `AiMessage` retrieval, and `AiRecommendation`'s real nullable per-target-type FK with the `findExistingPending` dedup query.
- End-to-end: `ai.e2e.spec.ts` (15 tests) — full HTTP lifecycle via Supertest against a booted application, using the deterministic `stub` provider throughout (`AI_PROVIDER` defaults to `stub` with no configured API keys): unauthenticated rejection, the full conversation Q&A lifecycle with request-history verification, all five Insights capabilities (including a 403 for a non-owned Journey), the full Recommendation lifecycle (generate via the JSON-parse fallback path, cross-user access denial, approve, re-decide conflict), and real cross-module notification delivery (`GET /communications/notifications?category=AI_GUIDANCE`). The `learner`/`other learner` personas are real registered users via `/auth/register` (required — `AiConversation.userId`/`AiRequest.userId`/`AiRecommendation.userId` carry real FKs, per ADR-015); author/moderator personas for seeded Opportunity/Resource/Course/Knowledge grounding data remain synthetic self-minted tokens, matching every prior domain's e2e precedent.

## Acceptance Criteria

- [x] An unauthenticated caller cannot access any AI endpoint (401).
- [x] A member can start a conversation, ask a question, and receive an assistant reply grounded by a fixed, platform-scoped system prompt; a non-owner cannot read another member's conversation (403).
- [x] Every provider call — success or failure — creates exactly one `AiRequest` row with capability, provider, model, token counts, cost, latency, and status.
- [x] Opportunity/Resource explanation, Journey guidance, and Academy guidance each fetch real grounding data via existing domain services and produce a generated explanation; Journey guidance enforces the journey's existing ownership rule.
- [x] Knowledge Search returns both an AI-synthesized answer and the real verified article sources it was grounded in.
- [x] Recommendation generation fetches real candidates from each domain's own existing verified listing (no duplicate matching logic), persists up to 3 as `PENDING` with a real per-target-type FK, and degrades deterministically to a generic-rationale fallback when the AI's response is not valid JSON.
- [x] Approving or dismissing a recommendation only changes its status — no other domain's data is mutated as a result.
- [x] Re-deciding an already-decided recommendation returns 409.
- [x] Generating recommendations notifies the member via the Communication System (`category: AI_GUIDANCE`), visible via `GET /communications/notifications`.
- [x] `AI_PROVIDER` defaults to `stub`; the entire test suite and this environment run with zero external network calls to any AI vendor.
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest` (full monorepo suite, serial), `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification confirms the compiled application boots with zero DI errors and all AI routes registered against a running database — confirming the nine-module cross-domain dependency graph (Decision 10) resolves with no cycle.

## Definition of Done

Met — see `docs/verification/WO-029-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- `OpenAiProvider`/`AnthropicProvider` have not been exercised against a live provider in this implementation environment (no outbound network access to a real AI vendor here) — mirrors WO-023's real-SMTP Known Limitation exactly; an operator should perform one live call per configured provider during production deployment verification.
- Recommendation rationale can fall back to a generic, non-personalized string when the AI's JSON response is malformed — a deliberate resilience trade-off (ADR-015 Decision 7), not a defect; the raw AI response remains visible in the `AiRequest` audit log.
- The per-model cost table (`ai-pricing.util.ts`) is a static snapshot, not a live-synced billing feed — will drift from providers' actual pricing over time and should be updated manually when it changes.
- Rate limiting is in-memory and per-process (`ThrottlerModule`), not a persisted per-user/per-organization spend cap.
- Document Intelligence integration does not exist — that domain is unbuilt, per the WO's own "as they become available" phrasing.
- Steward-facing AI capabilities (as opposed to member-facing guidance) were not built — PA-006's V1 scope, as directed, is member-facing guidance/recommendation/Q&A.

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
