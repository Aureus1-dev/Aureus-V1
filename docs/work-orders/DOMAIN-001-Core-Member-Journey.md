# DOMAIN-001 — Core Member Journey

| Field | Value |
|---|---|
| Domain Number | DOMAIN-001 |
| Title | Core Member Journey |
| Status | Complete |
| Priority | High (the first genuinely complete, usable member experience) |
| Date | 2026-07-16 |
| Process | First Domain delivered under the Domain Delivery model (superseding per-Work-Order delivery for this and future features) |

---

## Objective

Implement the first complete Aureus member experience end to end: a member is welcomed, establishes trust, communicates an immediate need, Aureus helps identify a meaningful first mission, relevant opportunities are surfaced, Aureus prepares recommended actions, the member reviews and approves those actions, progress is recorded, and the member leaves understanding their next meaningful step (FPB-015 Phase Three, AFX-005 Member Journey Canon).

Per Founder Decision, this Domain was built and is delivered as **one indivisible unit** — not split into per-surface Work Orders — with Welcome composing the rest of the Domain rather than being added after it, and against the following permanent Domain Completion Rule:

> A Domain is complete only when a real member can successfully accomplish the Domain's primary purpose from beginning to end. Component completion alone is insufficient.

## Scope

- **Welcome** (`/welcome`) — the front door. Branches between a guided first-run flow (`FirstRunWelcome`) for new members and a calm returning-member summary (`ReturningWelcome`) for members who already have goals, since a member should never be forced through onboarding twice (AFX-005 §3).
- **First Mission** — elicits the member's immediate need (FPB-003 §6) and creates the Goal → Journey → starter Milestone → starter Task chain that represents it. Since Dynamic Screen Orchestration remains deferred (FWO-002 boundary, unchanged by this Domain), this is an explicit member-initiated action, not AI-orchestrated.
- **Opportunity Discovery** (`/opportunities` + a Welcome-flow step) — searchable, filterable, savable Opportunities surface (AFX-001 §8).
- **Review & Approval** — the AI Recommendations `generate`/`approve`/`dismiss` workflow, presented via an Approval Panel: "Aureus prepares. The member approves." (AFX-001 §10).
- **Journey Progress** (`/journey` + a Welcome-flow confirmation) — the standing surface for tracking Goal → Journey → Milestone → Task progress over time.

## Governing Documents

**Canons:** AFX-001 (Frontend Experience — §3 Conversation First, §4 Hospitality, §6 One Meaningful Next Step, §7 Earn Every Question, §8 Opportunity Discovery, §10 Preparation Before Approval), AFX-002 (Conversation), AFX-004 (Visual Design System), AFX-005 (Member Journey Canon — the primary governing canon for this Domain), AFX-006 (Member Flourishing).
**Blueprints:** FPB-002 (Screen Architecture), FPB-003 §4/§6 (Welcome Flow, Immediate Problem Flow), FPB-005 §3 (Information/Forms/Data Presentation components), FPB-009 (Backend Integration Map), FPB-010 §3 (State), FPB-011 (Accessibility), FPB-014 (Error & Recovery).

## Backend Audit (all confirmed complete, zero backend changes required)

