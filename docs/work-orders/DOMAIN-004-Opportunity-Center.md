# DOMAIN-004 — Opportunity Center

| Field | Value |
|---|---|
| Domain Number | DOMAIN-004 (this session's Domain Delivery sequence — distinct from ENG-002's internal roadmap numbering, which already used "Domain 004 — Opportunity Intelligence" for the backend Opportunity Engine, Status: Complete, built earlier under Phase 2/ADR-004) |
| Title | Opportunity Center |
| Status | Complete — Domain Completion Rule satisfied end-to-end |
| Priority | High (Version 1 — Opportunity Discovery is a named core value, AFX-001 §8) |
| Date | 2026-07-16 |
| Process | Full Domain Delivery process: audit, Domain Implementation Plan, Founder approval (with one addendum on recommendation caching), implementation, testing, this report |

---

## Objective

Elevate the minimal `/opportunities` screen (a small slice originally built as part of DOMAIN-001) into a complete, standing Opportunity Center: a member can search and filter verified opportunities, understand transparently why something is relevant to them, save items for later, track their own progress against a saved opportunity, and get AI-prepared, explainable, member-approved recommendations — all from one surface, on an ongoing basis, not just once during onboarding.

**Per the standing Domain Completion Rule, this Domain is now complete**: a member can discover an opportunity, save it and record their own progress on it, and get and approve an explainable recommendation grounded in their own goals — all from one screen, without losing state when moving between views. This is proven end-to-end by `OpportunityCenter.test.tsx`, not asserted by component completion alone.

## Governing Documents

**Canons:** AFX-001 §8 (Opportunity Discovery — "recommendations shall be transparent, explainable, and grounded in evidence"), AFX-006 (measured by outcomes, never engagement).
**Blueprints:** FPB-002 (`Opportunities` is one standing screen), FPB-005 §3, FPB-010 §7 (minimal duplication), FPB-011 (Accessibility), FPB-012 (Responsive).
**Product Architecture:** PA-007 (Opportunity Engine Architecture — "shall not apply on behalf of members without explicit authorization"; success criteria include "understand why opportunities are recommended").
**Backend ADRs:** ADR-004 (Opportunity Intelligence Engine — verification workflow, scoring, `TrackingStatus`), ADR-015 (AI Intelligence Engine — Recommendations sub-domain, "Aureus prepares, member approves").

## Backend Audit — no backend changes required

Every capability this Domain needed already existed, confirmed by reading the actual controllers/services, not assumed:

- `GET /opportunities` (search/sort/paginate), `GET /opportunities/:id` — unchanged.
- `POST/GET/PATCH/DELETE /users/:userId/saved-opportunities` — **already supported `trackingStatus` (`SAVED/APPLYING/APPLIED/RECEIVED/NOT_INTERESTED`), `isFavorite`, and `notes`**, fully validated and self-only guarded (WO-022 pattern). The typed API client (`updateSavedOpportunity()`) already existed; it was simply never called anywhere in the UI before this Domain.
- `POST/GET /ai/recommendations`, `POST /ai/recommendations/:id/{approve,dismiss}` — unchanged; generates up to 3 explainable, member-approved recommendations grounded in the member's own goals, rate-limited server-side, deduped against existing PENDING ones per target.

**Known backend limitation, explicitly out of scope**: Opportunity workflow actions (`verify`/`reject`/`archive`) still trust body-supplied reviewer identity rather than deriving it from the JWT (tracked technical debt since ADR-004/WO-022). That is a Steward/Admin-side gap, unrelated to this member-facing Domain, and was not touched here.

## Frontend Audit / Existing Reusable Infrastructure

Reused unmodified: `OpportunitiesContext` and `RecommendationsContext` (both extended additively, not forked), `OpportunityCard`, `OpportunityDetail`, `Card`/`Button`/`EmptyState`/`LoadingState`/`ErrorState`/`VisuallyHidden` primitives, `domainErrorCopy`, `ApprovalPanel`/`RecommendationCard` (previously stranded in the one-time Welcome flow — see below).

