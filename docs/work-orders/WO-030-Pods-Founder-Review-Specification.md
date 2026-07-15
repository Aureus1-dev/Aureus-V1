# WO-030 — Pods (PA-009) — Founder Review Engineering Specification

| Field | Value |
|---|---|
| Work Order Number | WO-030 |
| Title | Pods (PA-009) |
| Status | **AWAITING FOUNDER APPROVAL — implementation has not begun** |
| Date | 2026-07-15 |
| Governing Documents | OAS-ACA-009 (Pods, constitutional), PA-009 (Pods Architecture), OAS-OPS-010 (Pod Operations Framework), OAS-OPS-104 (Pod Meeting SOP) |

This document is the engineering specification for the last of the twelve PA-020-named Version 1 backend systems. Per the founder's instruction, **no code will be written until this specification is reviewed and approved.** Every section that requires a founder decision rather than a routine engineering judgment call is marked **⚑ Decision Needed**.

---

## 0. Constitutional Grounding

OAS-ACA-009 is unusually explicit and unusually strict for a technical specification to answer to, so this section states plainly how the engineering design answers to it, before any schema or API is proposed:

- **"They do not exist to manage people. They exist to care for people."** (Article I) — the domain model below has no entity or field whose purpose is managerial control (no performance scores exposed to the institution, no ranking of members). Where a field could be misread that way, it is named and scoped narrowly (§6, §7).
- **"Freedom of Belonging... never imprisonment"** (Article VIII) — every membership-forming action (initial assignment, reassignment, interest-Pod joining) is reversible by the member's own request, and no automated process finalizes a Pod assignment without the member's own confirmation (§2, §3).
- **"Pods do not exist to monitor people... every response shall preserve personal freedom while extending genuine concern"** (Article VI) — this is the single hardest constraint in the document, and it is treated as such: §6 (Privacy Model) and §7 (AI Integration) are the two sections a founder should scrutinize most closely, because they are where a technically reasonable design could quietly become surveillance if built carelessly.
- **"True friendship shall never be forced. It shall always be invited."** (Article IV) — Pod Invitations (§1.9) are opt-in on both sides; nothing in this design auto-enrolls a member in an Interest Pod.
- **"Leadership is entrusted. It is never owed."** (Article XI) — Pod Steward is a role a platform Steward is *assigned to*, not a rank a member accumulates through metrics; §4 makes this explicit.

---

## 1. Domain Model

Ten entities were named in the founder's brief. Below, each is specified with its purpose, its key fields (Prisma-shaped, for concreteness — not final syntax), and — critically — which existing platform pattern it reuses rather than reinvents. Every reuse decision is traceable to a specific prior ADR, per the founder's "reuse existing patterns" standing instruction.

### 1.1 `Pod`

The community itself.

```
Pod {
  id, sequenceNumber, podRef            // AUR-POD-000001, same ref pattern as every other domain
  name, shortDescription, fullDescription
  type            PodType               // HOME | INTEREST  (§3)
  status          PodStatus             // FORMING | ACTIVE | DORMANT | ARCHIVED  (§5)
  capacity        Int  @default(12)     // configurable ceiling, StewardCapacity pattern (§4)
  location        — see §2.1 ⚑ Decision Needed (geographic matching data shape)
  primaryLanguage String?               // matching signal, §2
  createdAt, updatedAt, deletedAt        // soft delete, platform-wide convention

  members         PodMembership[]
  events          PodEvent[]
  meetingSchedule PodMeetingSchedule?
  serviceProjects PodServiceProject[]
  requests        PodRequest[]
  invitations     PodInvitation[]
}

enum PodType   { HOME, INTEREST }
enum PodStatus { FORMING, ACTIVE, DORMANT, ARCHIVED }
```

**Reuse:** the `AUR-POD-000001` sequence-ref pattern (every domain since Resources, WO-020), soft delete, and a domain-specific status enum (`AcademyContentStatus` precedent, ADR-014 Decision 2) are all direct reuse, not new design. `PodStatus` is intentionally *not* the shared `VerificationStatus` enum — a Pod is not publishable content with a moderation workflow; it is a living group with an operational lifecycle (§5).

### 1.2 `PodMembership`

The core join entity — who belongs to which Pod, and how.

```
PodMembership {
  id
  podId, userId
  role            PodMemberRole    // MEMBER | STEWARD  (§4 — see distinction from platform-wide STEWARD role)
  status          PodMembershipStatus  // PENDING | ACTIVE | ENDED
  origin          PodMembershipOrigin  // MEMBER_REQUEST | AI_MATCH_SUGGESTION | STEWARD_INVITATION | ADMIN_ASSIGNMENT
  joinedAt, endedAt, endReason
  createdAt, updatedAt

  @@unique([podId, userId, status])  // conceptually: one ACTIVE membership per (pod, user) pair
}

enum PodMemberRole        { MEMBER, STEWARD }
enum PodMembershipStatus  { PENDING, ACTIVE, ENDED }
enum PodMembershipOrigin  { MEMBER_REQUEST, AI_MATCH_SUGGESTION, STEWARD_INVITATION, ADMIN_ASSIGNMENT }
```

