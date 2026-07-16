# DOMAIN-003 — Home Dashboard Experience

| Field | Value |
|---|---|
| Domain Number | DOMAIN-003 |
| Title | Home Dashboard Experience |
| Status | Complete — Domain Completion Rule satisfied end-to-end |
| Priority | High (Version 1 launch requirement — the returning member's landing surface) |
| Date | 2026-07-16 |
| Process | Full Domain Delivery process: audit, Domain Implementation Plan, Founder approval, implementation, testing, this report |

---

## Objective

Give every returning member a single screen where "every return begins where the previous journey paused" (FPB-003 §10) actually happens: a personalized greeting, today's one meaningful next step, active-goal progress, opportunity highlights, a way to keep talking to their steward (by text or voice), and notifications — without navigating away first.

**Per the standing Domain Completion Rule, the Home Dashboard Domain is now complete**: a real returning member signs in, lands on `/home`, sees who greeted them and where things stand, and can reach their next step, their journey, an opportunity, their steward, and their notifications — all from that one screen — without any step requiring code that doesn't yet exist. This is proven end-to-end by `HomeDashboard.test.tsx`, not asserted by widget completion alone.

## Scope

- **Personalized greeting** — time-of-day copy plus a name resolved from Profile (or an email-derived fallback), never a broken or empty heading.
- **Today's Next Step** — the single most prominent widget; the first incomplete task of the first incomplete milestone on the member's most relevant active goal.
- **Journey summary / active goals / progress overview** — goal-level list of every active goal, with a progress bar for the one goal Home has full detail for.
- **Opportunity highlights** — a small, confidence-ranked preview of Opportunity Discovery.
- **Conversation shortcut** and **voice shortcut** — one widget, two entry points into the existing Conversation Core surface (text and voice), not two competing cards.
- **Notifications preview** and **recent activity** — unread/actionable items and a short chronological record, sharing one fetch.
- **Quick actions** — journey, opportunities, and "start a new mission" shortcuts (not a second navigation menu; `AppShell` already provides that).
- **Calm animations/transitions, responsive layouts, accessibility, production-quality UI** — built in throughout via the existing token/breakpoint/reduced-motion system, not a separate pass.
- **Routing decision**: returning members (members with at least one goal) now land on `/home` directly from `/welcome`, rather than seeing a second summary screen there.

## Governing Documents

**Canons:** AFX-001 (primary governing canon — personalization, One Meaningful Next Step, Opportunity Discovery), AFX-005 (never force onboarding twice, honest scoping), AFX-006 (measured by outcomes, never engagement — no streaks, no urgency, no "you're behind" framing), BRAND-008.
**Blueprints:** FPB-002 (navigation/shell), FPB-003 §10 ("every return begins where the previous journey paused"), FPB-005 §3 (Information/Actions/Data Presentation component taxonomy), FPB-010 §7 (minimal duplication / state reuse), FPB-011 (Accessibility), FPB-012 (Responsive).

## Backend Audit

**No backend changes were made or needed.** Every widget's data already has a serving endpoint, confirmed by reading the actual controller source, not assumed: `GET /goals`, `GET /journeys/by-goal/:goalId`, `GET /milestones`, `GET /tasks`, `GET /opportunities`, `GET /ai/conversations`, `GET /communications/notifications` (+ mark-read / mark-all-read), `GET /users/:userId/profile`.

## Frontend Audit / Existing Reusable Infrastructure

Reused unmodified: the `lib/api/<domain>.ts` typed client pattern; the `useReducer` + `classifyError` + `useCallback` + `use<Domain>()` context pattern; `JourneyContext`, `OpportunitiesContext`, `ConversationContext` (composed, not duplicated — FPB-010 §7); `Card`/`Button`/`EmptyState`/`LoadingState`/`VisuallyHidden` primitives; `ProgressIndicator`, `JourneyCard`, `OpportunityCard` (all reused as-is from DOMAIN-001); the full design token system including the `prefers-reduced-motion` handling already built into `app/globals.css`; the async `searchParams` route convention (`/welcome`, `/conversation`), matching `/login`/`/reset-password`/`/verify-email` precedent.

**New infrastructure this Domain adds** (and that a future Domain could reuse): `lib/api/notifications.ts` and `lib/api/profile.ts`; `NotificationsContext` (new state — the only genuinely new context this Domain needed); `ConversationSurface`'s `initialMode` prop, letting any surface deep-link into voice mode without importing Voice Domain internals.

## Domain Ownership

**Owns:** `apps/web/design-system/components/home/**` (all widgets, pure functions, and hooks); `apps/web/lib/api/{notifications,profile}.ts`; `apps/web/state/notifications/NotificationsContext.tsx`; `apps/web/app/(member)/home/page.tsx`; the Home-driven changes to `apps/web/design-system/components/welcome/WelcomeFlow.tsx` (returning-member redirect) and `ConversationSurface.tsx` (`initialMode` prop).

**Depends on:** `JourneyContext`, `OpportunitiesContext`, `ConversationContext`, `SessionContext` (all extended by composition, not forked); the Voice Domain only via a plain URL (`/conversation?mode=voice`), never via direct import.

**Explicitly does not own** (per the Founder's scoping instruction, and confirmed no governing document assigns these here): Profile editing (`useGreetingName` is a narrow read-only lookup, not a `ProfileContext`), Settings, Academy, Community, Pods, Documents, Calendar, Messages, or Connected Experiences. The `/notifications` "view all" destination remains the pre-existing placeholder route — Home only owns the dashboard preview of notifications, not the full Notifications surface.

## Architecture

**State reuse over duplication (FPB-010 §7).** Home composes `JourneyContext`, `OpportunitiesContext`, and `ConversationContext` rather than introducing a `HomeContext`; the only new state is `NotificationsContext` (genuinely new domain data) and a narrow `useGreetingName` hook (not a full Profile context, since Profile editing stays out of scope).

**Single-most-relevant-goal detail-load strategy.** `pickMostRelevantGoal` selects the most-recently-updated `ACTIVE` goal, and `useHomeJourneyDetail` loads full milestone/task detail for that one goal only — avoiding an N+1 fan-out across every active goal on every Home visit. Other active goals still render, goal-level only, from data `loadGoals()` already provided for free. Verified directly by `HomeDashboard.test.tsx`'s N+1 regression test (`getJourneyByGoal` called exactly once even with two active goals).

**One fetch, two Notifications views.** `NotificationsSection` calls `NotificationsContext.load()`/`loadUnreadCount()` once and derives both the unread-only preview and the full recent-activity list client-side, rather than having `NotificationsPreview` and `RecentActivity` independently issue competing requests against the same single-list context.

**Anti-gamification discipline (AFX-006 §9-10).** No streaks, no urgent-red badges, no "you're behind" framing anywhere in Home. Progress is presented as encouragement/completion (`ProgressOverviewCard`, `ProgressIndicator`), scoped honestly to "your current focus," never as a member-wide score.

**Voice decoupling.** The voice shortcut is a plain `<Link href="/conversation?mode=voice">` inside `ConversationShortcut`; `ConversationSurface` gained an `initialMode` prop so Home never imports `VoiceContext`/`VoiceSurface` or any other Voice Domain internal.

**Routing (Founder Decision 1, approved).** `WelcomeFlow` now redirects a returning member (`goals.length > 0`) to `/home` instead of rendering a second summary screen; `ReturningWelcome` is retired entirely. A `?newMission=true` escape hatch on `/welcome` (wired to `QuickActions`' "Start a new mission" button) lets a returning member reach the guided flow again, reusing `FirstRunWelcome skipHospitality` rather than duplicating it.

## A Real Bug Found and Fixed During This Domain

Two related defects surfaced from this Domain's own test-writing, not from a user report — both share the same root cause and were fixed the same way:

1. **`WelcomeFlow`'s `loadGoals()` effect** originally had an empty `[]` dependency array. When `session.accessToken` becomes available on a render *after* first mount (real async session hydration, or the test harness), the effect never re-fires with a valid token, so goals never load and the returning-member redirect never fires. **Fixed** by depending on `session.isAuthenticated`.
2. **The same class of bug, found by this Domain's own new tests**, existed in three brand-new Home widgets: `OpportunityHighlights`, `ConversationShortcut`, and `NotificationsSection` each fetched data in a `useEffect(() => { ... }, [])` that closed over a `search`/`loadConversations`/`load` function bound to whatever access token existed at first mount. **Fixed** by depending on the callback itself (e.g. `[search]`) rather than `[]` — since each of those callbacks is recreated via `useCallback` whenever `session.accessToken` changes, this re-fires the fetch once a real token becomes available instead of silently no-oping forever. All three fixes were caught by `HomeDashboard.test.tsx` and the individual widget tests before merge, not discovered in production.

## Testing

- **Pure functions**: `compute-next-step.test.ts` (6 tests), `compute-progress-overview.test.ts` (2 tests), `pick-most-relevant-goal.test.ts` (4 tests) — including the "never picks a paused/completed/archived goal even if most recently updated" N+1-avoidance guarantee.
- **State**: `NotificationsContext.test.tsx` (6 tests) — load, unread-count, mark-read (with count decrement), mark-all-read, auth guard, error classification.
- **Routing regression**: `WelcomeFlow.test.tsx` (3 tests) — returning member redirected to `/home`; first-run member still sees the guided flow; `forceNewMission` bypasses the redirect.
- **Widgets** (`jest-axe` on every one): `Greeting` (4), `QuickActions` (2), `NextStepCard` (4), `ProgressOverviewCard` (3), `ActiveGoalsList` (3), `OpportunityHighlights` (3), `ConversationShortcut` (4), `NotificationsPreview` (4), `RecentActivity` (4).
- **Integration — the Domain Completion Rule, proven directly**: `HomeDashboard.test.tsx` (5 tests) — a signed-out visitor is asked to sign in; a signed-in member with no mission is directed to Welcome, not a broken dashboard; a returning member with one active goal, one opportunity, and a fresh sign-in can see the greeting, today's next step, progress on their named goal, their active goal, an opportunity, and reach `/journey`, `/opportunities`, `/conversation`, and `/conversation?mode=voice` all from the rendered page; the N+1 regression guarantee (`getJourneyByGoal` called exactly once with two active goals present); zero `jest-axe` violations on the fully populated dashboard.
- **Totals**: 57 new tests across 15 new/changed test files. Full `apps/web` regression: **49 suites, 218 tests, all passing** (includes every prior Domain's tests, unchanged — 161 tests carried forward from the Voice Domain frontend increment).
- **Full pipeline**: `next lint` clean, `tsc --noEmit` clean, `next build` succeeds — `/home` is a new static route (`○ /home 5.6 kB 120 kB`); `/welcome` and `/conversation` are now dynamic (`ƒ`) due to the async `searchParams` pattern, matching existing `/login`/`/reset-password`/`/verify-email` precedent.

## Architecture Compliance

- **Governing Canons followed**: AFX-001 (throughout), AFX-005, AFX-006, BRAND-008.
- **Governing Blueprints followed**: FPB-002, FPB-003, FPB-005, FPB-010, FPB-011, FPB-012.
- **Architectural deviations**: none from governing documents. Three Founder Decisions were surfaced explicitly in the Domain Implementation Plan and approved before implementation began (see below).

## Founder Decisions (resolution record)

1. **Routing** — approved: returning members redirect from `/welcome` to `/home`; `ReturningWelcome` retired; `?newMission=true` escape hatch added to `/welcome`.
2. **Notifications scope** — approved: both a Notifications preview (unread/actionable) and Recent Activity (short chronological log) are built, sharing one fetch via `NotificationsSection` to avoid two competing requests against the same context list.
3. **Voice shortcut** — approved: a plain link to `/conversation?mode=voice`; Home never imports Voice Domain internals directly.

## Risks and How They Were Addressed

1. **N+1 fan-out across every active goal** — resolved by `pickMostRelevantGoal` + `useHomeJourneyDetail` (single most-relevant goal only); verified directly by a regression test, not just by design intent.
2. **Two Notifications components racing the same context list** — resolved by a single composing fetch in `NotificationsSection`, with both child views deriving from one loaded batch.
3. **Stale-token effects silently no-oping** — a real bug class (see above) was found via this Domain's own tests in three separate widgets and in `WelcomeFlow`, and fixed uniformly by depending on the token-bound callback reference rather than an empty dependency array.
4. **Duplicating navigation** — `QuickActions` was deliberately kept to three specific next actions (not a second nav menu), since `AppShell` already owns global navigation (FPB-002 §3).

## What Remains

None for this Domain's own scope. The `/notifications` "view all" destination is a pre-existing placeholder route outside this Domain's ownership (a future Notifications Domain would build it out); Home's preview does not depend on it existing yet.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] A returning member lands on `/home` (not a second Welcome summary) and sees a personalized greeting.
- [x] Today's one meaningful next step is shown, or honest fallback copy when none is computable yet.
- [x] Active-goal progress is shown, scoped to the member's current focus, never as a bare score.
- [x] Every active goal is listed, not just the one with detail loaded.
- [x] At least one opportunity highlight is reachable without leaving Home.
- [x] The member can reach both text and voice conversation with their steward from Home, without Home importing Voice Domain internals.
- [x] Notifications (unread preview) and Recent Activity (chronological record) are both present and interactive where appropriate (mark-read).
- [x] The experience adapts to mobile viewport widths using the existing breakpoint system, and respects `prefers-reduced-motion`.
- [x] Every new component passes `jest-axe` with zero violations.
- [x] `apps/web` builds, lints, and type-checks cleanly; 218/218 tests pass, including 57 new tests for this Domain.
- [x] The Domain Completion Rule is proven end-to-end by `HomeDashboard.test.tsx`, not inferred from component completion alone.
