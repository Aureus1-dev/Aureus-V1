# ADR-012 — Communication System

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-026 |
| Authority | PA-015, PA-018, ADR-003, ADR-009, ADR-010, ADR-011 |

---

## Context

PA-015 (Communication System) is one of the twelve Version 1 systems named in PA-020. Prior to this Work Order, the only communication capability that existed was WO-023's `EmailModule` — a narrow, use-case-shaped transactional email sender for Auth's two flows (account verification, password reset). PA-015's actual scope (a notification service, in-platform messaging, announcements, delivery preferences, and delivery tracking) had no dedicated domain.

Per the founder's Version 1 architectural decision (2026-07-15), the canonical backend is being completed domain-by-domain before any frontend work begins. WO-026 is the next Work Order in that sequence: per the Remaining Backend Domains audit recorded in `docs/releases/version-1-readiness.md` after WO-025, Communication System was the highest-priority remaining domain not blocked on a founder MVP-scope decision (unlike the AI Intelligence Engine) and not itself blocked on another undelivered domain or product decision (unlike Academy and Pods).

This WO also carries five additional canonical product decisions from the founder governing scope: (1) a future Academy domain will include a Steward Content Studio / Media Center; (2) ordinary members primarily consume Academy/media content; (3) Stewards and Platform Administrators may create/manage/review/publish that content; (4) Document Intelligence will be a separate future member-facing domain; (5) none of Academy, Media Center, or Document Intelligence are implemented in this WO — the Communication System must instead be designed so those (and every other) future domain can use it without building a parallel notification, messaging, or announcement system of their own.

---

## Decisions

### 1. A new bounded `CommunicationModule` with four internal sub-domains, reusing `EmailModule` rather than duplicating it

**Decision:** Communication lives in a new `apps/api/src/communication/` module, internally organized into `notifications/` (including delivery tracking), `preferences/`, `announcements/`, and `messaging/`, all registered under one `CommunicationModule`. `EmailModule` is imported, not reimplemented — `NotificationsService` injects the existing `EMAIL_SERVICE` token.

**Rationale:** Directly satisfies the explicit instruction "do not create a duplicate email, notification, audit, authorization, or preference system." Extends the sub-domain-per-module-file pattern WO-025/ADR-011 established for Stewardship's seven sub-domains, scaled to Communication's four. Reusing `EmailModule` rather than standing up a second SMTP client means every operational property WO-023/ADR-009 already established (pluggable transport, `jsonTransport` local-capture fallback, one `Logger.warn` on missing `SMTP_HOST`) applies to every Communication-originated email for free.

---

### 2. `IEmailService` gains one generic method — the exact extension point ADR-009 pre-declared

**Decision:** `IEmailService` gains `sendNotification(to, subject, body): Promise<void>` alongside the existing `sendEmailVerification`/`sendPasswordReset`. `NotificationsService` owns all subject/body templating per notification category; the email service stays a thin transport call.

**Rationale:** ADR-009 Decision 2 explicitly named this exact scenario as its own Future Extension Point: "A generic `send()` primitive if a second, materially different email use case appears." That second use case is this WO. Extending the existing interface rather than building a second `IEmailService`-shaped abstraction keeps exactly one email-sending seam in the codebase, satisfying the "no duplicate email system" instruction at the infrastructure layer, not just the domain layer.

---

### 3. `Notification.category` is a bounded enum; `Notification.type` is free-text — the mechanism that makes every future domain integration-ready without a migration

**Decision:** `NotificationCategory` is a fixed Prisma enum (`ACCOUNT`, `STEWARDSHIP`, `JOURNEY`, `OPPORTUNITY`, `RESOURCE`, `ORGANIZATION`, `ANNOUNCEMENT`, `MESSAGE`, `SYSTEM`, `ACADEMY`, `POD`, `AI_GUIDANCE`) used for preference-matching and coarse filtering. `Notification.type` is a free-text, dot-namespaced string (e.g. `stewardship.relationship.activated`) that any calling domain mints on its own, with no schema change required.