**Reuse:** this is `StewardshipRelationship`'s exact shape — a real-FK join row with a `status`/`origin` lifecycle, rows never deleted or rewritten (only superseded), history fully preserved (ADR-011's "a steward is a guide, not an owner" precedent, quoted almost verbatim in that model's own doc-comment). `AI_MATCH_SUGGESTION` always lands in `PENDING`, exactly mirroring `StewardshipRelationshipOrigin.AI_RECOMMENDATION` always landing `PENDING` — the AI Engine may suggest a Pod, it may never finalize a membership (§2, §7, and the hard constraint from WO-029/ADR-015 Decision 6).

A member's **Home Pod** is simply their one `ACTIVE` `PodMembership` where `Pod.type = HOME`; **Interest Pods** are additional `ACTIVE` memberships where `Pod.type = INTEREST`. No separate "home pod" field is needed on `User` — it is derived, matching the platform's consistent avoidance of denormalized state (no domain caches a computed value on `User` anywhere in the schema today).

### 1.3 Pod Steward — *not a new model*

"Pod Steward" is `PodMembership.role = STEWARD` on a specific Pod, not a new entity and not a reuse of `StewardshipRelationship`. See §4 for why these are deliberately two different concepts even though both use the word "steward."

### 1.4 `PodEvent`

A concrete, scheduled gathering (meeting, service project session, celebration, etc.) with attendance.

```
PodEvent {
  id, podId
  title, description
  type          PodEventType     // MEETING | SERVICE_PROJECT | CELEBRATION | OTHER
  startsAt, endsAt
  location                        // free text — physical address or "virtual: <link>"
  createdById
  status        PodEventStatus   // SCHEDULED | COMPLETED | CANCELLED
  createdAt, updatedAt

  rsvps         PodEventRsvp[]
}

model PodEventRsvp {
  id, eventId, userId
  response      RsvpResponse     // YES | NO | MAYBE
  attended      Boolean?         // set after the fact by the Steward; null until then
  createdAt, updatedAt
  @@unique([eventId, userId])
}
```

**Reuse:** this is a new entity — nothing in the platform today models "a scheduled gathering with RSVPs." Kept intentionally minimal (OAS-OPS-104's meeting SOP describes a rich meeting *process*, but that process is a facilitation script for the Steward to follow, not data the platform needs to store — see §11's Non-Goals).

### 1.5 `PodMeetingSchedule`

The *recurring pattern*, separate from individual `PodEvent` instances — "this Pod meets biweekly on Thursdays at 7pm" is metadata a Steward sets once, not a Prisma row per future occurrence.

```
PodMeetingSchedule {
  id, podId  @unique          // one active schedule per Pod
  cadence        MeetingCadence   // WEEKLY | BIWEEKLY | MONTHLY | AD_HOC
  dayOfWeek      Int?             // 0-6, null for AD_HOC
  timeOfDay      String?          // "19:00", stored as text — no timezone-aware scheduling infra exists yet
  location       String?
  createdById
  createdAt, updatedAt
}
```

**⚑ Decision Needed:** should creating/editing a `PodMeetingSchedule` automatically generate future `PodEvent` rows (e.g., the next 4 occurrences), or does the Steward create each `PodEvent` manually, with `PodMeetingSchedule` purely informational? Auto-generation is a genuinely new capability class (a scheduled background job or cron-like recurrence) that no other domain in this platform has built yet. **Recommendation:** V1 ships `PodMeetingSchedule` as informational only (display "this Pod meets biweekly on Thursdays"); Stewards create each `PodEvent` explicitly. Auto-generation is a clean Future Extension Point once a background-job mechanism exists for any domain (none does yet — WO-023's email is synchronous, per ADR-009 Decision 4's own Known Limitation).

### 1.6 `PodMessage` — *not a new model*

Reuses `Conversation`/`Message`/`ConversationParticipant` (WO-026/ADR-012) directly, per that ADR's own explicit forward-declaration:

> "`ConversationParticipant` is already a proper join table, not a fixed two-column pair — extending to N participants later is additive, not a redesign." — ADR-012 Decision 8

The additive change: extend `ConversationType` with `POD`, add a nullable `podId` FK to `Conversation` (alongside the existing `relationshipId`/`organizationId`), and populate `ConversationParticipant` with every `ACTIVE` `PodMembership` row for that Pod. Zero changes to `Message` itself. This is the cleanest reuse story in the entire domain — the prior WO's author anticipated this exact moment.

