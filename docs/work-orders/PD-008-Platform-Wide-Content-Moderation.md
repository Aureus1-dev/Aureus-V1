# PD-008 — Platform-Wide Content Moderation & Trust/Safety

**Status:** Complete for the scope defined below (Task 1.3, Engineering Master Execution Plan).

**Source:** `docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md` §PD-008; `docs/engineering/ENGINEERING-MASTER-EXECUTION-PLAN.md` Task 1.3 (Milestone 1 — Pilot Safety).

---

## Objective

Abusive or harmful user-generated content (outside the AI system, which PD-007 already covers) can be removed, and stored free-text is not a stored-XSS vector — per PD-000's own framing.

## What was already done (found during review, not re-done here)

PD-001 ("Input validation & stored-content sanitization") already shipped `sanitizePlainText()` (`common/utils/sanitize-text.ts`, wrapping the real `sanitize-html` package) and applied it to Pod/Steward messages, Announcement title/body, Stewardship note content, and Knowledge article title/summary/content. PD-000's original PD-008 scope text ("No HTML/rich-text sanitization exists anywhere in the backend... zero hits") was written before PD-001 landed and is stale — confirmed directly by reading `conversations.service.ts`, `announcements.service.ts`, `stewardship-notes.service.ts`, and `knowledge.service.ts` before starting this task, per this session's standing instruction to identify existing implementations before proposing new ones.

The one part of PD-008's original scope genuinely not yet built: **`PodMessagesController` exposed only `@Post()` — no delete or report endpoint existed for Pod messages at all**, and no admin/steward moderation queue existed anywhere. That gap is what this task closes.

## What was built

