# ADR-015 — AI Intelligence Engine

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-029 |
| Authority | PA-006, PA-018, ADR-003, ADR-009, ADR-012, ADR-014 |

---

## Context

PA-006 (AI Intelligence Engine) is one of the twelve Version 1 systems named in PA-020, and — per `docs/releases/version-1-readiness.md`'s post-WO-028 audit — the founder resolved its scope decision, unblocking it as the next backend Work Order. The founder's WO-029 directive is explicit about what this domain is *not*: not a general chatbot, not an autonomous agent, not a long-running-workflow engine, not self-modifying. It orchestrates the *existing* Aureus platform — Goals, Journeys, Opportunities, Resources, Knowledge, Academy, Stewardship, Business Portal — to explain, answer, and recommend, with every irreversible action left to a human's own approval and the platform's own existing endpoints.

Architecturally, this is a different kind of domain than any built so far: it has almost no data model of its own (no Course, no Organization, no Enrollment) — its job is to read across nearly every other domain and produce natural-language output, backed by a swappable external AI provider. That combination — many read-only cross-domain dependencies, one new external integration, and a hard product constraint against autonomy — drives every decision below.

---

## Decisions

### 1. Provider abstraction via a DI-swappable interface, not a single class with an internal fallback

**Decision:** `IAiProvider` (`complete()`) is implemented by three classes — `OpenAiProvider`, `AnthropicProvider`, `StubAiProvider` — selected by a `useFactory` provider (`AI_PROVIDER` env var) in `AiProviderModule`, rather than one service class that branches internally (contrast `NodemailerEmailService`'s single-class-with-internal-transport-branch, ADR-009 Decision 4).

**Rationale:** The WO explicitly requires "Multiple providers (OpenAI, Anthropic, future providers)... Design so providers can be swapped without affecting business logic." A single branching class satisfies "has a fallback" but not "swappable" in the sense of independently testable, independently extensible units — a fourth provider (e.g., a future in-house model) is a new class implementing `IAiProvider` and one new factory branch, with zero change to `OpenAiProvider`/`AnthropicProvider`/`StubAiProvider` or to any capability service, which only ever depends on the interface.

---

### 2. Prompt templates as plain TypeScript functions, not database-configurable

**Decision:** `ai/prompts/system-prompts.util.ts` holds one constant (the platform-assistant system prompt) and one prompt-builder function per capability, all plain code.

**Rationale:** "Prompt templates" as an architecture requirement is satisfied by having a reviewable, single-module template layer that every capability calls through — nothing in PA-006 or the WO text asks for member/admin-editable prompts at V1, and a database-backed template system would be meaningful new product surface (versioning, approval workflow, injection-safety review) that wasn't requested. Kept in one file so every capability's grounding and scope constraints are auditable together, the same reasoning ADR-006 applied to keeping scoring logic in one small, reviewable module.

---

### 3. `AiRequest` unifies request history, cost tracking, and audit logging into one code path

**Decision:** Every capability service calls `AiRequestsService.runCompletion()` instead of the provider directly. It calls the provider once, computes cost from a static per-model USD/1K-token table (`ai-pricing.util.ts`), and writes exactly one `AiRequest` row — on success or failure — capturing capability, provider, model, token counts, cost, latency, and status.

**Rationale:** Mirrors ADR-014 Decision 7's "one path, not three mechanisms" reasoning: "AI request history," "cost tracking," and "audit logging" are three names for the same event (one provider call), not three independent features to wire up separately per capability. Routing every capability through one shared method also makes it structurally impossible for a future capability to forget to log its own usage — the log point lives in the shared infrastructure, not in each of the seven capability implementations.

---

### 4. "Tool orchestration" means deterministic cross-service calls, not an LLM-driven agent loop

**Decision:** `InsightsService`/`RecommendationsService`/`ConversationsService` each call across existing domain services (`OpportunitiesService.findById()`, `GoalsService.findAll()`, `MilestonesService.findAll()`, etc.) in a fixed, code-defined sequence to assemble grounding context, then call the AI provider exactly once per request with that context baked into the prompt.

**Rationale:** The WO explicitly forbids autonomous agents and long-running workflows. "Tool orchestration" is satisfied by the *coordination* sense of the word — the AI Engine orchestrates calls to the platform's existing "tools" (its services) — without building the *agentic* sense (an LLM deciding at runtime which tools to call, in what order, based on its own reasoning, potentially looping). Every orchestration path in this WO is written and reviewable as ordinary application code; the AI model only ever produces the final natural-language content, never controls program flow.

---

### 5. `AiRecommendation` reuses `StewardshipRecommendation`'s real-nullable-FK-per-target-type shape, not a polymorphic pointer

**Decision:** `AiRecommendation` has three real, nullable, mutually-exclusive FKs — `opportunityId`, `resourceId`, `courseId` — exactly one populated per row, instead of a generic `targetType` + loose `targetId` pointer.

**Rationale:** `StewardshipRecommendation` (WO-025/ADR-011) already solved this exact shape of problem — a steward recommending one of a small, fixed set of target types to a member — with real FKs per type rather than a polymorphic pointer, preserving referential integrity for a target set that is closed and known at schema-design time. Reusing that precedent verbatim for `AiRecommendation` is direct evidence the pattern generalizes, not a one-off; a genuinely open-ended polymorphic target set (arbitrary future entity types) would justify a different design, but "Opportunity, Resource, Course" is exactly as closed as "Opportunity, Resource" was for Stewardship.

---

### 6. Recommendations never auto-execute — approval is a status flip, never a triggered action

**Decision:** `RecommendationsService.approve()` and `.dismiss()` only update `AiRecommendation.status`/`decidedAt`. Neither method enrolls the member in a course, saves an opportunity/resource, or calls any other domain's mutating endpoint. The member acts for themselves, afterward, through the target domain's own existing UI/API.

**Rationale:** This is the WO's single hardest constraint, stated three times in different words: "recommend... never perform irreversible actions automatically... the member or steward always approves." A design where "approve" silently triggers `EnrollmentsService.enroll()` would violate this even though it might feel more convenient — the founder's boundary is that AI-initiated *state changes to the member's real platform data* never happen without the member's own, separate action through the feature that already owns that action (Academy's own enroll endpoint, Opportunities' own save endpoint). "Approve" here means "I agree with this suggestion," not "do this for me."

---

### 7. AI Recommendations delegates matching entirely to existing verified-listing search — no new scoring/matching algorithm

**Decision:** `RecommendationsService.generate()` fetches its candidate pool via the target domain's own existing, unmodified `findAll()` (VERIFIED-only by default, per each domain's established pattern) — never a new query, filter, or ranking algorithm. The AI's only job is picking up to three from that pool and writing a short rationale per pick, and if its response isn't valid, parseable JSON, the code deterministically falls back to the top N candidates from the pool with a generic rationale rather than failing the request.