**New infrastructure this Domain adds** (and that a future Domain could reuse):
- `useRecommendationSubjects()` — extracted from duplicated logic that lived only inside `FirstRunWelcome.tsx`; now shared between the Welcome flow's one-time review step and the Opportunity Center's standing Recommended tab (FPB-010 §7).
- `OpportunityTabs` — a standard WAI-ARIA tabs component (roving tabindex, arrow-key navigation), the first tabbed pattern in this codebase.
- `sortOptionToParams()` — maps member-facing sort language ("Best match", "Closing soon") to the backend's `sortBy`/`sortOrder` pair.
- `OpportunitiesContext.loadMore()` (paginated append) and `updateSaved()` (tracking status / favorite / notes).

## Domain Ownership

**Owns:** `apps/web/design-system/components/opportunity-center/**` (all new); the sort-control and pagination additions to `OpportunitiesContext`/`OpportunityFilters`; `useRecommendationSubjects` (recommendations directory, shared); `apps/web/app/(member)/opportunities/page.tsx`.

**Depends on:** `OpportunitiesContext`, `RecommendationsContext`, `SessionContext` — all extended by composition, not forked.

**Explicitly does not own:** Resource Directory, Academy, or Pods, nor their recommendation categories (RESOURCE/COURSE/POD) — no governing document assigns those here. Home's existing `OpportunityHighlights` widget (DOMAIN-003) is untouched and still links into this surface. The one-time Welcome onboarding review step (`ReviewApprovalStep`) is untouched apart from adopting the shared subject-resolution hook.

## Founder Decisions (resolution record)

1. **Surface structure** — approved: a single `/opportunities` surface with three tabs (Search / Saved / Recommended), not separate routes.
2. **Recommendation generation trigger** — approved: member-initiated only, via an explicit "Get Recommendations" button. Loading the Recommended tab retrieves existing recommendations (`GET /ai/recommendations`) without ever calling `generate()` automatically.
3. **Caching (Founder addendum)** — recommendations are cached and reused: nothing regenerates on tab load or tab revisit; a fresh AI call only ever happens on the member's own explicit click. The backend's own `findExistingPending` dedup (unchanged, ADR-015) prevents duplicate PENDING records for the same target across repeated explicit generations.

## Architecture

**All three tabs stay mounted; only visibility toggles.** `OpportunityCenter` renders `SearchTab`/`SavedTab`/`RecommendedTab` simultaneously behind `hidden` attributes rather than mounting/unmounting on tab switch. This was a deliberate fix for a real bug caught during implementation: conditional (mount-on-switch) rendering caused `SearchTab`'s mount effect to re-run `search({})` every time a member switched back to Search, silently discarding their filters and pagination. Keeping every tab mounted means each tab's own data loads exactly once, and a member's in-progress search survives moving between tabs — verified directly by `OpportunityCenter.test.tsx`.

**A member's own tracking, never automated.** `SavedTab`/`SavedOpportunityRow` surface `trackingStatus`/`isFavorite`/`notes` — all self-reported by the member, matching PA-007's explicit boundary ("shall not apply on behalf of members"). Notes commit on blur, not per keystroke, to avoid a request per character typed.

**Recommendations, made a standing capability.** `RecommendedTab` reuses the exact `ApprovalPanel`/`RecommendationCard` pair already built for the one-time Welcome review step, now wired into an ongoing surface for the first time. Subject resolution (`useRecommendationSubjects`) was extracted out of `FirstRunWelcome.tsx` into a shared hook rather than duplicated — both call sites now share one implementation.

