# WO-030 — Pods (PA-009) — Founder Review Engineering Specification

| Field | Value |
|---|---|
| Work Order Number | WO-030 |
| Title | Pods (PA-009) |
| Status | **FOUNDER REVIEW COMPLETE — all 13 Founder Decisions approved. Presented for final confirmation before implementation begins.** |
| Date | 2026-07-15 |
| Governing Documents | OAS-ACA-009 (Pods, constitutional), PA-009 (Pods Architecture), OAS-OPS-010 (Pod Operations Framework), OAS-OPS-104 (Pod Meeting SOP) |

This document is the engineering specification for the last of the twelve PA-020-named Version 1 backend systems. It has been revised in full following a decision-by-decision Founder Review in which all 13 open questions were resolved, several with constitutional amendments that reshape the design beyond the original engineering recommendation. This version supersedes the original draft in its entirety — no section below states an option the founder did not choose. **No code will be written until the founder confirms this revised specification.**

---

## 0. Constitutional Grounding

OAS-ACA-009 is unusually explicit and unusually strict for a technical specification to answer to. This section states plainly how the engineering design answers to it, before any schema or API is described:

- **"They do not exist to manage people. They exist to care for people."** (Article I) — the domain model has no entity or field whose purpose is managerial control. No performance scores are exposed to the Institution, no member is ranked. Where a field could be misread that way, it is named and scoped narrowly (§6, §7).
- **"Freedom of Belonging... never imprisonment"** (Article VIII) — every membership-forming action is reversible by the member's own request, and no automated process finalizes a Pod assignment without the member's own confirmation (§2, §3).
- **"Pods do not exist to monitor people... every response shall preserve personal freedom while extending genuine concern"** (Article VI) — the hardest constraint in the document. §6 (Privacy Model) and §7 (AI Integration) received the most scrutiny during Founder Review for exactly this reason.
- **"True friendship shall never be forced. It shall always be invited."** (Article IV) — Pod Invitations (§1.9) are opt-in on both sides; nothing in this design auto-enrolls a member in any Pod.
- **"Leadership is entrusted. It is never owed."** (Article XI) — Pod Steward is a role entrusted through institutional appointment, not a rank a member accumulates through metrics or campaigning; §4 makes this explicit.

### 0.1 Constitutional Principles Adopted During Founder Review

Founder Review did not merely select between engineering alternatives. Each of the 13 decisions added a named constitutional principle that now governs this domain permanently, not just its V1 implementation. These are recorded here as a single reference, and are restated in the section where each applies:

1. *"The Institution takes the first step so that no person unnecessarily walks life's journey alone."*
2. *"Stewardship is entrusted, continually reaffirmed, and always exercised in service of the Mission."*
3. *"Pods grow through both stewardship and friendship."*
4. *"Confidentiality exists to protect people, never to protect abuse, neglect, or injustice."*
5. *"The purpose of noticing is to extend care, never to measure worth."*
6. *"AI assists Stewards in understanding communities. It does not judge the people entrusted to their care."*
7. *"The Institution learns about people because they choose to share who they are — not because it defines who they are."*
8. *"Collect only what is genuinely needed to faithfully serve the person."*
9. *"People are not defined by categories. Seasons change, people grow, and Aureus shall always honor the dignity of each person's unique journey."*
10. *"Automation shall remove unnecessary administrative burden, but it shall never replace intentional stewardship."*
11. *"The Institution remembers its history, not to preserve status, but to preserve wisdom."*
12. *"Knowledge becomes wisdom when it is lived in community."*

---

## 1. Domain Model

Ten entities were named in the founder's original brief; the approved decisions add one field (`parentPodId`) and refine several enums. Each entity below states its purpose, its key fields (Prisma-shaped, for concreteness — not final syntax), and which existing platform pattern it reuses.

### 1.1 `Pod`

The community itself.

