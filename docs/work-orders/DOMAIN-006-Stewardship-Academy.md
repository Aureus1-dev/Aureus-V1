# DOMAIN-006 — Stewardship Academy

| Field | Value |
|---|---|
| Domain Number | DOMAIN-006 (this session's Domain Delivery sequence) |
| Title | Stewardship Academy |
| Status | Complete — Domain Completion Rule satisfied end-to-end |
| Priority | High (Founder-directed) |
| Date | 2026-07-16 |
| Process | Full Domain Delivery process: audit, Domain Implementation Plan, three Founder Decisions, implementation, testing, this report |

---

## Objective

The Academy backend (WO-028, ADR-014) was fully built — Courses, Modules, Lessons, Learning Paths, Enrollments with auto-completion and certification issuance, and a Steward Content Studio — with zero frontend; `/academy` was a bare placeholder. This Domain elevates that backend into the member-facing experience the Founder described: **a living educational institution that helps every member become wiser, stronger, more capable, and more hopeful**, mentored by the AI Steward rather than resembling a traditional LMS.

**Per the standing Domain Completion Rule, this Domain is now complete**: a real member can discover a course, hear from their own Steward why it matters to their goals, enroll, read a lesson, reflect on it, mark it complete, and see that reflected in their own growth — not just a percentage — entirely from one screen, with voice and highlight continuity available throughout.

## Governing Documents

**Canons:** AFX-001 §12 "Continuous Stewardship" — *"Learning exists to improve stewardship—not manipulate behavior."* AFX-006 (Member Flourishing, Wisdom). EF-007 (Wisdom emotional foundation — "Knowledge tells us what can be done. Wisdom helps us determine what should be done").
**Blueprints:** PA-010-academy-architecture.md (Mission, Architectural Boundaries — "shall not replace Journey Engine, replace Opportunity Engine, override member learning choices"). FPB-002, FPB-015 (Academy named as a standing screen, no prior deep spec).
**ADRs:** ADR-014 (Academy Foundation — the 9 backend decisions this Domain builds on, unchanged). ADR-015 (AI Engine — `buildAcademyGuidancePrompt()`, `RecommendationCategory.COURSE`). DOMAIN-005 (Voice Interface Presence — the Highlight Registry and Dynamic Screen Orchestration this Domain extends).

## Founder Decisions (resolution record)

1. **Media playback deferred, approved.** The reading experience is text-first (`Lesson.content`), fully functional without lesson media; `GET /academy/media/:id` remains staff-only. Media display is a clean, additive follow-up, not a blocker.
2. **Reflection over evaluation, approved and extended.** No "Knowledge Check" language anywhere. Every lesson ends with one of: *Reflect, Consider, Practice, Apply, Think About This, Stewardship Reflection, Your Next Step* — framed around integration into the member's life, never recall-testing.
3. **Route/hook extensions approved; growth tracking added.** `'academy'` added to the Voice Domain's allow-lists; `useRecommendationSubjects` extended for `courseId`. Per the Founder's addition, progress tracking is **growth-oriented**, not a bare percent-complete bar: lessons completed, areas explored, skills practiced, certifications earned, and the member's current learning journey. The Academy's front door is framed **"I want to grow"**, not "browse courses."

## Backend Changes

- **`apps/api/src/ai/voice/voice-tools.ts`** — `'academy'` added to `VOICE_ALLOWED_ROUTES`, so the AI Steward may navigate a member into the Academy while continuing to talk.
- No other backend changes. Every Academy read/write the frontend needed already existed: course/module/lesson browsing (with `q` search and `learningDomain` category filter already supported by `ListCoursesQueryDto` — no new query params needed), learning paths, enrollment, lesson-progress tracking with server-side auto-completion and certification issuance, certifications, and the AI guidance endpoint (`POST /ai/academy/courses/:id/guidance`, built for WO-029, unwired until now).

## Frontend Changes

- **`lib/api/academy.ts`** (new) — typed client for courses, modules, lessons, learning paths, path-courses, enrollments, lesson progress, certifications, and AI course guidance, mirroring the backend DTOs exactly.
- **`state/academy/AcademyContext.tsx`** (new) — reducer-based state for the course catalog, learning paths, course detail (modules/lessons), enrollments, lesson progress, certifications, and AI guidance (cached per course, never re-requested once loaded). `markLessonProgress` re-fetches enrollments and certifications on a `COMPLETED` transition specifically, since the lesson-progress response alone doesn't reveal that the server just auto-completed the course and issued a certification. A memoized `growthSummary` selector derives lessons completed, distinct learning areas explored, distinct modules ("skills") touched, certifications earned, and the current in-progress journey — entirely client-side from existing state, inventing no new backend contract.
- **`design-system/components/recommendations/useRecommendationSubjects.ts`** — extended to resolve `courseId` targets (via `getCourse`) alongside the existing `opportunityId` resolution, shared unchanged by the Welcome flow and Opportunity Center.
- **`design-system/components/voice/voice-routes.ts`** — `academy: '/academy'` added to the frontend's defense-in-depth allow-list mirror.
- **`design-system/components/academy/`** (new) — `AcademyCenter` (Grow / Explore / My Learning, mirroring the Opportunity Center's proven all-panels-stay-mounted tab pattern so in-progress state survives tab switches), `GrowTab` ("I want to grow" front door: growth summary, continue-learning, AI-prepared course recommendations — nothing generated automatically, always an explicit member action), `ExploreTab` (search, `learningDomain` category filter, learning-path browsing), `CourseDetail` (outline, enroll, "Ask your Steward" guidance panel), `LessonReader` (text reading experience plus a reflection prompt — never a scored quiz), `MyLearningTab` (growth summary, current journey, certifications), `CourseCard`, `GrowthSummaryCard`, `CertificationList`, `AcademyFilters`, `AcademyTabs`, plus `academy-format.ts` and `reflection-prompts.ts` utilities.
- **Highlight Registry wiring**: `CourseCard` → `Academy.Course.<id>`, `LessonReader` → the fixed `Academy.Lesson.Current` (the Founder's own named example) — the AI Steward can highlight lesson content while explaining it and navigate Academy screens while teaching, per the Domain's AI Steward Integration requirement.
- **`app/(member)/academy/page.tsx`** — now renders `AcademyCenter`, replacing the placeholder. No navigation change was needed: `Academy` was already listed in `navigation/surfaces.ts` pointing at `/academy`.
- **`state/AppStateProvider.tsx`, `state/index.ts`** — `AcademyProvider` wired into the provider tree and public state exports.

## Domain Ownership (as delivered)

Academy Home (`GrowTab`), personalized recommendations (AI-prepared, member-approved), Courses/Modules/Lessons, reading experience, reflection prompts, progress tracking, Continue Learning, search, categories, completion tracking, achievement tracking (certifications), responsive layouts, accessibility, production-quality UI. "Interactive exercises" render as the reflection prompt at the end of each lesson, deliberately non-graded, consistent with the Founder's explicit anti-evaluative direction.

## Explicit Non-Ownership (respected)

Home Dashboard, Opportunity Center, Community, Pods, Calendar, Messages, Documents, Profile, Settings, and Connected Experiences were not touched. `StewardshipRecommendationType.COURSE` remains out of scope per ADR-014's recorded circular-dependency deferral.

## Testing

- **Backend**: no new unit test required for the one-line `VOICE_ALLOWED_ROUTES` addition (no spec asserted the array's exact contents). Full backend regression, excluding the pre-existing environment limitation of integration/e2e specs that require a live Postgres connection unavailable in this sandbox: **626/626 tests, 67 suites**.
- **`AcademyContext.test.tsx`** (new, 6 tests): search + cache, enroll, the `COMPLETED`-triggered enrollment/certification refresh (and that a non-completing update does *not* trigger it), AI guidance caching (never re-requested), and the growth-summary derivation.
- **`useRecommendationSubjects.test.tsx`** (extended, +1 test): course-target resolution, alongside the pre-existing opportunity-target tests (unchanged).
- **`LessonReader.test.tsx`** (new, 6 tests): content rendering with no "knowledge check"/"quiz" language anywhere, auto-start-once behavior, no duplicate start for an already-started lesson, marking complete, the completed acknowledgement state, `jest-axe` clean.
- **`AcademyCenter.test.tsx`** (new, 3 tests): sign-out gate, the full Domain Completion Rule path end-to-end (discover → hear AI guidance → enroll → read a lesson → reflect → mark complete → see it reflected in growth, without losing tab state), and `jest-axe` clean.
- **Totals**: 16 new frontend tests. Full `apps/web` regression: **64 suites, 313 tests, all passing** (297 carried forward unchanged, matching every prior Domain's non-regression bar).
- **Full pipeline**: `next lint` clean, `tsc --noEmit` clean (both apps), `next build` succeeds (`/academy` now compiles as a real 8.45 kB route, not a placeholder), `nest build` clean.

## Architecture Compliance

- **Governing Canons followed**: AFX-001 §12 (no addictive engagement mechanics — no streaks, no gamified pressure), AFX-006, EF-007.
- **Governing Blueprints followed**: PA-010 (all Architectural Boundaries respected — no Journey/Opportunity Engine override, no institutional-governance surface exposed to members).
- **Architectural deviations**: none from governing documents. Three Founder Decisions were surfaced explicitly and approved before implementation began, one with Founder-directed refinements (the reflection-language list, the growth-tracking dimensions, the "I want to grow" framing) folded directly into the implementation.

## Risks and How They Were Addressed

1. **Lesson content is a raw `String`, no markup guarantee** — the reader renders it as plain, typography-first long-form text (`white-space: pre-wrap`), making no assumption about markdown or HTML structure.
2. **Server-side auto-completion is invisible to the lesson-progress response alone** — `markLessonProgress` explicitly re-fetches enrollments and certifications on every `COMPLETED` transition, proven by a dedicated test (and proven *not* to over-fetch on non-completing updates).
3. **`useRecommendationSubjects` is shared with two already-shipped surfaces** — extended, not rewritten; a dedicated test proves the pre-existing opportunity-resolution path is unaffected.
4. **A cross-stack allow-list going out of sync** (`voice-routes.ts` vs. the backend's `VOICE_ALLOWED_ROUTES`) — same hand-maintained-mirror risk already flagged in DOMAIN-005; `'academy'` was added to both in the same change.

## What Remains

- **Lesson media (video/audio/image) display** — deliberately deferred (Founder Decision 1). `GET /academy/media/:id` would need to open to authenticated members (or `CourseMedia` responses would need to embed resolved asset details) before this is buildable without inventing a new backend contract.
- **Learning-path-level completion tracking** — by ADR-014 Decision, completion is Course-scoped only; a Learning Path is a discovery/curation structure, not itself a progress-tracked entity. This Domain's `ExploreTab` surfaces paths for browsing only, consistent with that backend decision.
- **Deeper Journey Engine linkage** — today the Journey connection is conversational (`getCourseGuidance` grounds its answer in the member's own goals via the AI Engine); no direct Course↔Goal foreign key exists in the schema. Building one would be a Journey Engine change, out of this Domain's ownership.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] A member can discover a course by searching and filtering by learning area.
- [x] A member can ask their Steward how a specific course relates to their own goals, and receive a real, caller-grounded answer.
- [x] A member can enroll in a course with one action.
- [x] A member can read a lesson's full content and receive a non-evaluative reflection prompt — never a "Knowledge Check" or scored quiz.
- [x] Completing every lesson in a course auto-completes the enrollment and, where the course grants certification, auto-issues one — and the frontend picks this up and displays it without a page reload.
- [x] Progress is shown as growth (lessons completed, areas explored, skills practiced, certifications earned, current journey), never a bare percent-complete bar.
- [x] The AI Steward can navigate a member into the Academy and highlight the lesson it is discussing while a voice session is live.
- [x] No addictive engagement mechanic (streak, score, artificial urgency) exists anywhere in the Academy UI.
- [x] Every new component passes `jest-axe` with zero violations.
- [x] `apps/api` and `apps/web` both build, lint, and type-check cleanly; 626/626 backend tests and 313/313 frontend tests pass, including 16 new frontend tests for this Domain.