**Heading order, verified not assumed.** An `axe` integration test on the fully composed `OpportunityCenter` caught a real, previously-latent `heading-order` violation: `OpportunityCard`'s `<h3>` sat directly under the page's `<h1>` with no intervening `<h2>` (a defect that predated this Domain but had never been exercised by a full-page accessibility test, since `OpportunityCard`'s own isolated test has no surrounding heading context). Fixed by adding a visually-hidden `<h2>` per tab, and demoting `RecommendedTab`'s "Previously reviewed" heading to `<h3>` to stay correctly nested under it.

## Testing

- **State**: `OpportunitiesContext.test.tsx` extended with `updateSaved` (2 new tests: field updates, no-op when nothing changed... covered via `SavedOpportunityRow`) and `loadMore` (2 new tests: page-append, and no request once every page is loaded).
- **Components** (`jest-axe` on every one): `OpportunityFilters` extended with sort-control tests (+ `sortOptionToParams` unit tests), `OpportunityDetail.test.tsx` (new — this component had no test before this Domain), `useRecommendationSubjects.test.tsx` (new, covers the extracted shared hook), `OpportunityTabs.test.tsx` (4 — selection, click, arrow-key navigation, accessibility), `SavedOpportunityRow.test.tsx` (9 — status/favorite/notes, blur-commit semantics, remove, official-source link), `SearchTab.test.tsx` (5 — search-on-mount, load-more, detail open/close, empty state), `SavedTab.test.tsx` (4 — load/resolve/render, empty state, remove), `RecommendedTab.test.tsx` (5 — load-without-generating, approve, explicit generate, previously-reviewed history).
- **Integration — the Domain Completion Rule, proven directly**: `OpportunityCenter.test.tsx` (3) — a signed-out visitor is asked to sign in; a signed-in member searches, saves an opportunity, switches to Saved and updates its tracking status, switches to Recommended and explicitly generates and approves a recommendation, then returns to Search to find the original results untouched (not reset) — with zero `jest-axe` violations on the fully composed surface.
- **Regression fix, caught by this Domain's own tests, not a user report**: `FirstRunWelcome.tsx`'s inline subject-resolution effect was refactored into the shared `useRecommendationSubjects` hook; all 5 pre-existing Welcome-flow tests still pass unchanged, confirming the extraction was behavior-preserving.
- **Totals**: 46 new tests across 11 new/changed test files. Full `apps/web` regression: **58 suites, 264 tests, all passing** (233 carried forward unchanged from every prior Domain).
- **Full pipeline**: `next lint` clean, `tsc --noEmit` clean, `next build` succeeds — `/opportunities` remains a static route (`○ /opportunities 4 kB 119 kB`).

## Architecture Compliance

- **Governing Canons followed**: AFX-001 §8 (throughout), AFX-006.
- **Governing Blueprints followed**: FPB-002, FPB-005, FPB-010, FPB-011, FPB-012.
- **Architectural deviations**: none from governing documents. Three Founder Decisions were surfaced explicitly in the Domain Implementation Plan and approved (with one addendum) before implementation began.

## Risks and How They Were Addressed

1. **Tab-switch data loss** — a real bug (conditional mount re-triggering `search({})`) was found and fixed by keeping all three tabs mounted and toggling visibility instead; verified by a dedicated regression assertion in the integration test.
2. **Shared `error` field bleeding across tabs** — `OpportunitiesContext`'s single `error` field is shared across search/save/load/update; `SavedTab` only treats it as blocking when nothing is already loaded, so an unrelated Search-tab failure cannot hide an already-loaded Saved list.
3. **AI cost/latency on every visit** — resolved by the Founder-approved explicit-generation-only design; loading the Recommended tab is always a free `GET`.
4. **Heading order regression risk from OpportunityCard reuse** — `OpportunityCard`'s own `<h3>` was deliberately left unchanged (it is correctly nested under an `<h2>` in both Home's `OpportunityHighlights` and Welcome's `OpportunityDiscoveryStep`); the fix was scoped to `OpportunityCenter`'s own tabs instead, verified by axe on the full composed surface.

## What Remains

None for this Domain's own scope. The known backend reviewer-identity technical debt (Steward/Admin-side, ADR-004/WO-022) remains tracked but untouched, as it is unrelated to this Domain's member-facing purpose.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] A member can search, filter, sort, and page through verified opportunities.
- [x] A member can save an opportunity and, independently, track their own status on it (Saved → Applying → Applied → Received, or Not interested), favorite it, and leave a private note.
- [x] A member can request AI-prepared, explainable opportunity recommendations grounded in their own goals, and approve or dismiss each one — only ever by their own explicit action.
- [x] Recommendations are cached and reused; nothing regenerates automatically on tab load or revisit.
- [x] Moving between Search / Saved / Recommended never discards a member's in-progress work in another tab.
- [x] Every new component passes `jest-axe` with zero violations, including the fully composed surface.
- [x] `apps/web` builds, lints, and type-checks cleanly; 264/264 tests pass, including 46 new tests for this Domain.
- [x] The Domain Completion Rule is proven end-to-end by `OpportunityCenter.test.tsx`, not inferred from component completion alone.
