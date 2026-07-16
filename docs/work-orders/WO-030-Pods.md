# WO-030 — Pods

| Field | Value |
|---|---|
| Work Order Number | WO-030 |
| Title | Pods (PA-009) |
| Status | Complete |
| Priority | High (the final PA-020-named Version 1 backend domain) |
| Date | 2026-07-16 |

---

## Objective

Implement Pods — Aureus's smallest living communities — per the founder-approved WO-030 Founder Review Specification: ten domain entities, geographic-primary/profile-secondary matching, a proactive-invitation (never automatic-assignment) membership model, institutionally-appointed Pod Stewardship, a four-state operational lifecycle, a conservative-by-default privacy model, and two narrowly-scoped, non-surveillance AI touchpoints — all reusing existing platform patterns (`StewardshipRelationship`'s lifecycle shape, `Conversation`'s N-participant messaging, `StewardshipEscalation`'s confidential-review shape, `AiRecommendation`'s real-FK target model) rather than inventing new ones.

This domain followed a materially different process than every prior Work Order: a dedicated Founder Review specification was produced and walked through 13 numbered decisions, one at a time, with explicit founder approval (several with constitutional amendments) before any code was written. Those 13 decisions are recorded in full in `docs/work-orders/WO-030-Pods-Founder-Review-Specification.md` and are binding design constraints, not merely a starting recommendation.

## Scope

- **Core `Pod`**: lifecycle (`FORMING → ACTIVE ↔ DORMANT → ARCHIVED`), sequence-ref (`AUR-POD-000001`), coarse local-area fields, optional `parentPodId` ("Stewardship Origin" — institutional memory only, never hierarchy).
- **`PodMembership`**: `PENDING/ACTIVE/DECLINED/DEFERRED/ENDED` lifecycle, `MEMBER_REQUEST/AI_MATCH_SUGGESTION/STEWARD_INVITATION/ADMIN_ASSIGNMENT` origins, self-service `leave()`.
- **Pod Steward**: `PodMembership.role = STEWARD`, institutionally appointed only (`setRole`, Admin-gated) — kept structurally distinct from the pre-existing 1:1 `StewardshipRelationship`.
- **`PodEvent`/`PodEventRsvp`**: Steward-created meetings, member RSVPs (visible to peers), Steward-only after-the-fact attendance (never a performance metric).
- **`PodMeetingSchedule`**: informational recurrence pattern; intelligent prefill for the next `PodEvent`, never auto-generation.
- **Pod Messages**: reuses `Conversation`/`Message`/`ConversationParticipant` directly (new `POD` `ConversationType`, nullable `podId`).
- **`PodServiceProject`**: any active member may propose; Steward manages status.
- **`PodRequest`**: `JOIN`/`REASSIGNMENT`/`PROPOSE_NEW_POD` reviewed by the target Pod's Steward/Admin; `LEAVE` resolves immediately (no approval gate).
- **`PodInvitation`**: split-by-type — Home Pod (Steward/Admin only), Interest Pod (any active member).
- **Pod Metrics**: computed-on-read aggregate (attendance rate, membership size, service-project completion, cadence adherence) — no stored per-member data, no `PodMetrics` table.
- **Pod Escalations**: reuses `StewardshipEscalation` directly (dual-target `relationshipId`/`podId`), reframed constitutionally as confidential care-requests; any active Pod member may raise one, including about their own Steward.
- **`Profile` extension**: coarse location, `SeasonOfLife`, profession, availability, preferred language, voluntary faith preference — all optional, member-owned, editable.
- **AI integration**: `PodMembershipsService.suggestHomePod()` (AI-service-account-gated, direct `PodMembership{PENDING}` write, mirrors `recommendSteward`); `RecommendationsService` `POD` category (advisory `AiRecommendation`); `ai/pod-insights/` (Steward-scoped and Admin platform-wide Institutional Wisdom, minimum-Pod-count threshold).
- Full Swagger documentation (`pods` tag).
- Unit and end-to-end automated tests.