### 1.7 `PodServiceProject`

Article IX's "who needs us?" — lightweight, not a project-management system.

```
PodServiceProject {
  id, podId
  title, description
  status        ServiceProjectStatus  // PROPOSED | ACTIVE | COMPLETED | ARCHIVED
  proposedById
  createdAt, updatedAt
}
```

**Reuse:** same minimal-status-enum shape as everything else; deliberately has no task list, no budget, no volunteer sign-up matrix — those would be genuinely new product surface (a mini project-management tool) that Article IX does not ask for. It asks Pods to *notice and act*, not to run Gantt charts.

### 1.8 `PodRequest`

A member's request to join, leave, or be reassigned — Article VIII's "Freedom of Belonging" made concrete.

```
PodRequest {
  id, userId
  type          PodRequestType   // JOIN | LEAVE | REASSIGNMENT | PROPOSE_NEW_POD
  podId         String?          // target Pod for JOIN/LEAVE/REASSIGNMENT; null for PROPOSE_NEW_POD
  proposedPodName        String?  // only for PROPOSE_NEW_POD
  proposedPodDescription String?
  reason        String?
  status        PodRequestStatus // PENDING | APPROVED | DECLINED | WITHDRAWN
  decidedById
  decidedAt
  createdAt, updatedAt
}
```

**Reuse:** this is the Pods-domain equivalent of `StewardshipRelationship`'s `requestSteward()` entry point — a member-initiated action that a Steward/Admin reviews, never silently auto-applied. `PROPOSE_NEW_POD` is the member-initiated path to forming a genuinely new Interest Pod (§3, §5).

### 1.9 `PodInvitation`

A Steward or existing member inviting a specific person — Article IV's "never forced... always invited."

```
PodInvitation {
  id, podId
  invitedUserId
  invitedById
  message       String?
  status        PodInvitationStatus  // PENDING | ACCEPTED | DECLINED | EXPIRED
  respondedAt
  createdAt, updatedAt
}
```

**⚑ Decision Needed:** may any `ACTIVE` member of a Pod invite someone, or only the Steward? Article IV frames friendship as organic ("members are encouraged to know one another") which argues for member-initiated invitations to Interest Pods being allowed; a Home Pod, being capacity- and matching-governed, more plausibly should only be Steward/Admin-invited. **Recommendation:** Interest Pods — any `ACTIVE` member may invite; Home Pods — Steward/Admin only (matching-governed placement, §2).

### 1.10 `PodMetrics` — *aggregate, not a stored entity per member*

Per Article X ("without violating privacy or human dignity") and the founder's explicit "non-surveillance" instruction, **Pod Metrics are computed on read, at the Pod level, never persisted per-member.** See §6 for the full privacy model this implies, and §7 for how the AI Engine consumes them. Concretely, a `GET /pods/:id/metrics` endpoint computes, on demand, from existing rows:

- Meeting attendance rate (aggregate % across `PodEventRsvp.attended`, Pod-level only — never "which members attended," only "what fraction of the Pod attended")
- Membership size and stability (active member count, average tenure)
- Service project count/completion rate
- Meeting cadence adherence (scheduled vs. actually-held `PodEvent`s)

No `PodMetrics` table exists in the schema. There is nothing to leak, because there is nothing stored beyond what the operational entities above already hold for their own operational purpose.

---

## 2. Matching Philosophy

### 2.1 Primary Signal: Geographic Proximity

**⚑ Decision Needed — this is the single largest open engineering question in the whole spec.** The current `Profile` model has no location field at all (`displayName`, `bio`, `avatarUrl` only). Three options:

| Option | Description | Recommendation |
|---|---|---|
| A. Coarse (city/state/country strings) | Extend `Profile` with `city`, `state`, `country` — matches exactly how `Opportunity`/`Resource` already store location (no geocoding infrastructure). | **Recommended for V1.** |
| B. Precise (lat/long + radius) | Real geospatial matching, PostGIS or similar. | Already named as a **Post-Launch Candidate** in `version-1-readiness.md` ("Geographic radius search (PostGIS) for Opportunities/Resources") — building it for Pods first, ahead of the two domains that already wanted it, would be scope inversion. |
| C. Member-declared "region" from a fixed list | No free-text geocoding needed at all, coarsest possible. | Simpler, but loses meaningful proximity signal (e.g. "Texas" matches two members 800 miles apart). |

**Recommendation: Option A.** Extend `Profile` with `city`/`state`/`country` (nullable, member-supplied, editable), matching the exact fields `Opportunity`/`Resource` already use for their own location filtering — reuse of an established shape, not new design. Matching scores proximity as: same city > same state/region > same country > no match. Real-radius search remains a documented, deferred Post-Launch Candidate for all three domains (Opportunities, Resources, Pods) together, not solved piecemeal.

