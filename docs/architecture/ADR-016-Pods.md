# ADR-016 — Pods

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-16 |
| Work Order | WO-030 |
| Authority | PA-009, OAS-ACA-009, OAS-OPS-010, OAS-OPS-104, ADR-003, ADR-006, ADR-009, ADR-011, ADR-012, ADR-014, ADR-015 |

---

## Context

Pods (PA-009) is the twelfth and final PA-020-named Version 1 backend system. Unlike every prior domain, its engineering design was preceded by a full Founder Review: a dedicated specification (`docs/work-orders/WO-030-Pods-Founder-Review-Specification.md`) was produced, then walked through founder-by-founder across 13 numbered decisions before any code was written. Those 13 decisions — and the constitutional principles the founder attached to several of them — are the primary source of truth for this domain's design and are treated as binding architectural precedent, not merely product choices. This ADR records the *engineering* decisions made while implementing that already-approved specification, including several implementation-level refinements discovered only once real schema and service code was written.

OAS-ACA-009's Article I frames the entire domain: "They do not exist to manage people. They exist to care for people." Every decision below was tested against that standard, and against the founder's explicit non-negotiable: the AI Engine must never monitor members.

---

## Decisions

### 1. Coarse location lives on both `Pod` and `Profile`, not `Profile` alone

**Decision:** In addition to the member-facing coarse location fields Founder Decision #8 added to `Profile` (city/region/stateProvince/country/localAreaDescription), `Pod` itself gained the same four structured fields (no `localAreaDescription`, since a Pod's "local area" is set by its Steward/Admin, not narrated in the member's own words).

**Rationale:** This was a gap discovered during implementation, not part of the original specification draft or the Founder Review conversation — Decision 8 approved coarse *member* location, but the deterministic matching algorithm (§2.3) has nothing to compare a member's location against unless a Home Pod also carries its own coarse locale. Adding it is a direct, mechanical consequence of the already-approved decision, not a new product choice: without it, "primary signal: geographic proximity" would have had no primary signal to compute. Caught by re-reading the matching service's own logic before writing it, not by a test failure.

---

### 2. Two distinct entry points for AI-Pod interaction, mirroring two distinct existing precedents

**Decision:** Pod matching surfaces through the AI Engine in two separate, independently-authorized mechanisms:
- `PodMembershipsService.suggestHomePod()` — an `AI_SERVICE_ACCOUNT`-gated endpoint that directly creates a `PodMembership{PENDING, AI_MATCH_SUGGESTION}` row. This mirrors `StewardshipRelationshipsService.recommendSteward()` (ADR-011) exactly: no `AiRecommendation` row involved, just a role-gated direct write.
- `RecommendationsService` (AI module) gained a `POD` category, producing an `AiRecommendation{podId}` row with an AI-written rationale — the same advisory, dismissible shape as `OPPORTUNITY`/`RESOURCE`/`COURSE`.

**Rationale:** The WO-030 specification's prose ("§7.1 extends RecommendationsService") could be read as implying a single mechanism. Reading the actual precedent it's supposed to extend clarified that Stewardship already has *two* AI-adjacent patterns for a reason: a direct, role-gated "AI proposes a real record" path for the platform's proactive-outreach cases, and a separate advisory "AI writes a rationale for something a member asked about" path. Both are needed here for the same reasons they're needed for Stewardship. Both call the same underlying `PodMatchingService.rankCandidates()` — one scoring function, two entry points, no duplicated matching logic.

---

### 3. `PodMatchingService` lives in the Pods module; `AiModule` imports `PodsModule`, never the reverse

**Decision:** `PodsModule` has no dependency on `AiModule`. `AiModule` adds `PodsModule` to its own `imports` array (alongside `AcademyModule`, `OpportunitiesModule`, etc.) so `RecommendationsService` can call `PodMatchingService`, and a new `ai/pod-insights/` sub-domain can call `PodsService`/`PodMetricsService`.

**Rationale:** The original specification's §8 stated the dependency arrow as "Pods depends on AI, not AI depends on Pods" — but the actual, already-established codebase pattern (confirmed by reading `AiModule`, which imports six domain modules and is imported by none) is the opposite direction: AI always imports the domains it reads from, and no domain ever imports AI. Preserving the *real* pattern (AI sits at the top of the module graph, ADR-015 Decision 10) was judged more valuable than preserving the specification's literal wording, since both achieve the same "no circular dependency" outcome the spec was actually protecting.

---

### 4. Escalation authorization lives in a new `PodEscalationsService`, not in `StewardshipEscalationsService`

**Decision:** `StewardshipEscalationsService` was left almost untouched (its repository gained `podId` support and `findByPod()`). A new, thin `PodEscalationsService` in the Pods module injects `STEWARDSHIP_ESCALATION_REPOSITORY` directly (now exported from `StewardshipModule`) and implements its own Pod-membership-aware authorization (`assertActiveMemberOrAdmin` to raise, `assertStewardOrAdmin` to read).

**Rationale:** Founder Decision #4 requires "any Pod member may raise an escalation" — a check that depends on `PodMembership`, something `StewardshipModule` has no reason to know about. Rather than have `StewardshipModule` import `PodsModule` (the wrong dependency direction — Stewardship is a foundational domain many others depend on) or duplicate the `StewardshipEscalation` table, the repository interface itself became the reuse seam: both domains write to and read from the same table through the same interface, but each applies its own domain-appropriate authorization. This is the same shape of reuse `ConversationsService.startPodConversation()` uses for messaging (below) — share the data layer, keep authorization local to the domain that understands the relevant roles.

---

### 5. Pod messaging reuses `Conversation`/`Message` via a new `ConversationsService.startPodConversation()` method, with the Pods domain resolving the participant roster