**Rationale:** "Reuse existing repository and service patterns... do not duplicate" is explicit in the WO. `OpportunityScoringService`/`ResourceScoringService` (ADR-004/ADR-006) already compute confidence/freshness for listing-quality purposes — reusing the *listing* they help produce, rather than reimplementing a member-relevance ranking algorithm on top of them, is the correct application of "reuse," not a missed opportunity to reuse the scoring services directly (they answer a different question: "is this record trustworthy," not "does this record fit this member"). The JSON-parse-with-fallback behavior is a resilience decision, not a test convenience: a malformed or unexpected AI response degrades to a still-useful, deterministic result instead of a 5xx error, and the raw response remains visible in the `AiRequest` audit row for review.

---

### 8. Rate limiting reuses the existing global `ThrottlerModule`, tightened per-route — no new infrastructure

**Decision:** Every mutating/AI-provider-calling endpoint carries a `@Throttle({ default: { limit: 20, ttl: 60_000 } })` (10/min for the costlier Recommendations-generation endpoint) override on top of the platform's existing global 100 req/min `ThrottlerModule` policy (ADR-018/main app bootstrap). No new rate-limiting service, no persisted per-user quota table.

**Rationale:** "Rate limiting" is a named architecture requirement, and the existing pattern to reuse is the platform-wide `ThrottlerModule` already applied to every route — the correct amount of new work is a tighter per-route override on cost-incurring endpoints, not a second rate-limiting mechanism. A persisted daily/monthly spend cap is recorded below as a Future Extension Point should real usage patterns show the coarser in-memory throttle is insufficient.

---

### 9. `NotificationCategory.AI_GUIDANCE` was forward-provisioned in WO-026 — the third proof of that design choice