### 2.2 Secondary Signals

Stage of life, interests, profession, schedule, language, voluntary faith preference, goals, compatibility. Data-shape assessment:

| Signal | Data source | Status |
|---|---|---|
| Interests | `UserInterest` (existing, `OpportunityCategory`-scoped) | ⚑ Reuse as-is, or is a Pods-specific interest taxonomy needed? **Recommendation:** reuse `UserInterest` — it is already category-based and general-purpose; a second parallel interest system would duplicate, not extend. |
| Goals | `Goal`/`Journey` (existing) | Reuse directly — no new field needed. |
| Profession | *(does not exist)* | New nullable `Profile.profession` field (free text, optional). |
| Stage of life | *(does not exist)* | New nullable `Profile.stageOfLife` field — **⚑ Decision Needed:** enum (e.g. `STUDENT`, `EARLY_CAREER`, `PARENT_YOUNG_CHILDREN`, `MID_CAREER`, `RETIRED`, ...) or free text? An enum is more matchable but risks the platform prescribing life categories it shouldn't presume to define for every member. **Recommendation:** a short, deliberately loose enum with an `OTHER` escape hatch, reviewed by the founder for the exact category list — this is content the founder should author, not an engineer. |
| Schedule/availability | *(does not exist)* | New nullable `Profile.availabilityNotes` (free text in V1) — a structured weekly-availability-grid model is a Future Extension Point, not V1-necessary for a "secondary, soft" matching signal. |
| Language | *(does not exist)* | New nullable `Profile.preferredLanguage` field. |
| Voluntary faith preference | *(does not exist)* | New **nullable, member-set-only, never defaulted, never required** `Profile.faithPreference` field. See §6 — this is the single most privacy-sensitive field in the entire domain and is treated accordingly: never shown to the AI Engine's aggregate-metrics surface (§7), never a required registration field, always member-editable to blank. |
| Compatibility | *(computed, not stored)* | Not a stored signal — it is the *output* of combining all of the above, computed at match time, not persisted as a score. |

**⚑ Decision Needed, platform-wide:** all of the above are proposed as additions to the existing `Profile` model (consistent with "one profile per user," avoiding a parallel `PodMatchingProfile` identity model). Confirm this is the intended home for this data — the alternative (a separate matching-specific profile) would duplicate `Profile`'s role.

### 2.3 The Matching Algorithm Itself

**Explicitly not an ML model, not a black box, and not autonomous.** Consistent with WO-029/ADR-015 Decision 4's "tool orchestration means deterministic cross-service calls, not an LLM-driven agent loop," Pod matching is proposed as: a deterministic, code-defined scoring function (weighted sum: proximity dominant, secondary signals additive) that ranks candidate Pods for a member and produces a ranked shortlist — then, per §7, the AI Engine may be asked to generate a *human-readable rationale* for the top suggestion(s), exactly mirroring how WO-029's `RecommendationsService` already works for Opportunities/Resources/Courses. The scoring function itself is ordinary application code, reviewable and testable like any other business logic — not a model that needs training data or produces unexplainable output.

The result of matching is always a `PodMembership` with `status: PENDING`, `origin: AI_MATCH_SUGGESTION` (or a `PodRequest` if member-initiated) — **never** a silent, immediately-`ACTIVE` assignment. The member (and, for a Home Pod, plausibly a Steward/Admin) confirms before it becomes real. This directly satisfies Article VIII and mirrors the platform's existing hard rule that AI recommends, never acts (ADR-015 Decision 6, reaffirmed here for a fourth time).

---

## 3. Membership Model