**Decision:** `ConversationsService` (Communication module) gained one new method that trusts a participant-ID list passed in by its caller, rather than querying `PodMembership` itself. A new `PodMessagesService` (Pods module) resolves the current `ACTIVE` roster via `POD_MEMBERSHIP_REPOSITORY` and passes it to `conversations.startPodConversation()`.

**Rationale:** `CommunicationModule` does not depend on `PodsModule` (confirmed: it depends on nothing Pods-related today), and adding that dependency to satisfy one method would be a new coupling in the wrong direction for a domain nearly every other domain already depends on. Passing the resolved roster as a parameter keeps `Communication` fully decoupled from `Pods` while still fulfilling ADR-012 Decision 8's own forward-declaration that `ConversationParticipant`'s N-ary shape was "additive, not a redesign" for this exact moment.

---

### 6. "At most one ACTIVE and one PENDING membership per (Pod, user)" is a service-layer invariant, not a database constraint

**Decision:** `PodMembership` has no `@@unique([podId, userId, status])` constraint. The original specification draft included one; it was dropped before the schema was finalized.

**Rationale:** A unique constraint on `(podId, userId, status)` would incorrectly block a member's second `ENDED` cycle — join, leave, rejoin, leave again produces two rows with `status: ENDED` for the same `(podId, userId)` pair, which the constraint would reject. `StewardshipRelationship` (ADR-011), which has the identical "one active pairing across a full history of superseded rows" shape, has no such constraint either — it enforces the "at most one ACTIVE" rule in the service layer (`assertHoldsStewardRole`-style checks before creating a new row), and `PodMembership` follows the same precedent. Caught by tracing through the reassignment/reinvitation flow before writing the migration, not by a failing test.

---

### 7. `LEAVE` resolves immediately; `PodRequest{type: LEAVE}` exists for the record, not as a review gate

**Decision:** `PodRequestsService.create()` special-cases `LEAVE`: it ends the caller's `ACTIVE` membership synchronously and persists the `PodRequest` as already `APPROVED` (`decidedById: null`), rather than leaving it `PENDING` for a Steward to decide like `JOIN`/`REASSIGNMENT`.

**Rationale:** Article VIII is explicit — "Belonging shall never become imprisonment" — and gating *leaving* behind someone else's approval would be a structural violation of that principle no matter how routine the approval was expected to be in practice. `JOIN` benefits from Steward awareness (community health, capacity); leaving does not need anyone's permission. Keeping `LEAVE` as a `PodRequestType` (rather than removing it from the enum) preserves one uniform request-history view for the member while making the constitutional distinction real in the code path, not just in a comment.

---

### 8. `PodInvitation`-created memberships use `origin: STEWARD_INVITATION` regardless of who actually sent the invitation

**Decision:** `PodMembershipOrigin` was not extended with a fifth "peer invitation" value for Interest Pod invitations sent by a regular member (Founder Decision #3's split-by-type model). Both Steward-sent Home Pod invitations and member-sent Interest Pod invitations land as `origin: STEWARD_INVITATION` once accepted.

**Rationale:** The enum name is an acceptable minor imprecision, not a data-integrity issue — `origin` exists to distinguish *mechanism* (an invitation was extended and accepted, vs. a member requested to join, vs. AI suggested it, vs. an Admin assigned it directly), and "was invited by someone" is the mechanism regardless of the inviter's role. `PodInvitation.invitedById` already carries the precise "who invited" audit trail; duplicating that distinction into the membership-lifecycle enum would be new schema surface for information the invitation row already holds. Revisit only if a future feature needs to query memberships by inviter-role directly at the database level.

---

### 9. `PodMetrics` has two read paths — an authorized one and an internal one — never a third, unauthenticated public one

**Decision:** `PodMetricsService` exposes `getForPod(podId, caller)` (enforces Steward-of-Pod/Admin via `PodAuthorizationService`) and `computeRaw(podId)` (no authorization, same computation). Only `PodInsightsService` (AI module, itself gated per-caller) calls `computeRaw()`.

**Rationale:** The Institutional Wisdom cross-Pod report (§7.2) needs to read every Pod's aggregate metrics in one pass, which doesn't fit the single-Pod, single-Steward authorization shape of `getForPod()`. Rather than have `PodInsightsService` re-derive metrics itself (duplicating `PodMetricsService`'s computation) or call `getForPod()` in a loop with a synthetic all-powerful caller (a foot-gun — a future refactor could accidentally make that path reachable from an under-privileged caller), `computeRaw()` makes the "no authorization here, caller beware" contract explicit in the method name and doc comment, with exactly one, already-gated caller.

---

## Summary of Reuse (no new patterns introduced)

| Pattern | Prior ADR | Applied to |
|---|---|---|
| Layered architecture | ADR-003 | Every Pods sub-domain |
| Sequence-ref (`AUR-POD-000001`) | ADR-006 | `Pod` |
| Real-FK relationship lifecycle, never rewritten | ADR-011 | `PodMembership` |
| AI recommends via direct role-gated write, never auto-assigns | ADR-011 (`recommendSteward`) | `PodMembershipsService.suggestHomePod` |
| AI recommends via advisory `AiRecommendation` row | ADR-015 | `RecommendationsService` POD category |
| N-participant conversation, pre-declared extension point | ADR-012 Decision 8 | Pod messaging |
| Forward-provisioned `NotificationCategory` | ADR-012 Decision 3 | `NotificationCategory.POD` |
| Configurable limit as a column default | ADR-011 Decision 4 | `Pod.capacity`, `dormancyThresholdDays` |
| AI sits at the top of the module graph | ADR-015 Decision 10 | `AiModule` imports `PodsModule` |
| One completion call, one audit row | ADR-014 Decision 7, ADR-015 Decision 3 | `PodInsightsService` |