- **Goals** (`apps/api/src/goals`) — self-scoped CRUD.
- **Journeys** (`apps/api/src/journeys`) — **one Journey per Goal** (409 on a second Journey for the same Goal). There is no single member-wide "journey" — only Goal→Journey threads.
- **Milestones** / **Tasks** — belong to a Journey / Milestone respectively, ordered by `position`.
- **Opportunities** (`apps/api/src/opportunities`) — public search/filter/sort, defaults to `VERIFIED` only; write endpoints role-gated away from MEMBER.
- **Saved Opportunities** (`apps/api/src/opportunities/saved`) — self-scoped save/list/update/remove.
- **AI Recommendations** (`apps/api/src/ai/recommendations`) — `generate` (category-scoped, max 3, grounded in the caller's own goals, rate-limited 10/min, never auto-executes), `approve`/`dismiss` (status changes only) — the backend's actual Review & Approval mechanism.

## Domain Ownership

**Owns:** `/welcome`, `/opportunities`, `/journey` (replacing FWO-001 placeholders); `state/journey/**`, `state/opportunities/**`, `state/recommendations/**`; `lib/api/{goals,journeys,milestones,tasks,opportunities,saved-opportunities,recommendations}.ts`; `design-system/components/{journey,opportunities,recommendations,welcome}/**`; `design-system/components/domain-error-copy.ts`; `design-system/components/FormField`'s reuse for the Immediate Need step.

**Depends on:** FWO-001 (tokens/components/shell), FWO-002 (Conversation — linked from the Welcome flow's completion), FWO-003 (Authentication — every surface in this Domain requires a signed-in member); the six backend domains audited above, unmodified.

**Explicitly does not own:** Home, Academy, Community, Pods, Documents, Messages, Calendar, Resources, Profile, Settings, Steward (Phase Four — future Domains); Voice and Dynamic Screen Orchestration (deferred; Voice is the next planned Domain per Founder Decision); Connected Experiences (Phase Five); any backend change; a resend-recommendation or bulk-creation endpoint (none exist; not invented).

## Deliverables

- `lib/api/{goals,journeys,milestones,tasks,opportunities,saved-opportunities,recommendations}.ts` (+ tests where applicable)
- `state/journey/JourneyContext.tsx`, `state/opportunities/OpportunitiesContext.tsx`, `state/recommendations/RecommendationsContext.tsx` (+ tests)
- `state/AppStateProvider.tsx`, `state/index.ts` (extended)
- `design-system/components/journey/{JourneyCard,ProgressIndicator,MilestoneChecklist,TaskItem}.tsx` (+ CSS, + tests)
- `design-system/components/opportunities/{OpportunityCard,OpportunityFilters,OpportunityDetail}.tsx` (+ CSS, + tests)
- `design-system/components/recommendations/{ApprovalPanel,RecommendationCard}.tsx` (+ CSS, + tests)
- `design-system/components/welcome/**` — `WelcomeFlow`, `FirstRunWelcome`, `ReturningWelcome`, six step components (+ CSS, + end-to-end test)
- `design-system/components/domain-error-copy.ts` — shared calm error copy for Journey/Opportunities/Recommendations
- `app/(member)/{welcome,opportunities,journey}/page.tsx` (real implementations)
- `docs/work-orders/DOMAIN-001-Core-Member-Journey.md` (this file)

## Technical Risks and How They Were Addressed

1. **Journey's one-per-Goal structure** — handled by making the Journey surface goal-first (a list of `JourneyCard`s, each opening its own detail), not assuming a single linear journey.
2. **First Mission's 4 sequential, non-transactional backend calls** — `JourneyContext` tracks a `FirstMissionDraft` recording exactly which of Goal/Journey/Milestone/Task succeeded; `retryFirstMission()` resumes from the first incomplete step rather than recreating earlier records. Verified by a dedicated test asserting `createGoal` is called exactly once across an initial failure and a retry.
3. **Recommendation cap and rate limit** — the UI never auto-regenerates; `RecommendationsContext.generate()` guards against overlapping calls.
4. **Domain size** — kept as one Domain per Founder Decision, sequenced internally (foundation → components → Welcome flow → standing surfaces → tests) to de-risk without fragmenting delivery.

## Accessibility

- `ProgressIndicator` uses `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.
- `MilestoneChecklist`/`TaskItem` use native checkboxes with explicit `aria-label`s stating the resulting state ("Mark ... as complete/not complete").
- `FormField` (reused from FWO-003) wires label/help/error association for the Immediate Need step.
- All new components pass `jest-axe` with zero violations.

## Testing

- **Unit/Integration**: `JourneyContext` (6 tests, including the First Mission chain and partial-failure retry), `OpportunitiesContext` (3 tests), `RecommendationsContext` (5 tests, including generate-overlap guarding).
- **Component + accessibility**: `ProgressIndicator`, `JourneyCard`, `MilestoneChecklist`, `OpportunityCard`, `ApprovalPanel` (13 tests, `jest-axe` on each).
- **End-to-end**: `FirstRunWelcome.test.tsx` (2 tests) drives the entire flow — Hospitality → Immediate Need → First Mission → Opportunity Discovery (with save) → Review & Approval (with approve) → Next Step Summary — asserting every Domain Completion Rule bullet is satisfied, plus a second test confirming a member can continue at their own pace without deciding every recommendation (AFX-005 §7).
- **Regression**: all 72 pre-existing tests (FWO-001/002/003) pass unchanged.
- **Totals**: 26 suites, 102 tests, all passing.
- **Not automated**: no live backend was running; all API calls are mocked at the module boundary. No manual browser/screen-reader session was performed.

## Architecture Compliance

- **Governing Canons followed**: AFX-001 §3/4/6/7/8/10, AFX-002, AFX-004, AFX-005 (throughout — the primary canon for this Domain), AFX-006.
- **Governing Blueprints followed**: FPB-002, FPB-003 §4/§6, FPB-005 §3, FPB-009, FPB-010 §3, FPB-011, FPB-014.
- **Architectural deviations**: none. Two scoping decisions were made explicitly rather than silently: First Mission is member-initiated (not AI-orchestrated, per the standing Dynamic Screen Orchestration deferral) and Review & Approval is a pattern embedded in the flow, not a standalone FPB-002 route.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] A member is welcomed (`HospitalityStep`).
- [x] They establish trust (AFX-001 §4 hospitality copy before any request).
- [x] They communicate their immediate need (`ImmediateNeedStep`, becomes the first Goal).
- [x] Aureus helps identify a meaningful first mission (Goal → Journey → starter Milestone → starter Task).
- [x] Relevant opportunities are surfaced (`OpportunityDiscoveryStep`, real search against the member's stated need).
- [x] Aureus prepares recommended actions (`AI Recommendations generate`, category `OPPORTUNITY`).
- [x] The member reviews and approves those actions (`ApprovalPanel`, approve/dismiss).
- [x] Progress is recorded (`MilestoneChecklist`/`TaskItem` on the standing Journey surface).
- [x] The member leaves understanding their next meaningful step (`NextStepSummary`, naming the actual created task).
- [x] `apps/web` builds, lints, and type-checks cleanly; 102/102 tests pass, including 72 unchanged pre-existing tests.