- **Home Pod:** exactly one `ACTIVE` `PodMembership` per member where `Pod.type = HOME`. Every member is *offered* the opportunity to belong to one (per OAS-ACA-009 Article III — "shall have the opportunity to belong"), but membership is opt-in, never forced at registration. **⚑ Decision Needed:** is Home Pod assignment offered automatically after registration (a matching suggestion generated proactively), or only when the member actively requests one? **Recommendation:** proactive suggestion (a `PENDING` `PodMembership` the member can accept/decline/ignore) — passive availability alone risks the exact "unnecessarily unseen" outcome Article I explicitly warns against, but the member always retains the final word.
- **Interest Pods:** any number of additional `ACTIVE` `PodMembership` rows where `Pod.type = INTEREST`. No cap proposed in V1 beyond ordinary rate-limiting on request creation (reuse of the existing `ThrottlerModule` pattern, ADR-015 Decision 8's precedent).
- **Reassignment:** a `PodRequest{type: REASSIGNMENT}` — ends the current `PodMembership` (status → `ENDED`, `endReason` recorded) and creates a new one, exactly mirroring `StewardshipRelationship`'s reassignment shape (history preserved, never rewritten).
- **Propose a new Pod:** a `PodRequest{type: PROPOSE_NEW_POD}` — reviewed by a Steward/Admin, and if approved, creates a new `Pod{status: FORMING}` with the proposer as its first `STEWARD`-role `PodMembership` (or a `MEMBER` awaiting Steward assignment — **⚑ Decision Needed**, see §4).

---

## 4. Steward Responsibilities

Two "steward" concepts coexist in this platform, and the specification must keep them distinct rather than quietly merge them:

| | `StewardshipRelationship` (WO-025) | Pod Steward (this WO) |
|---|---|---|
| Shape | 1:1, one member ↔ one personal steward | 1:N, one Steward role within one Pod's membership |
| Purpose | Personal accountability/guidance for one member's individual journey | Servant-leadership for a whole small community (Article V) |
| Constitutional source | PA-012 | OAS-ACA-009 Article V |
| Data model | Existing `StewardshipRelationship` table | `PodMembership.role = STEWARD` |

A platform `STEWARD`-role user may hold both simultaneously and for different people — a Pod Steward for their Pod's dozen members, and a personal `StewardshipRelationship` steward for one or two individuals elsewhere. **These are not merged into one relationship type** — Article V's Pod Steward responsibilities (welcoming newcomers, encouraging participation, connecting people with opportunities, protecting trust) are group-facing, while `StewardshipRelationship`'s are individual-facing; conflating them would blur a distinction the constitution itself draws.

**Responsibilities, translated into platform authority (not new philosophy, just where each Article V/OAS-OPS-010 responsibility becomes an API permission):**

- Approve/decline `PodRequest`s targeting their Pod (join, leave, reassignment away).
- Create/manage `PodInvitation`s for their Pod.
- Create/manage `PodEvent`s and the Pod's `PodMeetingSchedule`.
- Mark `PodEventRsvp.attended` after a meeting.
- Propose/manage `PodServiceProject`s.
- Escalate a concern about a member — **reuses `StewardshipEscalation` directly** (add a nullable `podId` alongside the existing `relationshipId`, mirroring the `Conversation` extension in §1.6) rather than building a second escalation system. A Pod Steward escalating "a member has disappeared and I'm concerned" is the same shape of event as a personal steward escalating a concern about their assigned member — same severity/status enums, same review process, one escalation system for the whole platform.

**⚑ Decision Needed:** who *assigns* a Pod's Steward — Admin only, or can a Pod's existing members nominate/elect one (Article XI: "leadership is entrusted... through faithful stewardship")? **Recommendation:** V1 ships Admin/Platform-Steward assignment only (mirrors `StewardshipRelationship`'s `ADMIN_ASSIGNMENT`/`ORGANIZATION_ASSIGNMENT` origins) — member-nomination or election is a meaningfully different, more complex workflow (voting, term limits) that Article XI's *spirit* supports but does not mandate be automated; a human institutional process (an Admin observing and assigning based on demonstrated faithfulness) satisfies "leadership is entrusted, never owed" without new voting infrastructure.

---

## 5. Pod Lifecycle

```
FORMING → ACTIVE → DORMANT → ACTIVE (revival)
                 → ARCHIVED (terminal)
```

- **FORMING:** a newly-approved `PROPOSE_NEW_POD` request, or a newly-matched Home Pod cluster below minimum viable size. Not yet visible in general Pod discovery; a Steward is being assigned/onboarded.
- **ACTIVE:** normal operation.
- **DORMANT:** no `PodEvent` held within a configurable window (mirrors `StewardCapacity.maxActiveMembers`'s "column default, never hardcoded" pattern — a `dormancyThresholdDays` setting, not a magic number in code) — a signal for Steward/Admin attention, not an automatic termination.
- **ARCHIVED:** terminal, soft-deleted equivalent — history preserved (messages, events, memberships all remain queryable for the members who were part of it), matching the platform's universal soft-delete convention.

**⚑ Decision Needed — "Multiplication":** OAS-OPS-010 names "growth and multiplication" (splitting a large, healthy Pod into two) as a goal. Is Pod-splitting an explicit, tracked action in V1 (e.g., a `PodRequest` type or Admin action that creates a new `Pod` and moves a subset of `PodMembership` rows to it, preserving some lineage pointer), or is it, in V1, simply "an Admin archives members out of one Pod and creates a new one manually," with no special lineage tracking? **Recommendation:** V1 treats multiplication as ordinary Admin-driven Pod creation plus ordinary reassignment `PodRequest`s — no `parentPodId` lineage field. If the founder wants generational Pod lineage visible (e.g., for Institutional Wisdom / Article X), that is a clean, additive Future Extension Point, not a V1 requirement PA-009 explicitly names.

---

## 6. Privacy Model

This is the section most likely to need founder revision, and it is written to be conservative by default rather than permissive by default.

**What is visible to whom:**

| Data | Visible to | Never visible to |
|---|---|---|
| A member's own `PodMembership`, `PodRequest`, `PodInvitation` rows | The member themselves; their Pod's Steward (for rows targeting their Pod); Admins | Other members of the same Pod (a member does not see *why* another member joined or their private reassignment history) |
| `PodMessage` content | Participants only (`ConversationParticipant` whitelist, identical enforcement to existing 1:1 messaging, ADR-012's "never re-derived from possibly-stale state" invariant) | Anyone outside the Pod; the AI Engine (§7) |
| `PodEventRsvp.attended` (individual) | The member; their Pod's Steward; Admins | Other Pod members' individual attendance is not exposed to fellow members by default — **⚑ Decision Needed:** should fellow Pod members see each other's RSVP/attendance at all? Article VI frames Pods as noticing *for the sake of care*, which argues for at least RSVP visibility within the Pod (so members can plan a shared meal, etc.) — attendance history over time is a different, more surveillance-adjacent question. **Recommendation:** RSVPs (upcoming) visible to fellow Pod members; historical attendance records visible only to the member themselves and their Steward. |
| `faithPreference` | The member only, and — if the member explicitly consents when setting it — their own Pod's Steward, for the sole purpose of respectful pastoral sensitivity | Never the AI Engine's grounding context (§7), never any aggregate metric, never any other member by default |
| `PodMetrics` (aggregate, §1.10) | Steward (their own Pod); Admins (platform-wide); a de-identified, Pod-level subset feeds Institutional Wisdom (§7) | No per-member breakdown ever leaves the Pod's own Steward/Admin view |

**What is structurally impossible, not merely policy:**

- No endpoint returns another member's individual attendance history, message content outside their own conversations, or `faithPreference` value.
- The AI Engine (§7) is never given a member-identified data feed for Pods — only Pod-level aggregates, and only the same aggregate fields defined in §1.10, computed the same way whether a human or the AI Engine requests them.
- No "engagement score" or per-member ranking is computed or stored anywhere.

**⚑ Decision Needed:** does a Pod Steward's escalation (§4, reusing `StewardshipEscalation`) about a specific member require that member's awareness/consent, or may it remain confidential like personal-steward escalations already do (`StewardshipNoteVisibility.PRIVATE` precedent)? **Recommendation:** reuse the exact existing precedent — escalations are Steward/Admin-visible only by default, exactly as personal-steward escalations already work; no new visibility rule needed, no new privacy surface introduced.

---

## 7. AI Integration

The founder's instruction is unambiguous and is treated as the load-bearing constraint of this entire section: **the AI Engine never monitors members.** Two, and only two, AI touchpoints are proposed, both extending the existing `AiModule` (WO-029) rather than building new AI infrastructure:

### 7.1 Pod Match Suggestion (extends `RecommendationsService`)

Adds `POD` as a fourth `AiRecommendationTargetType` (alongside `OPPORTUNITY`/`RESOURCE`/`COURSE` from WO-029) — a new nullable `podId` FK on `AiRecommendation`, one new capability enum value (`POD_MATCH`), one new prompt template. Candidate pool comes from the deterministic scoring function (§2.3), never from the AI Engine itself deciding which Pods exist or who belongs where — the AI's role is exactly what it already is for every other recommendation type: write a short, human rationale for a shortlist a deterministic function already produced, and the result is always `PENDING`, never auto-applied (§2.3, reaffirming ADR-015 Decision 6 for a second domain).

### 7.2 Institutional Wisdom — aggregated, privacy-preserving insight generation

This is the genuinely new AI capability the founder's brief asks for, and it is scoped narrowly on purpose:

- **Input:** *only* the Pod-level aggregate metrics already defined in §1.10 (attendance rate, size/stability, service-project completion, meeting cadence) — computed identically to how a human Steward would see them, across some or all Pods, with counts small enough that no individual is identifiable (a documented **minimum-Pod-count threshold** before any cross-Pod aggregate is generated, e.g. "at least 5 Pods" — the same k-anonymity-style discipline any privacy-conscious aggregate reporting system uses).
- **Output:** natural-language, Pod-*pattern*-level observations for institutional learning (Article X: "what strengthens Human Flourishing") — e.g. "Pods with biweekly (vs. monthly) cadence show meaningfully higher attendance consistency" — never a sentence that could resolve to an individual member or an individual Pod's identity.
- **What it explicitly does not do:** it does not read `PodMessage` content, individual RSVP/attendance records, `faithPreference`, or any other member-identified field. It does not run continuously or "watch" — it is a human-triggered (Admin/Founder-facing) report-generation call, using the same `AiRequestsService.runCompletion()` single-call-path infrastructure WO-029 already built, logged the same way (one `AiRequest` row, cost/audit tracked identically).
- **Reuse:** this is architecturally the same shape as WO-029's Knowledge Search — retrieve real data (here, aggregates instead of articles), then ask the provider to synthesize — not a new AI subsystem.

**⚑ Decision Needed:** should this Institutional Wisdom report-generation endpoint be Admin-only, or should individual Pod Stewards be able to request it scoped to just their own Pod's history (e.g., "how has my Pod's health trended")? **Recommendation:** both — a Pod-scoped version (Steward, their own Pod only) and a platform-wide cross-Pod version (Admin only), same underlying aggregation function, different authorization scope, exactly mirroring how `AiRequestsController`/`InsightsController` already separate owner-scoped and platform-wide reads elsewhere.

---

## 8. Cross-Domain Integration Plan

| System | Integration | New coupling? |
|---|---|---|
| Member Core | `PodMembership.userId`, `PodEvent.createdById`, etc. — real FKs to `User`, same pattern as every domain since WO-024 | No — reuse |
| Stewardship System | `StewardshipEscalation.podId` (nullable, additive), role-based gating (`STEWARD` in Pods' own staff-role set, mirroring `ACADEMY_STAFF_ROLES`) | Additive column only |
| Communication System | `ConversationType.POD`, `Conversation.podId` (nullable, additive); `NotificationCategory.POD` — **already forward-provisioned in WO-026**, zero migration needed, third such value now consumed (`ACADEMY` proven WO-028, `AI_GUIDANCE` proven WO-029, `POD` now proven WO-030) | Additive columns only — the exact extension point ADR-012 Decision 8 pre-declared |
| Journey Engine / Goals | Read-only, matching signal (§2.2) and possibly Pod-level "shared goal" framing for Interest Pods | Read-only |
| Academy | Read-only, listed as an input in PA-009 (shared learning) — **⚑ Decision Needed:** is any concrete Academy↔Pods integration in scope for V1 (e.g., a Pod collectively enrolling in a Learning Path), or is this Future Extension Point only, as Academy's own ADR-014 already flagged ("Pods consuming Learning Paths as shared group curricula, once Pods exists")? **Recommendation:** Future Extension Point only for V1 — PA-009 lists Academy as an input/output relationship, not a required V1 feature, and ADR-014 already named this as deferred pending Pods' existence, not as a Pods-WO deliverable. |
| AI Intelligence Engine | Extends `RecommendationsService` (§7.1) and `AiRequestsService` (§7.2); Pods imports `AiModule`'s exported pieces the same way any domain would — **⚑ note:** this direction is the *reverse* of WO-029's own dependency graph (Pods depends on AI, not AI depends on Pods) so no circular-dependency risk, same reasoning as ADR-015 Decision 10 but with the arrow flipped |
| Knowledge System | Read-only — Institutional Wisdom (§7.2) is a natural candidate for eventually publishing back as Knowledge articles; **out of scope for V1**, a Future Extension Point |
| Business Portal | No integration identified — PA-009 does not name Organization as an input/output for Pods |

No circular module dependency is anticipated: Pods reads from Stewardship, Communication, and AI; nothing among those needs to read from Pods. If AI's `RecommendationsService` needs to validate a `podId` target exists, it imports Pods' exported repository token the same way it already imports `CoursesService` from Academy — Pods sits structurally where Academy/Knowledge/Opportunities/Resources sit today (a leaf consumed by AI, not itself consuming AI's own module in a way that would cycle back).

---

## 9. Reuse Map (Summary)

| Pattern | Prior ADR | Applied to |
|---|---|---|
| `interface → Prisma repository → service → controller → DTO` layering | ADR-003 | Every Pods sub-domain |
| Sequence-ref (`AUR-POD-000001`) | ADR-006 and every domain since | `Pod` |
| Domain-specific status enum (not `VerificationStatus`) | ADR-014 Decision 2 | `PodStatus` |
| Real-FK relationship lifecycle (never rewritten, only superseded) | ADR-011 (`StewardshipRelationship`) | `PodMembership` |
| AI recommendation always `PENDING`, never auto-applied | ADR-011 (`AI_RECOMMENDATION` origin), ADR-015 Decision 6 | `PodMembership{origin: AI_MATCH_SUGGESTION}`, `AiRecommendation{podId}` |
| N-participant conversation, pre-declared extension point | ADR-012 Decision 8 | `PodMessage` (reuses `Conversation`/`Message` directly) |
| Forward-provisioned `NotificationCategory` | ADR-012 Decision 3 | `NotificationCategory.POD` |
| Configurable limit as a column default, never a code constant | ADR-011 Decision 4 (`StewardCapacity.maxActiveMembers`) | `Pod.capacity`, dormancy threshold |
| Escalation reuse instead of a parallel system | ADR-011 (`StewardshipEscalation`) | Pod Steward concern-raising (§4) |
| Location as plain city/state/country strings, not geospatial | `Opportunity`/`Resource` precedent | `Profile` extension (§2.1) |
| Single-call-path audit/cost/history logging | ADR-014 Decision 7, ADR-015 Decision 3 | Institutional Wisdom report generation (§7.2) |

---

## 10. Decisions Requiring Founder Confirmation (Consolidated)

For convenience, every **⚑ Decision Needed** flagged above, in one place:

1. **Location data shape** (§2.1) — coarse city/state/country strings on `Profile` (recommended) vs. precise geocoding vs. fixed region list.
2. **Secondary-signal data home** (§2.2) — extend `Profile` (recommended) vs. a separate matching-specific profile model.
3. **Stage-of-life taxonomy** (§2.2) — the exact category list is founder-authored content, not an engineering decision.
4. **Meeting-schedule auto-generation** (§1.5) — informational-only in V1 (recommended) vs. auto-creating future `PodEvent` rows.
5. **Who may send a Pod Invitation** (§1.9) — Steward-only for Home Pods / any member for Interest Pods (recommended), or a single rule for both.
6. **Home Pod offering** (§3) — proactive suggestion after registration (recommended) vs. only on member request.
7. **First Steward on a proposed-and-approved new Pod** (§3, §4) — the proposer becomes Steward automatically, or an Admin assigns one separately.
8. **Who assigns a Pod Steward** (§4) — Admin/Platform-Steward only in V1 (recommended) vs. member nomination/election.
9. **Pod-splitting/multiplication lineage** (§5) — no special tracking in V1 (recommended) vs. a `parentPodId` lineage field.
10. **RSVP/attendance visibility among fellow Pod members** (§6) — upcoming RSVPs visible, historical attendance private to member+Steward (recommended), vs. a different split.
11. **Escalation confidentiality re: the member concerned** (§6) — reuse existing Steward/Admin-only visibility (recommended) vs. a new consent-based rule.
12. **Academy↔Pods concrete integration scope for V1** (§8) — Future Extension Point only (recommended) vs. a concrete V1 feature.
13. **Institutional Wisdom endpoint scoping** (§7.2) — both Pod-scoped (Steward) and platform-wide (Admin) versions (recommended) vs. Admin-only.

None of these block *starting* implementation of the uncontested majority of the domain (the entities, the reuse of `Conversation`/`StewardshipEscalation`/`NotificationCategory.POD`, the deterministic matching function's basic shape). They are called out because each is a real product/privacy judgment call, not because the domain cannot be built without an answer to every one — where a recommendation is stated above, silence from the founder on a given item will be read as approval of that recommendation specifically, not of the document as a whole, unless the founder indicates otherwise.

---

## 11. Explicitly Out of Scope for V1 (Non-Goals)

- Real geospatial (PostGIS) matching — already a platform-wide Post-Launch Candidate, not Pods-specific.
- A structured weekly-availability-grid for scheduling — free-text `availabilityNotes` is the V1 shape.
- Auto-generated recurring `PodEvent`s from `PodMeetingSchedule` (pending §1.5's decision).
- Pod-splitting lineage tracking (pending §5's decision).
- Member nomination/election workflows for Pod Steward selection (pending §4's decision).
- Rich meeting facilitation tooling (agendas-as-data, live note-taking, structured action-item tracking) — OAS-OPS-104 is a facilitation script for the human Steward to follow, not a feature backlog; `PodEvent` stores that a meeting happened and who attended, nothing more.
- Academy↔Pods concrete features (shared group enrollment, etc.) — Future Extension Point, already named as such in ADR-014.
- Knowledge System publication of Institutional Wisdom findings — Future Extension Point.
- Continuous/background AI monitoring of any kind — explicitly and permanently out of scope, not merely deferred; this is a constitutional boundary (Article VI), not a V1-scoping choice.

---

## 12. What Happens After Approval

Once this specification is reviewed, the founder may approve it as written, approve it with amendments to any numbered decision in §10, or request changes to the domain model itself. Upon approval, implementation proceeds exactly as every prior domain WO has: Prisma schema + migration, sub-domain-by-sub-domain service/controller/DTO implementation with incremental typechecking, unit/integration/e2e tests, ADR-016, the WO-030 completion document (a separate file from this specification), an Operational Verification Report, and the `version-1-readiness.md` update — commit, push, PR, CI, merge, exactly as WO-024 through WO-029 have each done.