- **Message delete** (`DELETE /communications/conversations/:id/messages/:messageId`) — the sender may delete their own message; a Platform/System Administrator may delete any message, in any conversation type (Stewardship, Organization, or Pod). Soft-delete via the `Message.deletedAt`/`deletedById` fields — `deletedAt` already existed in the schema (added when the Communication System shipped, unused until now); only `deletedById` is new. `findByConversation()` already filtered `deletedAt: null`, so a deleted message simply stops appearing in any listing with zero additional query changes.
- **Message report** (`POST /communications/conversations/:id/messages/:messageId/report`) — any participant in a conversation may report a message. Creates a new `MessageReport` row (`reason` sanitized via the same `sanitizePlainText()`, `status: OPEN`).
- **Platform-wide moderation queue** (`GET /communications/conversations/moderation/reports`, `PATCH /communications/conversations/moderation/reports/:reportId`) — Administrator-only; lists every OPEN report across all conversation types and resolves/dismisses one.
- **Pod-Steward-scoped moderation** (`DELETE /pods/:podId/conversation/messages/:messageId`, `GET /pods/:podId/conversation/reports`) — matches PD-008's own acceptance criterion ("a steward/admin can remove any Pod message and see a reported-content queue") precisely. Implemented as a thin Pods-domain wrapper that performs its own `PodAuthorizationService.assertStewardOrAdmin()` check, then delegates to two new **trusted-caller** methods on `ConversationsService` (`moderatorDeleteMessage()`, `findReportsForPod()`) that perform no authorization check of their own — mirroring the internal-service-call precedent already recorded in `docs/work-orders/PD-001-Production-Foundation.md` §4, and required because Communication does not depend on Pods (one-way dependency, unchanged by this work).
- **`MessageReport` deliberately kept separate from `StewardshipEscalation`** — an escalation is a confidential request for additional stewardship support and is never an accusation (Founder Decision #4, `pod-escalations.service.ts`); a message report is exactly that, an accusation about specific content. Blurring the two would have violated an existing Founder Decision.
- **Sanitization gap-closure across the rest of the Pods domain** — PD-001's own sanitization pass covered Pod *messages* (via Communication) but not Pods' own domain-native free-text fields. Applied `sanitizePlainText()` (the same, already-tested utility — no new sanitization logic) to: `Pod.name`/`shortDescription`/`fullDescription` (create + update), `StewardshipEscalation`/`PodEscalation` `title`/`description`, `PodRequest.proposedPodName`/`proposedPodDescription`/`reason`, `PodInvitation.message`, and `PodServiceProject.title`/`description` (create + update). These are all member-authored, group-visible free text — the same risk class PD-008 targets — and each was a one-line addition using the existing utility, not new logic.

## Explicitly not touched (residual gaps, named rather than silently left)

- **`PodEvent.title`/`description`/`location`** — Steward/Admin-authored only (`assertStewardOrAdmin` gates creation), lower risk than member-authored content, and out of this pass's time budget. Recommended as a trivial follow-up (same pattern, same utility).
- **Goals/Journeys/Milestones/Tasks, Profile bio, Resources/Organizations/Opportunities/Academy descriptions** — personal (single-owner-visible) or already gated behind the existing steward/admin verification workflow, not the "platform-wide, group-visible, member-authored content" class PD-008's own scope targets. Not sanitized in this pass; flagged as a broader, separate follow-up if this repo later decides sanitization should be universal rather than risk-scoped.
- **Pod-Steward resolving (not just viewing) a report** — PD-008's acceptance criterion says a steward/admin can "see" the reported-content queue; resolving is Administrator-only in this increment. Extending resolution to a Pod's own Steward would reuse the identical trusted-caller pattern already established here, if wanted later.

## Files changed

- `prisma/schema.prisma` (+migration `20260725163002_add_message_moderation` — additive `Message.deletedById`, new `MessageReport` model, new `MessageReportStatus` enum)
- `apps/api/src/communication/messaging/conversations.service.ts` (`deleteMessage`, `moderatorDeleteMessage`, `reportMessage`, `listReportsForAdmin`, `findReportsForPod`, `resolveReport`)
- `apps/api/src/communication/messaging/conversations.controller.ts` (new routes)
- `apps/api/src/communication/messaging/dto/{report-message,resolve-report,message-report-response}.dto.ts` (new), `message-response.dto.ts` (extended with `deleted`)
- `apps/api/src/communication/messaging/repositories/{message-report.repository.interface,prisma-message-report.repository}.ts` (new), `message.repository.interface.ts`/`prisma-message.repository.ts` (extended: `findById`, `softDelete`)
- `apps/api/src/communication/communication.module.ts` (registered `MESSAGE_REPORT_REPOSITORY`)
- `apps/api/src/pods/messages/{pod-messages.service,pod-messages.controller}.ts` (Pod-Steward moderation wrapper)
- Sanitization: `apps/api/src/pods/pods.service.ts`, `apps/api/src/pods/escalations/pod-escalations.service.ts`, `apps/api/src/stewardship/escalations/stewardship-escalations.service.ts`, `apps/api/src/pods/requests/pod-requests.service.ts`, `apps/api/src/pods/invitations/pod-invitations.service.ts`, `apps/api/src/pods/service-projects/pod-service-projects.service.ts`
- `apps/web/lib/api/messages.ts` (extended `MessageDto`/added `MessageReportDto`, `deleteMessage()`/`reportMessage()` client functions — no UI wired yet, matching this file's own documented convention that conversation-creation and now message-moderation actions are "a documented follow-up" until a Messages UI need arises)

## Security considerations

- Authorization for `deleteMessage`/`reportMessage` is embedded in the service (not only the controller), consistent with this codebase's dominant convention (`assertParticipant`, `hasRole` checks throughout `ConversationsService`).
- `moderatorDeleteMessage`/`findReportsForPod` intentionally perform no independent authorization check — they are not reachable from any controller directly; only `PodMessagesService`, which performs its own check first, calls them. This is a deliberate, narrow trust boundary, not an oversight, and is documented in-code at both ends.
- Report `reason` is sanitized identically to every other free-text field in this codebase (`sanitizePlainText`), closing the same stored-XSS class PD-001 already addressed elsewhere.
- Soft-delete preserves the row (and any associated `MessageReport`) for later Administrator/Steward review — deletion never destroys the evidence a report might depend on.

## Testing strategy

- Unit tests (Jest, mocked repositories): `conversations.service.spec.ts` (+13 new tests: delete/moderator-delete/report/admin-queue/pod-queue/resolve, covering authorization and delegation), new `pod-messages.service.spec.ts` (6 tests: roster delegation, Steward/Admin delete-any, Steward/Admin report-queue, and the ordinary-member rejection paths), plus one sanitization test added to each of `pods.service.spec.ts`, `pod-escalations.service.spec.ts`, `stewardship-escalations.service.spec.ts`, `pod-requests.service.spec.ts`, `pod-invitations.service.spec.ts`, `pod-service-projects.service.spec.ts` (an XSS-payload string in, sanitized string persisted — per PD-008's own acceptance criterion, "verified by a new test per affected domain").
- e2e tests (real Postgres-backed app): extended `communication.e2e.spec.ts` (own-message delete, cross-member delete forbidden, Administrator delete-any, report + sanitized reason, non-admin forbidden from the queue, Administrator sees and resolves the report) and `pods.e2e.spec.ts` (ordinary member forbidden from deleting another member's Pod message, Pod Steward can delete it, a report on a Pod message appears in that Pod's own queue for its Steward, an ordinary member is forbidden from that queue).

## Validation

- `npx tsc --noEmit`, `npx eslint src --max-warnings=0`, `npx nest build`, `npx prisma validate` — all clean.
- Backend: full suite (`AI_PROVIDER=stub npx jest`, matching this session's established convention for this sandbox's blocked `api.openai.com` egress) — **125 suites, 1334 tests, 1327 passing**, the same 7 pre-existing, unrelated Voice Domain failures documented throughout this session (confirmed by exact test-name diff — zero new failures).
- Frontend: `npx tsc --noEmit`, `npx next lint`, `npx jest` (107 suites, 573 tests, all passing), `npx next build` (37 routes, no errors).

## Production risk addressed

Was **High** (PD-000's own rating) — no member or Steward could remove abusive content posted in a Pod, and no admin visibility into reported content existed anywhere. Now closed for every conversation type (Stewardship, Organization, Pod), with Pod-specific Steward authority matching PD-008's own acceptance criterion exactly.