**Decision:** `RecommendationsService` calls `NotificationsService.notify()` with `category: AI_GUIDANCE` (one notification per `generate()` call, summarizing the count, not one per individual recommendation) — a category value that has existed in the schema since WO-026, unused until now.

**Rationale:** ADR-012 Decision 3 minted `ACADEMY`, `POD`, and `AI_GUIDANCE` speculatively, anticipating exactly this moment. `ACADEMY` was proven by WO-028; `AI_GUIDANCE` is proven here, by a third independently-built domain, again requiring zero schema migration — direct, repeated evidence the "bounded enum, minted ahead of its consumer" design choice was correct, not merely convenient once. One notification per `generate()` call (not per recommendation) follows the same anti-spam judgment call as, e.g., Announcements' fan-out batching — a member asking for recommendations expects one summary, not N separate pings.

---

### 10. No circular module dependency — the AI Engine sits at the top of the dependency graph

**Decision:** `AiModule` imports `AuthGuardsModule`, `AiProviderModule`, `CommunicationModule`, `OpportunitiesModule`, `ResourcesModule`, `JourneysModule`, `GoalsModule`, `MilestonesModule`, `AcademyModule`, `KnowledgeModule`. Nothing imports `AiModule` back.

**Rationale:** Unlike ADR-014 Decision 6 (which had to actively avoid a cycle for Academy/Stewardship/Communication), the AI Engine is a pure consumer of every domain it touches — by construction, since its entire purpose is reading across the platform, not being read from. This is confirmed, not assumed: the compiled application boots cleanly with all nine cross-module imports resolved and zero DI errors (see Operational Verification Report).

---

## Risks

| Risk | Mitigation |
|---|---|
| `OpenAiProvider`/`AnthropicProvider` call real external HTTP APIs that have not been exercised against a live provider in this implementation environment (no outbound network access to a real AI vendor) | Explicitly mirrors WO-023's real-SMTP-untested-here precedent (ADR-009 Known Limitations); `AI_PROVIDER` defaults to `stub`, so every environment without configured credentials — including this one and CI — runs the real code path end-to-end against a deterministic, zero-cost, zero-network stand-in. An operator should perform one live call against each configured provider as part of production deployment verification. |
| Recommendation rationale generation can silently degrade to a generic, non-personalized rationale if the AI's JSON response is malformed | Deliberate resilience decision (Decision 7), not a defect; the raw AI response remains visible in the `AiRequest` audit row for review, and the fallback still selects real, verified candidates — never an empty or broken result. |
| Cost-per-model pricing table (`ai-pricing.util.ts`) is a static snapshot that will drift from providers' actual published pricing over time | Documented as a known-approximate figure for internal cost-tracking/trend purposes, not a billing-accurate ledger; update the table when a provider's pricing changes. |
| Rate limiting is in-memory (`ThrottlerModule`) and per-process, not a persisted per-user spend cap | Consistent with the platform-wide precedent (no domain has a persisted quota system yet); acceptable at V1 traffic, recorded as a Future Extension Point below. |
| Recommendation/insight creation, ref-less writes, and the AiRequest audit log are multiple sequential, non-transactional writes (no `$transaction`) | Consistent with the codebase-wide precedent (ADR-006 §Risks through ADR-014 §Risks); a failure mid-sequence leaves a recoverable partial state, not a corrupted invariant. |

---

## Future Extension Points

- Document Intelligence integration ("uploaded documents through the existing Document Intelligence interfaces as they become available") — explicitly named in the WO as conditional on a domain that does not yet exist; no integration point was built since there is nothing to integrate with yet.
- A persisted per-user/per-organization AI spend cap, if the in-memory `ThrottlerModule` override proves insufficient at real usage volumes (Decision 8).
- Recommendation rationale quality improvements (better prompt engineering, few-shot examples) — the JSON-parse-with-fallback design (Decision 7) means this can be iterated on without any schema or API change.
- Steward-facing AI capabilities (e.g., AI-assisted drafting of Stewardship notes or escalation summaries) — PA-006 names member-facing guidance as the V1 scope; steward-specific tooling was not requested here.
- A real per-provider live-call verification step in a deployment runbook, once real API credentials exist in a target environment (mirrors the WO-023 SMTP Known Limitation).