```
Pod {
  id, sequenceNumber, podRef            // AUR-POD-000001, same ref pattern as every other domain
  name, shortDescription, fullDescription
  type            PodType               // HOME | INTEREST  (§3)
  status          PodStatus             // FORMING | ACTIVE | DORMANT | ARCHIVED  (§5)
  capacity        Int  @default(12)     // configurable ceiling, StewardCapacity pattern (§4)
  primaryLanguage String?               // matching signal, §2
  parentPodId     String?               // Stewardship Origin — see §5. NOT hierarchy, ownership, or ranking.
  createdAt, updatedAt, deletedAt        // soft delete, platform-wide convention

  parentPod       Pod? @relation("PodStewardshipOrigin", fields: [parentPodId], references: [id])
  childPods       Pod[] @relation("PodStewardshipOrigin")

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

**Reuse:** the `AUR-POD-000001` sequence-ref pattern, soft delete, and a domain-specific status enum (`AcademyContentStatus` precedent, ADR-014 Decision 2) are all direct reuse. `PodStatus` is intentionally *not* the shared `VerificationStatus` enum — a Pod is a living group with an operational lifecycle (§5), not publishable content with a moderation workflow.

**`parentPodId` — Founder Decision #11 (Stewardship Origin).** A nullable, self-referencing FK recording which Pod a new Pod multiplied from. Its purpose is explicitly *not* genealogy, hierarchy, ownership, or ranking — a child Pod is a fully independent community from the moment it is created, entrusted with its own stewardship and mission. The field exists solely to preserve institutional memory: fifty years from now, Aureus should be able to see that one faithfully-nurtured Pod became two, then five, then a hundred — not because growth was chased, but because healthy community naturally gave rise to new community. This is data for Institutional Wisdom (§7.2) and historical remembrance, never for permissions, access, or standing. *Constitutional Principle: "The Institution remembers its history, not to preserve status, but to preserve wisdom."*

### 1.2 `PodMembership`

The core join entity — who belongs to which Pod, and how.

```
PodMembership {
  id
  podId, userId
  role            PodMemberRole        // MEMBER | STEWARD  (§4 — distinct from platform-wide STEWARD role)
  status          PodMembershipStatus  // PENDING | ACTIVE | DECLINED | DEFERRED | ENDED
  origin          PodMembershipOrigin  // MEMBER_REQUEST | AI_MATCH_SUGGESTION | STEWARD_INVITATION | ADMIN_ASSIGNMENT
  joinedAt, endedAt, endReason
  createdAt, updatedAt

  @@unique([podId, userId, status])  // conceptually: one ACTIVE membership per (pod, user) pair
}

