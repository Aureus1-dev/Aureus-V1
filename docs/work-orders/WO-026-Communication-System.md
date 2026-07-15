# WO-026 — Communication System

| Field | Value |
|---|---|
| Work Order Number | WO-026 |
| Title | Communication System (PA-015) |
| Status | Complete |
| Priority | High (next canonical backend domain in founder-directed backend-before-frontend sequencing) |
| Date | 2026-07-15 |

---

## Objective

Implement the Version 1 Communication System as one production-ready backend domain — notifications, communication preferences, announcements, and direct/contextual messaging — reusing WO-023's transactional email infrastructure rather than duplicating it, and designed so every current and future domain (Stewardship, Business Portal, Opportunity Engine, Resource Directory, Journey Engine, and — once built — Pods, Academy/Steward Content Studio, Document Intelligence, Knowledge System, AI Intelligence Engine) can send communications through it without building a parallel system.

## Scope

- **Notifications**: in-app notifications with category/type classification, read/unread state, mark-one/mark-all-read, archival, pagination/filtering/sorting, recipient-ownership enforcement. A public `NotificationsService.notify()` integration method for other domains, idempotent via an optional `dedupeKey`.
- **Notification preferences**: per-user, per-category in-app/email channel toggles with secure defaults (both enabled), a non-disableable `SYSTEM` category, and a stored (not-yet-enforced) digest/quiet-hours foundation.
- **Announcements**: `PLATFORM`/`ORGANIZATION`/`ROLE`/`STEWARD_MEMBERS` audience scopes, each with its own authorization and audience-resolution rule; draft → publish → archive lifecycle; publish fans out one notification per resolved recipient; `isCritical` bypasses recipient preference filtering for the in-app channel.
- **Messaging**: `STEWARDSHIP` (member ↔ their assigned steward, 1:1 per relationship) and `ORGANIZATION` (representative ↔ representative of the same organization) conversations; participant-whitelist authorization; message history with pagination; sender identity always derived from the JWT.
- **Delivery tracking**: per-channel (`IN_APP`/`EMAIL`) delivery records with honest status (`IN_APP` reaches `DELIVERED` immediately; `EMAIL` tops out at `SENT` — never a fabricated `DELIVERED`), attempt counts, failure reasons, and idempotent re-attempt.
- `IEmailService` extended with a generic `sendNotification(to, subject, body)` method (ADR-009's own named Future Extension Point).
- Full Swagger documentation (`communication` tag).
- Unit, Prisma integration, and end-to-end automated tests.

## Out of Scope

- Academy, Steward Content Studio / Media Center, and Document Intelligence themselves — not implemented in this WO per explicit founder instruction; the Communication System is designed so they can integrate later without rework (ADR-012 Decision 3).
- Wiring `NotificationsService.notify()` into Stewardship/Business Portal/Opportunity Engine/Resource Directory/Journey Engine's actual lifecycle events — the integration method is built and proven via the Announcements fan-out call site, but the other five domains' service code is not modified in this WO (ADR-012 Decision 4, explicitly deferred).
- Group conversations and Pod-integrated messaging — messaging is strictly 1:1 in V1 (ADR-012 Decision 8).
- Real email delivery confirmation (bounce/open webhooks), scheduled digests, quiet-hours enforcement, and automated `SCHEDULED → PUBLISHED` announcement transitions — all stored as a foundation but not actively enforced/scheduled in V1.
- Any change to `ResourcesModule`/`OpportunitiesModule`/`OrganizationsModule`/`StewardshipModule` business logic (only one additive repository method, `IOrganizationMemberRepository.findByUser`, needed for announcement/message audience and isolation checks).

## Dependencies

- WO-025 (Stewardship System) — complete, merged; supplies `STEWARDSHIP_RELATIONSHIP_REPOSITORY`, reused directly for stewardship-scoped messaging and `STEWARD_MEMBERS` announcement audience resolution, and the immediately preceding Work Order in sequence.
- WO-024 (Business Portal) — supplies `ORGANIZATION_REPOSITORY`/`ORGANIZATION_MEMBER_REPOSITORY`, reused for organization-scoped announcements and messaging, and the verified-organization-`ADMIN` authorization pattern reused verbatim.
- WO-023 (Email Delivery Integration) — supplies `EmailModule`/`IEmailService`, extended (not duplicated) with a generic `sendNotification()` method.
- WO-021 (Administration & Operations) — supplies the role-grant endpoint used by e2e/live-verification personas that need a persisted `STEWARD` role.

## Source Documents

- PA-015 — Communication System Architecture
- PA-018 — Permissions & Access Architecture
- Founder canonical product decisions (2026-07-15) — Academy/Media Center/Document Intelligence scoping, Communication System reusability requirement (reproduced in full in ADR-012's Context section)
- ADR-003 — User Module (layering pattern)
- ADR-009 — Email Delivery Integration (reused infrastructure, named Future Extension Point this WO fulfills)
- ADR-010 — Business Portal (verification/membership authorization pattern reused)
- ADR-011 — Stewardship System (sub-domain-per-module pattern, least-privilege-per-shape precedent, real-vs-loose-FK precedent)

## Deliverables

- ADR-012 — Communication System
- `apps/api/src/communication/**` (module, 4 sub-domain controllers/services/repositories/DTOs, unit + integration + e2e tests)
- Prisma migration `add_communication_system`
- `docs/verification/WO-026-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `prisma/migrations/20260715065802_add_communication_system/`
- `apps/api/src/communication/communication.module.ts`
- `apps/api/src/communication/common/communication-roles.util.ts`
- `apps/api/src/communication/notifications/notifications.{controller,service,service.spec}.ts`
- `apps/api/src/communication/notifications/dto/{notification-response,paginated-notifications-response,list-notifications-query,delivery-response}.dto.ts`
- `apps/api/src/communication/notifications/repositories/{notification.repository.interface,prisma-notification.repository,notification-delivery.repository.interface,prisma-notification-delivery.repository}.ts`
- `apps/api/src/communication/preferences/notification-preferences.{controller,service,service.spec}.ts`
- `apps/api/src/communication/preferences/dto/{update-preference,preference-response}.dto.ts`
- `apps/api/src/communication/preferences/repositories/{notification-preference.repository.interface,prisma-notification-preference.repository}.ts`
- `apps/api/src/communication/announcements/announcements.{controller,service,service.spec}.ts`
- `apps/api/src/communication/announcements/dto/{create-announcement,update-announcement,list-announcements-query,announcement-response,paginated-announcements-response}.dto.ts`
- `apps/api/src/communication/announcements/repositories/{announcement.repository.interface,prisma-announcement.repository}.ts`
- `apps/api/src/communication/messaging/conversations.{controller,service,service.spec}.ts`
- `apps/api/src/communication/messaging/dto/{send-message,list-messages-query,message-response,paginated-messages-response,conversation-response,paginated-conversations-response}.dto.ts`
- `apps/api/src/communication/messaging/repositories/{conversation.repository.interface,prisma-conversation.repository,message.repository.interface,prisma-message.repository}.ts`
- `apps/api/src/communication/communication.integration.spec.ts`
- `apps/api/src/communication/communication.e2e.spec.ts`
- `docs/architecture/ADR-012-Communication-System.md`
- `docs/work-orders/WO-026-Communication-System.md` (this file)
- `docs/verification/WO-026-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `prisma/schema.prisma` — `Notification`, `NotificationDelivery`, `NotificationPreference`, `Announcement`, `Conversation`, `ConversationParticipant`, `Message` models; seven new enums; `User.notifications`/`.notificationPreferences`/`.announcementsAsSteward`/`.conversationMemberships`/`.sentMessages`, `Organization.announcements`/`.conversations`, `StewardshipRelationship.conversation` back-relations.
- `apps/api/src/email/email.service.interface.ts` — additive `sendNotification(to, subject, body)` method.
- `apps/api/src/email/nodemailer-email.service.ts` — implements `sendNotification`.
- `apps/api/src/organizations/members/repositories/organization-member.repository.interface.ts` / `prisma-organization-member.repository.ts` — additive `findByUser(userId)` method (minimal-additive-export pattern, ADR-011 precedent).
- `apps/api/src/app.module.ts` — registers `CommunicationModule`.
- `apps/api/src/main.ts` — Swagger `communication` tag.
- `docs/releases/version-1-readiness.md` — WO-026 marked complete, Communication System moved off the Remaining Backend Domains list, scores recomputed, next WO recommendation updated.
- Three existing unit spec files (`stewardship-relationships.service.spec.ts`, `organization-members.service.spec.ts`, `organizations.service.spec.ts`) — added `findByUser: jest.fn()` to their `IOrganizationMemberRepository` mocks (mechanical follow-on from the additive interface method).

## Database Changes

New migration `add_communication_system`: `Notification` (real FK to `User`, `@@unique([recipientId, dedupeKey])`), `NotificationDelivery` (real FK to `Notification`, `@@unique([notificationId, channel])`), `NotificationPreference` (real FK to `User`, `@@unique([userId, category])`), `Announcement` (real, nullable FKs to `Organization`/`User` for `organizationId`/`stewardId`; loose `authorId`), `Conversation` (real, nullable FKs to `StewardshipRelationship`/`Organization`; unique `relationshipId`), `ConversationParticipant` (real FKs to `Conversation`/`User`, `@@unique([conversationId, userId])`), `Message` (real FKs to `Conversation`/`User`), and seven new enums. No changes to any existing table's columns.

## API Changes

New: `GET/POST /communications/notifications`, `POST /communications/notifications/read-all`, `GET/POST /communications/notifications/:id`, `POST /communications/notifications/:id/{read,archive}`, `GET /communications/preferences`, `PATCH /communications/preferences/:category`, `POST/GET /communications/announcements`, `GET/PATCH /communications/announcements/:id`, `POST /communications/announcements/:id/{publish,archive}`, `POST /communications/conversations/stewardship/:relationshipId`, `POST /communications/conversations/organization/:organizationId/with/:userId`, `GET /communications/conversations`, `GET /communications/conversations/:id`, `GET/POST /communications/conversations/:id/messages`, `POST /communications/conversations/:id/read`.

## Security Requirements

- All endpoints require `JwtAuthGuard`; there is no public HTTP endpoint that creates a notification — the only creation path is the in-process `NotificationsService.notify()` method, callable only by trusted server-side code (ADR-012 Decision 4).
- Notification/preference access is self-or-Administrator, resolved from the caller's JWT `sub`, never trusted from the request body or query string beyond an Administrator's explicit `?userId=` override.
- Announcement authorship and publication authority is scope-specific and re-derived from live database state on every call (`ADMIN` `OrganizationMember` of a `VERIFIED` organization for `ORGANIZATION`; the named `STEWARD` for `STEWARD_MEMBERS`; Platform/System Administrator for `PLATFORM`/`ROLE`) — never a cached "is author" flag.
- Messaging participant authorization is resolved from an explicit `ConversationParticipant` whitelist populated only at conversation-creation time from a verified relationship (`StewardshipRelationship.status === ACTIVE`) or verified organization co-membership — never re-derived from possibly-changed state at message-send time.
- Cross-member and cross-organization isolation is enforced by the participant whitelist: an unrelated user cannot read or send messages in a conversation they were never added to (verified live and in e2e tests).
- `SYSTEM`-category in-app notifications cannot be disabled via preferences (400 on attempt) — the platform's one non-disableable communication channel, per PA-015's "critical platform or safety notifications" boundary.
- No private message bodies or authentication secrets appear in structured logs — only failure reasons and identifiers are logged on delivery failure.
- Sender/actor/publisher identity is always derived from `@CurrentUser()` (the authenticated JWT), never trusted from the request body, consistently with every domain since WO-022.

## Testing Requirements

- Unit: one `.spec.ts` per service (4 files, 56 tests) covering every authorization branch (owner/admin/unrelated caller, scope-specific announcement authority, conversation participant enforcement), preference-driven delivery branching (forced/bypassed/opted-out), idempotency (dedupeKey no-op, delivery-status no-op retry), and honest delivery-status transitions (including a simulated email-transport failure).
- Integration: `communication.integration.spec.ts` (6 tests) — real PostgreSQL, no mocks, verifying the `[recipientId, dedupeKey]` and `[notificationId, channel]` unique constraints, preference upsert idempotency, the Announcement audience OR-query, and the `relationshipId` unique constraint on `Conversation`.
- End-to-end: `communication.e2e.spec.ts` (31 tests) — full HTTP lifecycle via Supertest against a booted application: unauthenticated rejection; announcement authorization/lifecycle/fan-out; notification read/archive/read-all ownership enforcement and cross-user rejection; preference enforcement (including a live before/after fan-out comparison between an opted-out and a subscribed recipient); steward-scoped announcement authority; full stewardship messaging (start → idempotent resume → bidirectional messages → history → cross-member isolation → mark-read); organization-scoped announcements and messaging with cross-organization isolation. Real registered users are used for personas that become real-FK-backed rows, and the steward persona is granted its role for real via the WO-021 endpoint (mirrors the WO-025 finding).

## Acceptance Criteria

- [x] There is no HTTP path by which an arbitrary caller can create a notification for another user.
- [x] A recipient can list, read, mark-read, mark-all-read, and archive only their own notifications (403 for another user; Administrator override works).
- [x] `SYSTEM` notifications cannot have their in-app channel disabled (400 on attempt); every other category can be freely toggled per channel.
- [x] A recipient who disables a category's in-app channel receives no notification for that category, while other recipients are unaffected.
- [x] Only a Platform/System Administrator may author/publish `PLATFORM`/`ROLE`-scope announcements; only a verified organization's `ADMIN` representative may author/publish `ORGANIZATION`-scope; only the named Steward may author/publish `STEWARD_MEMBERS`-scope (403 otherwise in every case).
- [x] Publishing an announcement fans out exactly one notification per resolved audience member, respecting preferences unless `isCritical` is set.
- [x] Republishing an already-`PUBLISHED` announcement is rejected (409).
- [x] A member and their assigned ACTIVE-relationship steward can start (idempotently) a conversation and exchange messages; an unrelated user is rejected (403) from reading or sending in that conversation.
- [x] Two representatives of the same verified organization can message each other; a caller from outside that organization is rejected (403).
- [x] `NotificationDelivery` records honest status: `IN_APP` reaches `DELIVERED`; `EMAIL` reaches `SENT` on success or `FAILED` with a reason on transport error — `EMAIL` never reaches `DELIVERED`.
- [x] A retried `notify()` call with the same `dedupeKey` does not create a duplicate notification (DB-enforced).
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest` (full monorepo suite), `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification via curl confirms the full founder-specified workflow: notification creation for an authorized recipient, recipient read/mark-read, preference enforcement, authorized announcement creation/publication, unauthorized publication rejection, assigned member/steward message exchange, unrelated-user access rejection, and accurate delivery-status recording.

## Definition of Done

Met — see `docs/verification/WO-026-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- Only the Announcements fan-out path actually calls `NotificationsService.notify()` today — Stewardship, Business Portal, Opportunity Engine, Resource Directory, and Journey Engine's real lifecycle events do not yet send notifications; wiring each is deliberately deferred as a small, independent follow-up (ADR-012 Decision 4).
- No real email delivery confirmation exists — `NotificationDelivery.status` for `EMAIL` never reaches `DELIVERED`, only `SENT`/`FAILED`, by design (ADR-012 Decision 5).
- No scheduler enforces `Announcement.scheduledFor`, `NotificationPreference` digest/quiet-hours, or automated email-delivery retry — all three are stored, tested-at-the-data-level foundations, not active V1 behavior.
- Messaging is strictly 1:1 — no group conversations, no Pod-integrated messaging (Pods does not exist yet) (ADR-012 Decision 8).
- Organization-scoped messaging and announcements inherit ADR-011 Decision 8's documented member-enrollment gap: only organization representatives, never member-clients, can be reached (ADR-012 Decision 9).
- Academy, Steward Content Studio / Media Center, and Document Intelligence remain unbuilt, per explicit founder instruction for this WO — the Communication System is designed for their eventual integration (free-text `Notification.type`, reusable `notify()` method) but does not implement them.

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