**Rationale:** This is the concrete mechanism satisfying "provide clean integration interfaces... so future systems can send communications without duplicating infrastructure." A bounded `category` gives `NotificationPreference` a finite, user-configurable surface (nobody wants to configure preferences per-event-type); a free-text `type` means Academy, Pods, Document Intelligence, the Knowledge System, and the AI Intelligence Engine can each mint their own event vocabulary the moment they're built, calling the same `NotificationsService.notify()` method every other domain calls, without this WO having to predict their event names in advance. `ACADEMY`, `POD`, and `AI_GUIDANCE` categories are included now — not because those domains exist yet, but because the category enum is the one part of this design that *does* require a migration to extend, and the founder's canonical decisions named Academy/Media Center and Document Intelligence as concretely planned near-term domains.

---

### 4. Domain integration is a public service method (`NotificationsService.notify()`), not an HTTP endpoint — and wiring real call sites into existing domains is explicitly deferred

**Decision:** There is no HTTP endpoint that lets an arbitrary caller create a notification. The only way to create one is in-process: another module imports `CommunicationModule` and injects the exported `NotificationsService`, then calls its public `notify(input)` method (or, for announcements, `AnnouncementsService.publish()`'s fan-out calls it internally). This WO does **not** modify Stewardship, Business Portal, Opportunity Engine, Resource Directory, or Journey Engine's own service code to actually call `notify()` when their domain events occur (e.g., Stewardship's `activate()` does not yet send a notification).

**Rationale:** The security requirement "never trust actor identity supplied through request bodies" and "no arbitrary create" together rule out a public creation endpoint — a notification's legitimacy comes from being created by trusted, in-process domain code, not from a bearer token. Deferring the actual call-site wiring into five already-shipped, fully-tested domains follows the identical scope-discipline precedent set by ADR-010 Decision 6 (deferring `Organization` ↔ `Resource`/`Opportunity` linkage) and ADR-011 Decision 8 (deferring organization-scoped steward-assignment precision): touching five stable domains' service logic is a distinct, mechanically-repetitive body of work (one small change per domain) that would roughly double this WO's blast radius for a capability with no current consumer (no frontend exists to display in-app notifications yet). This WO delivers the reusable `notify()` capability and proves it end-to-end via the one call site that *is* in scope — `AnnouncementsService.publish()`'s fan-out — deliberately leaving the remaining five call sites as small, easily-reviewed follow-up changes.

---

### 5. Notification delivery status is honest by construction: IN_APP reaches DELIVERED, EMAIL never does

**Decision:** `NotificationDelivery.status` for the `IN_APP` channel is set to `DELIVERED` at creation time — the row's existence and queryability *is* the delivery. For the `EMAIL` channel, the status machine is `PENDING → SENT | FAILED`; it never reaches `DELIVERED`, because no bounce/open/delivery-confirmation webhook exists (ADR-009 Future Extension Points already named this as unbuilt).

**Rationale:** Directly satisfies "no fabricated delivered status." A less careful design might mark both channels `DELIVERED` on successful `sendMail()`, which would be true for "handed to the transport" but false for "the recipient's inbox actually received it" — nodemailer's `jsonTransport` fallback (used whenever `SMTP_HOST` is unset, per ADR-009 Decision 4) never contacts a real mail server at all. Distinguishing `SENT` (accepted by the transport) from `DELIVERED` (independently confirmed) preserves the ability to add real delivery confirmation later without a status-value migration — `DELIVERED` already exists in the enum, simply unused for `EMAIL` until a webhook exists to justify it.

---

### 6. Idempotency is enforced by two independent unique constraints, not application-level locking

**Decision:** `Notification` carries `@@unique([recipientId, dedupeKey])` — a calling domain that supplies a `dedupeKey` (e.g. `announcement:${id}`) gets a guaranteed single notification per (recipient, key) pair, even under a retried call, because `notify()` checks-then-creates and the constraint is the backstop against a race. `NotificationDelivery` carries `@@unique([notificationId, channel])` — at most one delivery record exists per channel per notification, so `attemptEmailDelivery()` is safe to call again after a failure (retry-ready) without ever double-sending once a channel reaches `SENT`.

**Rationale:** Directly satisfies "no duplicate sends caused by repeated requests" and "retry-ready architecture" together, using the same "database constraint as the source of truth, not a TypeScript check" philosophy WO-025 established for `StewardCapacity.maxActiveMembers`'s hardcoding prohibition (ADR-011 Decision 4). A unique constraint is enforced regardless of which code path attempts the write, including a future background retry job this WO does not build but explicitly designs for.

---

### 7. Announcements use one authorization function per scope, not a single role check — and `isCritical` is the schema-level mechanism for PA-015's "safety notification" carve-out

**Decision:** `AnnouncementScope` has four values (`PLATFORM`, `ORGANIZATION`, `ROLE`, `STEWARD_MEMBERS`), each with its own authorization rule: `PLATFORM`/`ROLE` require a Platform/System Administrator; `ORGANIZATION` requires an `ADMIN` `OrganizationMember` of a `VERIFIED` organization (reusing WO-024/ADR-010's exact verification-and-membership check); `STEWARD_MEMBERS` requires the caller to be the named Steward. Audience resolution on publish (who receives the fan-out) is a second, independent function per scope. `Announcement.isCritical` (default `false`) is a stored flag that, when true, makes `notify()` bypass the recipient's `ANNOUNCEMENT`-category preference for the in-app channel only.

**Rationale:** Collapsing four structurally different authorities into one generic role check would either over-grant (letting any Steward reach every member via `PLATFORM` scope) or under-grant (blocking legitimate organization-scoped or steward-scoped announcements behind an administrator-only gate). This mirrors WO-025/ADR-011 Decision 5's reasoning for keeping notes/tasks/escalations as three tailored authorization shapes rather than one shared abstraction. `isCritical` is the schema-level implementation of PA-015's explicit architectural boundary — "the Communication System shall not override member communication preferences except for critical platform or safety notifications" — giving that boundary a concrete, auditable flag rather than leaving it as an unenforced policy statement.

---

### 8. Messaging is 1:1 only in V1; group messaging and Pod communications are explicitly out of scope

**Decision:** `Conversation` has exactly two types — `STEWARDSHIP` (1:1 with a `StewardshipRelationship`, enforced by a unique `relationshipId`) and `ORGANIZATION` (1:1 between two representatives of the same organization, looked up by participant pair). There is no group-conversation shape, and no Pod-messaging integration (Pods do not exist yet).

**Rationale:** The founder's instruction scoped this WO to "the minimum complete V1 messaging capability required by PA-015": member-to-assigned-steward, steward-to-assigned-member, and organization-authorized communication — all naturally 1:1 relationships that already exist in the schema (`StewardshipRelationship`, `OrganizationMember`). PA-015 separately names "Group messages" and "Pod communications" as supported communication *types*, but building a general N-participant conversation model now, with no concrete consumer (Pods doesn't exist; no frontend needs it), would be exactly the kind of speculative complexity the codebase's established YAGNI discipline (ADR-009 Decision 2, ADR-004/ADR-005's deferred capabilities) argues against. `ConversationParticipant` is already a proper join table, not a fixed two-column pair — extending to N participants later is additive, not a redesign.

---

### 9. Organization-scoped messaging reuses ADR-011 Decision 8's documented scoping limitation, not a new one

**Decision:** "Organization-authorized communication" is implemented as messaging between two `OrganizationMember` representatives of the same organization — there is no member-to-organization messaging (a member cannot message an organization's representatives as a client/enrollee), because that would require the same member-enrollment relationship ADR-011 Decision 8 already named as absent from the schema.

**Rationale:** Rather than inventing a second, differently-scoped workaround for the same underlying gap ADR-011 already documented, this WO explicitly reuses that documented limitation and its Future Extension Point (a future member-enrollment model) rather than building a parallel, narrower one. When that model is eventually built, both Business Portal's organization-scoped steward assignment (ADR-011 Decision 8) and this WO's organization-scoped messaging become precise at the same time, from the same schema addition.

---

## Risks

| Risk | Mitigation |
|---|---|
| Real domain events (a steward being assigned, a resource being verified, etc.) do not yet produce real notifications — only the Announcements fan-out path is wired end-to-end (Decision 4) | Explicitly named, not silent; `NotificationsService.notify()` is fully built, tested, and proven via the one live call site; wiring the remaining five domains is deliberately deferred as small, independent follow-up changes, each no larger than a single new method call at an existing lifecycle transition. |
| `Announcement` fan-out is synchronous within the publish request, `createMany`-free (one `notify()` call per resolved recipient in a loop) | Consistent with the existing codebase-wide precedent of accepting synchronous request-path work at V1 scale (ADR-009 Risks: synchronous email send; ADR-010 Risks: non-transactional sequential writes); each recipient's failure is caught and logged individually so one bad row does not abort the rest of the fan-out. |
| No real bounce/open/delivery-confirmation mechanism for EMAIL — `DELIVERED` is structurally unreachable for that channel | Intentional, not a gap (Decision 5); revisit only if/when a mail provider's delivery webhook is integrated, at which point `DELIVERED` already exists in the enum with no migration needed. |
| Messaging is strictly 1:1 — no group conversations, no Pod messaging | Explicitly scoped to PA-015's "minimum complete V1 messaging capability" instruction (Decision 8); `ConversationParticipant`'s join-table shape is already additive-extensible when group messaging has a real consumer. |
| Organization-scoped messaging inherits ADR-011 Decision 8's member-enrollment gap | Explicitly reused, not newly introduced (Decision 9); tracked once, not twice. |
| `NotificationCategory` includes `ACADEMY`, `POD`, and `AI_GUIDANCE` values with no current producer | Deliberate forward-provisioning per the founder's named future domains (Decision 3), not speculative — these three domains are explicitly on the canonical roadmap, unlike a hypothetical unlisted future category. |

---

## Future Extension Points

- Wire `NotificationsService.notify()` into Stewardship, Business Portal, Opportunity Engine, Resource Directory, and Journey Engine's real lifecycle events (Decision 4) — each is an independent, small follow-up change.
- A member-enrollment/client relationship between `User` and `Organization` (reusing ADR-011 Decision 8's Future Extension Point) to make organization-scoped messaging and steward assignment precise together.
- Real EMAIL delivery confirmation via a provider bounce/open webhook, populating the already-reserved `DELIVERED` status for that channel (Decision 5).
- A background retry job that calls `NotificationsService.attemptEmailDelivery()` for `FAILED`/`PENDING` deliveries — the method is already idempotent and safe to call repeatedly; only the scheduler is unbuilt.
- Scheduled digests and quiet-hours enforcement, reading the already-stored `NotificationPreference.digestEnabled`/`quietHoursStart`/`quietHoursEnd` fields (currently write-only, per the instruction to build a "digest-ready foundation... without requiring scheduled digests in V1").
- A scheduler that auto-transitions `Announcement.status` from `SCHEDULED` to `PUBLISHED` at `scheduledFor` — currently `scheduledFor` is a stored marker only; publishing is always a manual action.
- Group conversations and Pod-integrated messaging, once Pods (PA-009) is built (Decision 8).
- Steward Content Studio / Media Center and Document Intelligence integration, once those domains exist — both can mint their own `NotificationCategory`/`type` values and call the same `notify()` method (Decision 3), the concrete reason this WO's canonical instructions named them.