enum PodMemberRole        { MEMBER, STEWARD }
enum PodMembershipStatus  { PENDING, ACTIVE, DECLINED, DEFERRED, ENDED }
enum PodMembershipOrigin  { MEMBER_REQUEST, AI_MATCH_SUGGESTION, STEWARD_INVITATION, ADMIN_ASSIGNMENT }
```

**Reuse:** this is `StewardshipRelationship`'s exact shape — a real-FK join row with a `status`/`origin` lifecycle, rows never deleted or rewritten, only superseded. `AI_MATCH_SUGGESTION` always lands `PENDING`, mirroring `StewardshipRelationshipOrigin.AI_RECOMMENDATION`'s own permanent `PENDING` landing (§2, §7).

**`DECLINED` and `DEFERRED` — Founder Decision #1.** A Home Pod invitation is never automatic assignment. A member responds to a proactive Home Pod invitation with one of four outcomes: accept (→ `ACTIVE`), decline (→ `DECLINED`), defer for later (→ `DEFERRED`, revisitable), or request a different Pod (a `PodRequest{type: REASSIGNMENT}`, §3). `DECLINED` and `DEFERRED` are distinct from `ENDED` — they describe a response to an invitation that never became membership, not membership that concluded. *Constitutional Principle: "The Institution takes the first step so that no person unnecessarily walks life's journey alone."*

A member's **Home Pod** is their one `ACTIVE` `PodMembership` where `Pod.type = HOME`; **Interest Pods** are additional `ACTIVE` memberships where `Pod.type = INTEREST`. No separate "home pod" field is needed on `User` — it is derived, matching the platform's consistent avoidance of denormalized state.

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

**Reuse:** a new entity — nothing in the platform today models "a scheduled gathering with RSVPs." Kept intentionally minimal (OAS-OPS-104's meeting SOP describes a facilitation script for the human Steward to follow, not data the platform needs to store — §11).

**Creation flow — Founder Decision #10.** `PodEvent` creation is always an intentional, human act by the Steward — never auto-generated by a background job. See §1.5 for the prefill capability that assists (but never replaces) that act.

### 1.5 `PodMeetingSchedule`

The *recurring pattern*, separate from individual `PodEvent` instances.

```
PodMeetingSchedule {
  id, podId  @unique          // one active schedule per Pod
  cadence         MeetingCadence   // WEEKLY | BIWEEKLY | MONTHLY | AD_HOC
  dayOfWeek       Int?             // 0-6, null for AD_HOC
  timeOfDay       String?          // "19:00", stored as text — no timezone-aware scheduling infra exists yet
  location        String?
  durationMinutes Int?
  createdById
  createdAt, updatedAt
}
```

**Founder Decision #10 — informational, with intelligent prefill.** `PodMeetingSchedule` never auto-generates future `PodEvent` rows in V1 — no background-job or cron-like recurrence infrastructure is introduced, consistent with the fact that no other domain in this platform has needed one yet (WO-023's email delivery remains synchronous, per ADR-009 Decision 4's own Known Limitation). Instead, when a Steward starts creating the Pod's next `PodEvent`, the creation form is **pre-filled** from `PodMeetingSchedule`'s stored defaults (cadence-derived date, `location`, `durationMinutes`) plus the Pod's own prior-event history where relevant. The Steward reviews, edits as needed, and publishes — the act of calling the community together remains theirs, every time. A future version may introduce optional recurring generation, but only if it strengthens stewardship without replacing intentional leadership. *Constitutional Principle: "Automation shall remove unnecessary administrative burden, but it shall never replace intentional stewardship."*

### 1.6 `PodMessage` — *not a new model*

Reuses `Conversation`/`Message`/`ConversationParticipant` (WO-026/ADR-012) directly, per that ADR's own explicit forward-declaration:

> "`ConversationParticipant` is already a proper join table, not a fixed two-column pair — extending to N participants later is additive, not a redesign." — ADR-012 Decision 8

The additive change: extend `ConversationType` with `POD`, add a nullable `podId` FK to `Conversation` (alongside the existing `relationshipId`/`organizationId`), and populate `ConversationParticipant` with every `ACTIVE` `PodMembership` row for that Pod. Zero changes to `Message` itself.

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

**Reuse:** the same minimal-status-enum shape as everything else; deliberately has no task list, budget, or volunteer sign-up matrix.

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

**Reuse:** the Pods-domain equivalent of `StewardshipRelationship`'s `requestSteward()` entry point — member-initiated, always reviewed, never silently auto-applied. `PROPOSE_NEW_POD` is the member-initiated path to forming a new Interest Pod (§3, §5). An approved `PROPOSE_NEW_POD` request creates a new `Pod{status: FORMING}`; per Founder Decision #2, the proposer does **not** automatically become that Pod's Steward — its first Steward is institutionally appointed, exactly like every other Pod's Steward (§4).

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

**Founder Decision #3 — split-by-type invitation model.** Who may issue a `PodInvitation` depends on the target Pod's `type`:

| Pod type | Who may invite |
|---|---|
| `HOME` | Pod Steward or the Institution only — preserves intentional matching and community health |
| `INTEREST` | Any `ACTIVE` member of that Pod — encourages authentic friendship and organic community growth |

All invitations remain voluntary regardless of type; a member may always accept, decline, defer, or leave. *Constitutional Principle: "Pods grow through both stewardship and friendship."*

### 1.10 `PodMetrics` — *aggregate, not a stored entity per member*

Per Article X and the founder's non-surveillance instruction, **Pod Metrics are computed on read, at the Pod level, never persisted per-member.** No `PodMetrics` table exists in the schema. A `GET /pods/:id/metrics` endpoint computes, on demand, from existing rows:

- Meeting attendance rate (aggregate % across `PodEventRsvp.attended`, Pod-level only)
- Membership size and stability (active member count, average tenure)
- Service project count/completion rate
- Meeting cadence adherence (scheduled vs. actually-held `PodEvent`s)

See §7.2 for how these aggregates feed AI-generated insight, and §6 for the full visibility model.

---

## 2. Matching Philosophy

### 2.1 Primary Signal: Geographic Proximity — Founder Decision #8

Version 1 uses **coarse geographic matching** through member-provided location information — never precise geolocation or geocoding. `Profile` is extended with:

```
Profile {
  ...
  city                    String?
  region                  String?   // e.g. a metro area, county, or district — not always equal to "state"
  stateProvince           String?
  country                 String?
  localAreaDescription    String?   // free text — "describe the community area you consider local to you"
  ...
}
```

Members may describe the community area they consider local to them in their own words via `localAreaDescription`, in addition to (or instead of, where they choose) the structured fields — Aureus collects only the minimum location information reasonably necessary to help members discover meaningful local community. Matching scores proximity as: same city > same region/state > same country > no match, with `localAreaDescription` available to a Steward reviewing a match by hand but not used in the deterministic scoring function itself (free text is not reliably matchable by code).

Real geospatial (PostGIS-style) matching remains a documented, deferred **Post-Launch Candidate**, shared with the same deferred need already named for Opportunities and Resources — never built for Pods first, ahead of those two domains. Future geographic precision may be considered only if it clearly strengthens Human Flourishing while preserving privacy, dignity, stewardship, transparency, and member control — not merely because it would be more precise or convenient. *Constitutional Principle: "Collect only what is genuinely needed to faithfully serve the person."*

### 2.2 Secondary Signals — Founder Decisions #7 and #9

All secondary matching signals are proposed as extensions of the existing `Profile` model (Founder Decision #7) rather than a separate matching-specific profile — every field below is **optional, member-owned, editable, removable, and purpose-bound**. Members retain full control over whether the information is provided at all, and whether it is used for recommendations. *Constitutional Principle: "The Institution learns about people because they choose to share who they are — not because it defines who they are."*

| Signal | Data source | Final shape |
|---|---|---|
| Interests | `UserInterest` (existing, `OpportunityCategory`-scoped) | Reused as-is — already category-based and general-purpose; no parallel Pods-specific interest taxonomy. |
| Goals | `Goal`/`Journey` (existing) | Reused directly — no new field. |
| Profession | *(new)* | `Profile.profession` — free text, optional. |
| Season of life | *(new)* | `Profile.seasonOfLife` — see below, Founder Decision #9. |
| Schedule/availability | *(new)* | `Profile.availabilityNotes` — free text in V1; a structured availability grid remains a Future Extension Point. |
| Language | *(new)* | `Profile.preferredLanguage`. |
| Voluntary faith preference | *(new)* | `Profile.faithPreference` — nullable, member-set-only, never defaulted, never required. The single most privacy-sensitive field in the domain (§6): never shown to the AI Engine's aggregate-metrics surface (§7), never a required field, always editable back to blank. |
| Compatibility | *(computed, not stored)* | The *output* of combining all signals, computed at match time — never persisted as a score. |

**`SeasonOfLife` — Founder Decision #9 (renamed from the original draft's "Stage of Life").** A short, member-selected enum describing a person's *current* life season, not a demographic classification:

```
enum SeasonOfLife {
  STUDENT
  EARLY_CAREER
  YOUNG_FAMILY
  ESTABLISHED_CAREER
  MID_LIFE_TRANSITION
  EMPTY_NEST
  RETIRED
  OTHER
}
```

No season is considered higher, lower, better, or more valuable than another. The field's sole purpose is to strengthen Human Flourishing through more meaningful community recommendations — never to categorize or rank members. Optional, member-owned, editable, and changeable at any time, per the same standard as every other secondary signal. *Constitutional Principle: "People are not defined by categories. Seasons change, people grow, and Aureus shall always honor the dignity of each person's unique journey."*

### 2.3 The Matching Algorithm Itself

Explicitly not an ML model, not a black box, and not autonomous — consistent with ADR-015 Decision 4's "tool orchestration means deterministic cross-service calls, not an LLM-driven agent loop." Pod matching is a deterministic, code-defined scoring function (weighted sum: proximity dominant, secondary signals additive) that ranks candidate Pods for a member. Per §7.1, the AI Engine may then generate a *human-readable rationale* for the top suggestion(s) — mirroring how `RecommendationsService` already works for Opportunities/Resources/Courses. The scoring function is ordinary, testable application code, not a model requiring training data.

The result of matching is always a `PodMembership` with `status: PENDING`, `origin: AI_MATCH_SUGGESTION` (or a `PodRequest` if member-initiated) — **never** a silent, immediately-`ACTIVE` assignment. This directly satisfies Article VIII and reaffirms the platform's existing rule that AI recommends, never acts (ADR-015 Decision 6).

---

## 3. Membership Model

- **Home Pod — Founder Decision #1.** Aureus proactively prepares a recommended Home Pod invitation once sufficient matching information exists (a `PodMembership{status: PENDING, origin: AI_MATCH_SUGGESTION}`). This invitation is never assignment — it is an act of hospitality and stewardship, communicating welcome before expectation. The member may accept, decline, defer, or request a different Home Pod at any time (§1.2). The Institution reaches out first, in the spirit of Article III's "shall have the opportunity to belong," while fully preserving freedom, dignity, and personal agency.
- **Interest Pods:** any number of additional `ACTIVE` `PodMembership` rows where `Pod.type = INTEREST`. No cap proposed in V1 beyond ordinary rate-limiting on request creation (reuse of `ThrottlerModule`, ADR-015 Decision 8's precedent).
- **Reassignment:** a `PodRequest{type: REASSIGNMENT}` — ends the current `PodMembership` (`status → ENDED`, `endReason` recorded) and creates a new one, mirroring `StewardshipRelationship`'s reassignment shape.
- **Propose a new Pod:** a `PodRequest{type: PROPOSE_NEW_POD}` — reviewed by a Steward/Admin; if approved, creates a new `Pod{status: FORMING}`. Per Founder Decision #2, its first Steward is institutionally appointed, not automatically the proposer (§4).

---

## 4. Steward Responsibilities

Two "steward" concepts coexist in this platform and remain deliberately distinct:

| | `StewardshipRelationship` (WO-025) | Pod Steward (this WO) |
|---|---|---|
| Shape | 1:1, one member ↔ one personal steward | 1:N, one Steward role within one Pod's membership |
| Purpose | Personal accountability/guidance for one member's individual journey | Servant-leadership for a whole small community (Article V) |
| Constitutional source | PA-012 | OAS-ACA-009 Article V |
| Data model | Existing `StewardshipRelationship` table | `PodMembership.role = STEWARD` |

A platform `STEWARD`-role user may hold both simultaneously, for different people — a Pod Steward for their Pod's dozen members, and a personal `StewardshipRelationship` steward for one or two individuals elsewhere. These are never merged into one relationship type.

**Responsibilities, translated into platform authority:**

- Approve/decline `PodRequest`s targeting their Pod (join, leave, reassignment away).
- Create/manage `PodInvitation`s for Home Pods they steward (§1.9).
- Create/manage `PodEvent`s and the Pod's `PodMeetingSchedule`, including reviewing and publishing prefilled meeting drafts (§1.5).
- Mark `PodEventRsvp.attended` after a meeting.
- Propose/manage `PodServiceProject`s.
- Escalate a concern about a member — reuses `StewardshipEscalation` directly (§6).
- Request AI-generated aggregate insight about their own Pod (§7.2).

**Founder Decision #2 — Institutional Appointment.** Version 1 uses Institutional Appointment for *all* initial Pod Steward appointments, including a newly-formed Pod's first Steward (resolving both "who assigns a Pod Steward" and "who becomes Steward of a proposed-and-approved new Pod" as one rule). Pod Stewards are recognized based on demonstrated stewardship, wisdom, humility, compassion, responsibility, service, and love — never popularity, campaigning, or election. Stewardship is not a title permanently held: it is continually entrusted, and may be reaffirmed, coached, transitioned, or concluded through faithful institutional review (mirrors `StewardshipRelationship`'s `ADMIN_ASSIGNMENT`/`ORGANIZATION_ASSIGNMENT` origins and lifecycle, applied here to `PodMembership.role = STEWARD`). Future versions may explore additional stewardship recognition mechanisms only if they strengthen Human Flourishing, preserve the Mission, and remain faithful to the principle that leadership is entrusted rather than sought. *Constitutional Principle: "Stewardship is entrusted, continually reaffirmed, and always exercised in service of the Mission."*

---

## 5. Pod Lifecycle

```
FORMING → ACTIVE → DORMANT → ACTIVE (revival)
                 → ARCHIVED (terminal)