## Out of Scope

Per WO-030 Founder Review Specification §11 (Non-Goals), several items are **explicitly and permanently** out of scope, not merely deferred:
- Continuous or background AI monitoring of any kind — a constitutional boundary (Article VI), not a V1-scoping choice.
- Real geospatial (PostGIS) matching — a platform-wide Post-Launch Candidate, shared with Opportunities/Resources.
- A structured weekly-availability grid — free-text `availabilityNotes` is the V1 shape.
- Auto-generated recurring `PodEvent`s — intelligent prefill only (Founder Decision #10).
- Member nomination/election workflows for Pod Steward selection — Institutional Appointment exclusively (Founder Decision #2).
- Rich meeting-facilitation tooling (agendas-as-data, live note-taking) — OAS-OPS-104 is a human facilitation script, not a feature backlog.
- Concrete Academy↔Pods features — a named Future Integration Vision (Founder Decision #12), not a V1 deliverable.
- Knowledge System publication of Institutional Wisdom findings.

## Dependencies

- WO-011/ADR-011 (Stewardship System) — supplies `StewardshipRelationship`'s lifecycle-join shape (reused for `PodMembership`) and `StewardshipEscalation` (reused directly for Pod escalations).
- WO-026/ADR-012 (Communication System) — supplies `Conversation`/`Message` (reused directly for Pod messaging) and the forward-provisioned `NotificationCategory.POD`.
- WO-029/ADR-015 (AI Intelligence Engine) — supplies `AiRequestsService.runCompletion()`, `AiRecommendation`'s real-FK-per-target-type shape, and the "AI recommends, never assigns" precedent.
- WO-022 (Profile) — extended, not replaced, with Pods matching signals.

## Source Documents

- OAS-ACA-009 — Pods (constitutional, 13 Articles)
- PA-009 — Pods Architecture
- OAS-OPS-010 — Pod Operations Framework
- OAS-OPS-104 — Pod Meeting Standard Operating Procedure
- `docs/work-orders/WO-030-Pods-Founder-Review-Specification.md` — the approved specification this WO implements
- ADR-011 — Stewardship System
- ADR-012 — Communication System
- ADR-015 — AI Intelligence Engine
- ADR-016 — Pods (this domain's own engineering-decision record)

## Deliverables

- ADR-016 — Pods
- `apps/api/src/pods/**` (module, ten sub-domains' services/controllers/repositories/DTOs, matching service, unit + e2e tests)
- `apps/api/src/ai/pod-insights/**` (Institutional Wisdom sub-domain)
- Extensions to `apps/api/src/users/profile/**`, `apps/api/src/communication/messaging/**`, `apps/api/src/stewardship/escalations/**`, `apps/api/src/ai/recommendations/**`
- Prisma migrations `add_pods_domain`, `add_pod_location`
- `docs/verification/WO-030-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `prisma/migrations/20260715190000_add_pods_domain/`, `prisma/migrations/20260716000000_add_pod_location/`
- `apps/api/src/pods/pods.{module,controller,service,e2e.spec}.ts`, `pods.service.spec.ts`
- `apps/api/src/pods/common/{pods-roles.util,pod-authorization.service}.ts`
- `apps/api/src/pods/repositories/{pod.repository.interface,prisma-pod.repository}.ts`
- `apps/api/src/pods/dto/{create-pod,update-pod,list-pods-query,pod-response,paginated-pods-response}.dto.ts`
- `apps/api/src/pods/matching/pod-matching.service.ts` (+ spec)
- `apps/api/src/pods/memberships/{pod-memberships.controller,pod-memberships.service}.ts` (+ spec), `dto/{membership-response,respond-to-membership,suggest-home-pod,set-role}.dto.ts`, `repositories/{pod-membership.repository.interface,prisma-pod-membership.repository}.ts`
- `apps/api/src/pods/events/{pod-events.controller,pod-events.service}.ts` (+ spec), `dto/{create-event,update-event,rsvp,mark-attendance,event-response}.dto.ts`, `repositories/{pod-event.repository.interface,prisma-pod-event.repository}.ts`
- `apps/api/src/pods/meeting-schedule/{pod-meeting-schedule.controller,pod-meeting-schedule.service}.ts` (+ spec), `dto/{upsert-schedule,schedule-response}.dto.ts`, `repositories/{pod-meeting-schedule.repository.interface,prisma-pod-meeting-schedule.repository}.ts`
- `apps/api/src/pods/service-projects/{pod-service-projects.controller,pod-service-projects.service}.ts` (+ spec), `dto/service-project.dto.ts`, `repositories/{pod-service-project.repository.interface,prisma-pod-service-project.repository}.ts`
- `apps/api/src/pods/requests/{pod-requests.controller,pod-requests.service}.ts` (+ spec), `dto/request.dto.ts`, `repositories/{pod-request.repository.interface,prisma-pod-request.repository}.ts`
- `apps/api/src/pods/invitations/{pod-invitations.controller,pod-invitations.service}.ts` (+ spec), `dto/invitation.dto.ts`, `repositories/{pod-invitation.repository.interface,prisma-pod-invitation.repository}.ts`
- `apps/api/src/pods/metrics/{pod-metrics.controller,pod-metrics.service}.ts` (+ spec), `dto/pod-metrics-response.dto.ts`
- `apps/api/src/pods/escalations/{pod-escalations.controller,pod-escalations.service}.ts` (+ spec)
- `apps/api/src/pods/messages/{pod-messages.controller,pod-messages.service}.ts`
- `apps/api/src/ai/pod-insights/{pod-insights.controller,pod-insights.service}.ts` (+ spec)
- `docs/architecture/ADR-016-Pods.md`
- `docs/work-orders/WO-030-Pods.md` (this file)
- `docs/work-orders/WO-030-Pods-Founder-Review-Specification.md` (produced earlier in this WO's process, now the canonical Founder Review record)
- `docs/verification/WO-030-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `prisma/schema.prisma` — `Pod`, `PodMembership`, `PodEvent`, `PodEventRsvp`, `PodMeetingSchedule`, `PodServiceProject`, `PodRequest`, `PodInvitation` models; `PodType`, `PodStatus`, `PodMemberRole`, `PodMembershipStatus`, `PodMembershipOrigin`, `PodEventType`, `PodEventStatus`, `RsvpResponse`, `MeetingCadence`, `ServiceProjectStatus`, `PodRequestType`, `PodRequestStatus`, `PodInvitationStatus`, `SeasonOfLife` enums; `Profile` extended with ten matching-signal fields; `Conversation` extended with `podId`/`POD` type; `StewardshipEscalation` extended with nullable `podId` (and `relationshipId` made nullable); `AiRecommendation` extended with `podId`; `AiCapability` extended with `POD_INSIGHT`; back-relations on `User`.
- `apps/api/src/app.module.ts` — registers `PodsModule`.
- `apps/api/src/main.ts` — Swagger `pods` tag.
- `apps/api/src/users/profile/**` — `ProfileResponseDto`/`UpdateProfileDto`/`profile.repository.interface.ts` extended with the ten Pods matching-signal fields; `ProfileModule` now exports `PROFILE_REPOSITORY`.
- `apps/api/src/communication/messaging/**` — `ConversationsService.startPodConversation()`; repository interface/impl gained `podId`/`findByPodId`; `CommunicationModule` now exports `ConversationsService`.
- `apps/api/src/stewardship/escalations/**` — repository interface/impl gained `podId`/`findByPod`; `EscalationResponseDto` made `relationshipId` nullable and added `podId`; `StewardshipModule` now exports `STEWARDSHIP_ESCALATION_REPOSITORY`.
- `apps/api/src/ai/recommendations/**` — `RecommendationCategory.POD`; `AiRecommendation` repository/DTO gained `podId`; `RecommendationsService` gained a `PodMatchingService` dependency and a `POD` candidate-fetching/target-field branch.
- `apps/api/src/ai/ai.module.ts` — imports `PodsModule`; registers `PodInsightsController`/`PodInsightsService`.
- `apps/api/src/ai/prompts/system-prompts.util.ts` — `buildPodStewardInsightPrompt()`, `buildPodInstitutionalWisdomPrompt()`.
- `docs/releases/version-1-readiness.md` — WO-030 marked complete, Pods moved off the Remaining Backend Domains list, scores recomputed.

## Database Changes

Two migrations. `add_pods_domain`: eight new tables, thirteen new enums, additive columns on `Profile`/`Conversation`/`StewardshipEscalation`/`AiRecommendation`, one new `AiCapability` value, one new `ConversationType` value. `add_pod_location`: four additive coarse-location columns on `Pod` (discovered necessary during implementation — see ADR-016 Decision 1). No changes to any existing table's primary data; `StewardshipEscalation.relationshipId` moved from `NOT NULL` to nullable (backward-compatible — every existing row already had a non-null value).

## API Changes

New: `POST/GET /pods`, `GET /pods/by-ref/:ref`, `GET/PATCH /pods/:id`, `POST /pods/:id/{activate,mark-dormant,archive}`, `POST /pods/memberships/suggest-home-pod`, `GET /pods/memberships/mine`, `GET /pods/:podId/memberships`, `POST /pods/memberships/:id/{respond,leave,role}`, `GET/POST /pods/:podId/events`, `GET /pods/:podId/events/prefill-defaults`, `GET/PATCH /pods/events/:id`, `POST /pods/events/:id/{cancel,complete,rsvp,attendance}`, `GET /pods/events/:id/rsvps`, `GET/PUT /pods/:podId/meeting-schedule`, `GET/POST /pods/:podId/service-projects`, `PATCH /pods/service-projects/:id[/status]`, `POST /pods/requests`, `GET /pods/requests/{mine,for-pod/:podId}`, `POST /pods/requests/:id/{withdraw,decide}`, `POST /pods/:podId/invitations`, `GET /pods/invitations/mine`, `POST /pods/invitations/:id/respond`, `GET /pods/:podId/metrics`, `GET/POST /pods/:podId/escalations`, `POST /pods/:podId/conversation`, `GET /ai/pod-insights[/:podId]`.

## Security Requirements

- All Pods endpoints require `JwtAuthGuard`; every write derives the caller's identity from the JWT.
- `PodAuthorizationService` centralizes "this Pod's Steward or Admin" / "an active member of this Pod or Admin" checks — every sub-domain service uses it rather than re-deriving role logic.
- `suggestHomePod()` is gated to `AI_SERVICE_ACCOUNT`/Admin only — verified by e2e test that a regular member receives 403.
- Home Pod invitations are Steward/Admin-only; Interest Pod invitations are any-active-member — verified by e2e test in both directions.
- Attendance marking is Steward-only; the upcoming-RSVP read path never returns the `attended` field — verified by unit test asserting the response shape.
- Pod escalations are readable by the target Pod's Steward/Admin only — verified by e2e test that a fellow member (not the Steward) receives 403.
- Pod metrics are readable by the target Pod's Steward/Admin only, and return no per-member breakdown — verified by e2e test asserting the response has no `members` key.
- Pod-conversation start requires current `ACTIVE` membership — verified by e2e test that a non-member receives 403.
- `PodInsightsService.generatePlatformWide()` is Admin-only and enforces a minimum-Pod-count threshold before generating any cross-Pod aggregate — verified by unit test.

## Testing Requirements

- Unit: 12 spec files (73 tests) across every Pods sub-domain plus `ai/pod-insights` and the extended `ai/recommendations` spec, covering every constitutional invariant from the 13 Founder Decisions (never-auto-assign, split-by-type invitations, self-service leave, institutional-appointment-only Steward promotion, RSVP-visible/attendance-hidden, escalation confidentiality and any-member-may-raise, proposer-never-auto-Steward, deterministic proximity-dominant scoring, minimum-Pod-count threshold).
- End-to-end: `pods.e2e.spec.ts` (25 tests) — full HTTP lifecycle via Supertest against a booted application and real PostgreSQL: unauthenticated rejection, Pod creation and Institutional Appointment of a Steward, split-by-type invitation enforcement, meeting schedule + event + RSVP + attendance with visibility boundaries verified, service-project proposal by a non-Steward, escalation confidentiality (including a member raising a concern about their own Steward), metrics access restriction, Pod messaging membership enforcement, AI-service-account-gated match suggestion, self-service leave, and the full `PROPOSE_NEW_POD` approval flow confirming the proposer is never auto-appointed Steward.

## Acceptance Criteria

- [x] An unauthenticated caller cannot access any Pods endpoint (401).
- [x] A Home Pod invitation is always proactive and `PENDING`, never an automatic `ACTIVE` assignment; the member may accept, decline, or defer.
- [x] Pod Steward appointment is Admin-only (Institutional Appointment) in every path, including a newly-approved `PROPOSE_NEW_POD` request — the proposer is never automatically appointed.
- [x] Home Pod invitations may only be issued by the target Pod's Steward or an Admin; Interest Pod invitations may be issued by any active member.
- [x] Any active Pod member — not only the Steward — may raise an escalation, including about the Steward's own conduct; escalations are visible only to the Steward/Admin, never the general membership.
- [x] Upcoming RSVPs are visible to fellow Pod members; historical attendance is visible only to the member themselves, the Steward, and Admins, and is never exposed as a performance metric.
- [x] `PodMeetingSchedule` never auto-generates a `PodEvent`; the Steward always creates each meeting, with prefill data offered as a convenience only.
- [x] A member may leave a Pod immediately, with no approval gate.
- [x] Pod metrics are computed on read, Pod-level only, with no per-member breakdown ever returned.
- [x] AI Pod Match Suggestion candidates always come from the deterministic scoring function; the AI Engine never itself decides Pod membership.
- [x] Institutional Wisdom insight generation reads only Pod-level aggregate metrics — never message content, individual RSVP/attendance records, or `faithPreference` — and the platform-wide report requires a minimum-Pod-count threshold before generating.
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest` (full monorepo suite), `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification confirms the compiled application boots with zero DI errors and all Pods/pod-insights routes registered against a running database.

## Definition of Done

Met — see `docs/verification/WO-030-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- The deterministic matching algorithm (§2.3) scores proximity and language directly from `Pod`/`Profile` fields; it does not yet incorporate `UserInterest`, `Goal`, `seasonOfLife`, or `profession` as additional secondary signals — the spec's full secondary-signal list (§2.2) is implemented as Profile data but not all fields are yet wired into the scoring function itself. A reasonable, documented scope trim given the primary (geographic) signal was the constitutional priority; extending the scorer is additive, not a redesign.
- `Pod.city`/`region`/`stateProvince`/`country` (the Pod's own coarse local area) were added during implementation rather than specified in the original Founder Review document — see ADR-016 Decision 1. The specification document itself has not been retroactively updated to mention this field; this completion document and ADR-016 are the authoritative record.
- Real geospatial (PostGIS) matching, structured availability grids, auto-generated recurring events, and Steward election workflows remain explicitly out of scope, per §11 of the specification.
- `PodMembershipOrigin` does not distinguish a Steward-sent invitation from a peer-sent Interest Pod invitation at the schema level (both land as `STEWARD_INVITATION`) — see ADR-016 Decision 8; the precise inviter is still recoverable via `PodInvitation.invitedById`.
- No automated job marks a Pod `DORMANT` when its `dormancyThresholdDays` elapses — the column exists and the `markDormant()` action exists, but nothing currently calls it on a schedule (no background-job infrastructure exists anywhere in the platform yet, consistent with every prior domain's Known Limitations).

## Recommended Next Work Order

All twelve PA-020-named Version 1 backend domains are now complete. See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