```

- **FORMING:** a newly-approved `PROPOSE_NEW_POD` request, or a newly-matched Home Pod cluster below minimum viable size. Not yet visible in general Pod discovery; a Steward is being institutionally appointed (§4).
- **ACTIVE:** normal operation.
- **DORMANT:** no `PodEvent` held within a configurable window (`dormancyThresholdDays`, a column default rather than a hardcoded value, mirroring `StewardCapacity.maxActiveMembers`) — a signal for Steward/Admin attention, never an automatic termination.
- **ARCHIVED:** terminal, soft-deleted equivalent — history preserved (messages, events, memberships all remain queryable for the members who were part of it).

**Multiplication and `parentPodId` — Founder Decision #11.** When a large, healthy Pod gives rise to a new Pod (OAS-OPS-010's "Growth and Multiplication"), the new `Pod` row may optionally record `parentPodId` pointing to the Pod it multiplied from. This is ordinary Admin-driven Pod creation plus ordinary reassignment `PodRequest`s for the members who move — `parentPodId` adds no new workflow, only a single optional pointer set at creation time. It exists to preserve institutional memory and support future Institutional Wisdom about how healthy communities naturally grow, never to establish hierarchy, ownership, or ranking between parent and child Pods — every Pod remains a fully independent community from the moment it exists. *Constitutional Principle: "The Institution remembers its history, not to preserve status, but to preserve wisdom."*

---

## 6. Privacy Model

Conservative by default, not permissive by default.

**What is visible to whom:**

| Data | Visible to | Never visible to |
|---|---|---|
| A member's own `PodMembership`, `PodRequest`, `PodInvitation` rows | The member themselves; their Pod's Steward (for rows targeting their Pod); Admins | Other members of the same Pod |
| `PodMessage` content | Participants only (`ConversationParticipant` whitelist, identical enforcement to existing 1:1 messaging) | Anyone outside the Pod; the AI Engine (§7) |
| Upcoming `PodEventRsvp.response` | Fellow Pod members — supports ordinary community life (e.g. planning a shared meal) | — |
| Historical `PodEventRsvp.attended` records | The member themselves; their Pod's Steward; Admins, only when reasonably necessary for stewardship | Fellow Pod members. Attendance is never presented as a public performance metric, ranking, or score — anywhere, including to the member about themselves. |
| `faithPreference` | The member only, and — only if the member explicitly consents when setting it — their own Pod's Steward, for respectful pastoral sensitivity | Never the AI Engine's grounding context (§7), never any aggregate metric, never any other member by default |
| `PodMetrics` (aggregate, §1.10) | Steward (their own Pod, on request — §7.2); Admins (platform-wide); a de-identified, Pod-level subset feeds Institutional Wisdom (§7.2) | No per-member breakdown ever leaves the Pod's own Steward/Admin view |

**Founder Decision #5 — RSVP and attendance visibility.** Upcoming RSVP visibility remains available to Pod members to support ordinary community life. Attendance *history* is available only to the Pod Steward and the Institution, when reasonably necessary for stewardship. Attendance shall never be presented as a public performance metric; it exists solely to help Stewards notice when someone may benefit from care, and shall never determine a person's value, commitment, standing, or worth. *Constitutional Principle: "The purpose of noticing is to extend care, never to measure worth."*

**What is structurally impossible, not merely policy:**

- No endpoint returns another member's individual attendance history, message content outside their own conversations, or `faithPreference` value.
- The AI Engine (§7) is never given a member-identified data feed for Pods — only Pod-level aggregates already defined in §1.10, computed the same way whether a human or the AI Engine requests them.
- No "engagement score" or per-member ranking is computed or stored anywhere.

**Founder Decision #4 — escalation confidentiality, reframed constitutionally.** Pod Steward concern-raising reuses the existing `StewardshipEscalation` pattern directly (§4), with a constitutional redefinition that now governs the entire escalation system, not only Pods: **every escalation is a confidential request for additional stewardship, never an accusation, disciplinary record, or presumption of wrongdoing.** Escalations exist solely to improve care and support, and record only the minimum information reasonably necessary to provide that care. No automatic adverse action may result from an escalation alone. Stewards are accountable for using this process faithfully, truthfully, and in good faith. Visibility remains Steward/Admin-only by default (the existing `StewardshipNoteVisibility.PRIVATE` precedent), and — because confidentiality exists to protect people rather than to shield misconduct — **any Pod member, not only the Steward, may raise an escalation**, including one concerning the conduct of their own Pod's Steward. *Constitutional Principle: "Confidentiality exists to protect people, never to protect abuse, neglect, or injustice."*

---

## 7. AI Integration

The founder's instruction is the load-bearing constraint of this section: **the AI Engine never monitors members.** Two AI touchpoints are proposed, both extending the existing `AiModule` (WO-029) rather than building new AI infrastructure.

### 7.1 Pod Match Suggestion (extends `RecommendationsService`)

Adds `POD` as a fourth `AiRecommendationTargetType` (alongside `OPPORTUNITY`/`RESOURCE`/`COURSE`) — a new nullable `podId` FK on `AiRecommendation`, one new capability enum value (`POD_MATCH`), one new prompt template. The candidate pool always comes from the deterministic scoring function (§2.3), never from the AI Engine deciding which Pods exist or who belongs where. The AI's role is exactly what it already is for every other recommendation type: write a short, human rationale for a shortlist a deterministic function already produced. The result is always `PENDING`, never auto-applied (§2.3, §3).

### 7.2 Institutional Wisdom — Steward-initiated and aggregated, privacy-preserving insight generation

**Founder Decision #6.** Pod Stewards may request AI-generated insights about their own Pod, using only information they are already constitutionally authorized to access (the §1.10 aggregate metrics for that Pod). The AI provides aggregated, community-level insight designed to strengthen stewardship, Human Flourishing, and community health — it shall never generate behavioral scores, risk ratings, labels, or judgments about individual members. Every insight shall be explainable, actionable, and directed toward helping the Steward better serve the community. *Constitutional Principle: "AI assists Stewards in understanding communities. It does not judge the people entrusted to their care."*

Alongside this Steward-facing, Pod-scoped capability, a platform-wide, Admin-facing version of the same underlying aggregation remains in scope for Article X's cross-Pod Institutional Wisdom — same function, broader authorization scope, not a different mechanism:

- **Input:** *only* the Pod-level aggregate metrics defined in §1.10, across some or all Pods, with counts small enough that no individual — or, for the cross-Pod version, no single Pod — is identifiable (a documented minimum-Pod-count threshold before any cross-Pod aggregate is generated, e.g. "at least 5 Pods," the same k-anonymity-style discipline any privacy-conscious aggregate system uses).
- **Output:** natural-language, pattern-level observations for institutional learning (Article X) — e.g. "Pods with biweekly cadence show meaningfully higher attendance consistency" — never a sentence that could resolve to an individual member or an individual Pod's identity in the cross-Pod version.
- **What it explicitly does not do:** read `PodMessage` content, individual RSVP/attendance records, `faithPreference`, or any other member-identified field. It does not run continuously or "watch" — every call is human-triggered (a Steward requesting insight about their own Pod, or an Admin requesting a platform-wide pattern report), using the same `AiRequestsService.runCompletion()` single-call-path infrastructure WO-029 already built, logged identically (one `AiRequest` row, cost/audit tracked the same way).
- **Reuse:** architecturally the same shape as WO-029's Knowledge Search — retrieve real data (here, aggregates instead of articles), then ask the provider to synthesize.

---

## 8. Cross-Domain Integration Plan

| System | Integration | New coupling? |
|---|---|---|
| Member Core | `PodMembership.userId`, `PodEvent.createdById`, etc. — real FKs to `User`, same pattern as every domain since WO-024 | No — reuse |
| Stewardship System | `StewardshipEscalation.podId` (nullable, additive), role-based gating (`STEWARD` in Pods' own staff-role set, mirroring `ACADEMY_STAFF_ROLES`) | Additive column only |
| Communication System | `ConversationType.POD`, `Conversation.podId` (nullable, additive); `NotificationCategory.POD` — already forward-provisioned in WO-026, zero migration needed, third such value now consumed (`ACADEMY` proven WO-028, `AI_GUIDANCE` proven WO-029, `POD` now proven WO-030) | Additive columns only — the exact extension point ADR-012 Decision 8 pre-declared |
| Journey Engine / Goals | Read-only, matching signal (§2.2) and possibly Pod-level "shared goal" framing for Interest Pods | Read-only |
| Academy | **Founder Decision #12 — complementary institutions, not unrelated ones.** No structural coupling introduced in V1. The Academy exists to cultivate learning, understanding, and growth; Pods exist to cultivate belonging, encouragement, stewardship, and community. Neither replaces the other, and neither is a component of the other — but they are described here as complementary by design: the Academy helps people learn; the Pod helps people live, practice, encourage, and apply what they learn. See "Future Integration Vision" below. | None in V1 |
| AI Intelligence Engine | Extends `RecommendationsService` (§7.1) and `AiRequestsService` (§7.2); Pods imports `AiModule`'s exported pieces the same way any domain would | Direction is the reverse of WO-029's own dependency graph (Pods depends on AI, not AI on Pods) — no circular-dependency risk, same reasoning as ADR-015 Decision 10, arrow flipped |
| Knowledge System | Read-only — Institutional Wisdom (§7.2) is a natural candidate for eventually publishing back as Knowledge articles; out of scope for V1, a Future Extension Point | Read-only |
| Business Portal | No integration identified — PA-009 does not name Organization as an input/output for Pods | None |

No circular module dependency is anticipated: Pods reads from Stewardship, Communication, and AI; nothing among those needs to read from Pods.

**Academy↔Pods Future Integration Vision (not a V1 requirement).** Consistent with Founder Decision #12, future versions may explore voluntary, Pod-based learning experiences once real-world experience demonstrates how communities naturally learn together — including a Pod choosing to study a Learning Path together, optional discussion guides for Pods, reflection questions following Academy lessons, service projects connected to Academy learning, and shared, non-competitive celebration when members complete a course. None of these are engineered in V1; they are recorded here so the specification does not imply the two domains are unrelated, only that their integration is deliberately deferred until it can be built from genuine community practice rather than speculation. *Constitutional Principle: "Knowledge becomes wisdom when it is lived in community."*

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
| Configurable limit as a column default, never a code constant | ADR-011 Decision 4 (`StewardCapacity.maxActiveMembers`) | `Pod.capacity`, `dormancyThresholdDays` |
| Escalation reuse instead of a parallel system | ADR-011 (`StewardshipEscalation`) | Pod Steward and Pod member concern-raising (§4, §6) |
| Location as plain city/state/country strings, not geospatial | `Opportunity`/`Resource` precedent | `Profile` extension (§2.1) |
| Single-call-path audit/cost/history logging | ADR-014 Decision 7, ADR-015 Decision 3 | Institutional Wisdom report generation (§7.2) |
| Self-referencing optional lineage FK | New to this WO, additive-only | `Pod.parentPodId` (§1.1, §5) |

---

## 10. Founder Decisions — Final and Approved

All 13 originally-flagged decisions are resolved. (Decision 7 in the original numbered list — "who becomes Steward of a newly proposed-and-approved Pod" — is resolved as part of Founder Decision #2's "Institutional Appointment applies to all initial appointments," so it is listed jointly below rather than as a separate round.)

| # | Decision | Final, approved outcome |
|---|---|---|
| 1 | Home Pod offering (§3) | Proactive invitation, never automatic assignment. Accept/decline/defer/reassign always available. |
| 2 | Who assigns a Pod Steward, incl. a newly-formed Pod's first Steward (§4) | Institutional Appointment for all initial appointments in V1; continually reaffirmed, coached, transitioned, or concluded through institutional review. |
| 3 | Who may send a Pod Invitation (§1.9) | Split by type: Home Pod — Steward/Institution only; Interest Pod — any active member. |
| 4 | Escalation confidentiality (§6) | Reuses `StewardshipEscalation`, reframed constitutionally as a confidential care-request, never an accusation; any Pod member may raise one. |
| 5 | RSVP/attendance visibility (§6) | Upcoming RSVPs visible to Pod members; attendance history Steward/Institution-only; never a performance metric. |
| 6 | Institutional Wisdom / AI insight scoping (§7.2) | Steward-initiated, Pod-scoped insights using already-authorized data, plus a platform-wide Admin aggregate; never individual scores or judgments. |
| 7 | Secondary-signal data home (§2.2) | Extends the existing `Profile` model; all fields optional, member-owned, editable, purpose-bound. |
| 8 | Location data shape (§2.1) | Coarse, member-provided city/region/state-province/country plus a free-text local-area description; minimum-necessary collection. |
| 9 | Stage/season-of-life taxonomy (§2.2) | Renamed `SeasonOfLife`; short, optional, member-selected enum; no season ranked above another. |
| 10 | Meeting-schedule auto-generation (§1.5) | Descriptive schedule plus intelligent prefill of the next `PodEvent`; Steward always reviews and publishes. |
| 11 | Pod-splitting/multiplication lineage (§5) | Optional `parentPodId` ("Stewardship Origin") — institutional memory only, never hierarchy or ownership. |
| 12 | Academy↔Pods integration scope (§8) | Independent but complementary domains in V1; a named Future Integration Vision, not a V1 feature. |
| 13 | Secondary-signal data home — duplicate framing merged into #7 above. | — |

---

## 11. Explicitly Out of Scope for V1 (Non-Goals)

- Real geospatial (PostGIS) matching — a platform-wide Post-Launch Candidate, not Pods-specific, and gated on clearly strengthening Human Flourishing while preserving privacy, dignity, stewardship, transparency, and member control.
- A structured weekly-availability-grid for scheduling — free-text `availabilityNotes` is the V1 shape.
- Auto-generated recurring `PodEvent`s from `PodMeetingSchedule` — V1 ships intelligent prefill only (§1.5); optional recurring generation is a gated future possibility.
- Member nomination/election workflows for Pod Steward selection — V1 uses Institutional Appointment exclusively (§4).
- Rich meeting facilitation tooling (agendas-as-data, live note-taking, structured action-item tracking) — OAS-OPS-104 is a facilitation script for the human Steward to follow, not a feature backlog; `PodEvent` stores that a meeting happened and who attended, nothing more.
- Concrete Academy↔Pods features (shared group enrollment, discussion guides, etc.) — a named Future Integration Vision (§8), not a V1 deliverable.
- Knowledge System publication of Institutional Wisdom findings — Future Extension Point.
- Continuous or background AI monitoring of any kind — explicitly and permanently out of scope, not merely deferred; this is a constitutional boundary (Article VI), not a V1-scoping choice.

---

## 12. What Happens After Approval

Upon the founder's confirmation of this revised specification, implementation proceeds exactly as every prior domain WO has: Prisma schema + migration, sub-domain-by-sub-domain service/controller/DTO implementation with incremental typechecking, unit/integration/e2e tests, ADR-016 (recording these 13 decisions as binding architectural precedent, including the newly-adopted constitutional principles in §0.1), the WO-030 completion document (separate from this specification), an Operational Verification Report, and the `version-1-readiness.md` update — commit, push, PR, CI, merge, exactly as WO-024 through WO-029 have each done.
