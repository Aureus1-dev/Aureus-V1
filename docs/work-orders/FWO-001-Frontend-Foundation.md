# FWO-001 — Frontend Foundation

| Field | Value |
|---|---|
| Work Order Number | FWO-001 |
| Title | Frontend Foundation (Phase One) |
| Status | Complete |
| Priority | High (gates every subsequent frontend Work Order per FPB-015) |
| Date | 2026-07-16 |

---

## Objective

Implement Phase One — Foundation of the Frontend Build Order (FPB-015): the design-system and application infrastructure that must exist before any conversation, AI Steward, or member-facing screen work begins. FPB-015 states this explicitly — "No feature development begins until this foundation is operational."

This Work Order was scoped and approved by the Founder before any code was written, per the Decision Discipline. The approval carried one binding amendment — **Brand Neutral Foundation**: the token *architecture* (color roles, typography, spacing, motion, breakpoints, elevation, radius, responsive scale, theme mechanism) is implemented now, but no official Aureus color palette, typography, iconography, imagery, or motion language is finalized here. All values in this Work Order are intentionally neutral placeholders, structured so that every visual token can be replaced centrally — in the token source files only — without any component refactoring. Finalizing the Aureus brand is reserved for a dedicated future Brand System Work Order.

## Scope

- **Design token architecture** (FPB-006): color role, typography, spacing, motion, breakpoint, elevation, radius, and z-index tokens as the single source of truth for every visual property. Semantic naming only (Surface Primary, Action Primary, Success/Warning/Error/Information, Opportunity/Journey/Steward/Conversation), never raw values in components.
- **Theme system**: a server-rendered CSS custom-property layer generated directly from the token source (no dual-maintained CSS), light/dark theming via `data-theme`, and a client `ThemeProvider` for member-controlled theme and reduced-motion preference, persisted locally.
- **Accessibility foundation** (FPB-011): skip link, visually-hidden utility, global focus-visible styling, and `prefers-reduced-motion` support wired directly into the motion tokens so every animation in the system respects it automatically.
- **Component library foundation** (FPB-005): accessible base primitives — `Button`, `Card`, `LoadingState`, `EmptyState`, `ErrorState` — built exclusively from design tokens. Conversation-specific components (Member Message, Steward Message, Reflection Block, etc.) are explicitly out of scope; they belong to Phase Two once the Conversation Engine exists.
- **Responsive layout shell** (FPB-012, FPB-002 §4): a conversation-primary `AppShell` with header, primary navigation, and main landmark, adapting from a stacked mobile layout to a sidebar desktop layout at the FPB-012-aligned breakpoint, without changing the member's mental model.
- **Routing architecture**: a Next.js App Router route scaffold for all 20 primary surfaces named in FPB-002 §3 (Welcome, Conversation, Home, Journey, Opportunities, Academy, Community, Pods, Steward, Documents, Tasks, Calendar, Notifications, Messages, Resources, Profile, Settings, Permissions & Connected Accounts, Search, Help & Support), each rendering a placeholder surface inside the shell. No surface's actual member experience is implemented.
- **State management foundation** (FPB-010 §3): Session State, Interface State, and Local Preferences scaffolded as React context providers. Conversation State is explicitly excluded — it depends on the Conversation Engine, which is Phase Two.

## Out of Scope

- Any conversation UI or AI Steward integration (FPB-004, FPB-013) — Phase Two.
- Voice and multimodal interaction (FPB-008) — Phase Two.
- Any specific member-facing screen content (Welcome flow, Journey, Opportunities, etc.) — Phases Three and Four.
- Backend integration of any kind (FPB-009) — this phase ships no live data; Session State is a typed, empty shape only.
- Finalized Aureus branding, palette, typography, iconography, or motion language — reserved for a future Brand System Work Order per the Founder's Brand Neutral Foundation amendment.
- Any new frontend framework, CSS framework, or state-management library — this Work Order uses only what already exists in the `apps/web` scaffold (Next.js App Router, React) plus native CSS Modules and React Context, so as not to introduce a pattern conflicting with the Blueprint without a Founder Decision.

## Dependencies

- `apps/web` — the existing Next.js 15 / React 19 monorepo scaffold this Work Order builds on top of; no scaffold replacement.
- FPB-000 (Blueprint Index) — governs reading order and the Engineering Workflow this Work Order followed.
- AFX-001, AFX-003, AFX-004, AFX-006 — governing canons for experience, visual design system, member journey, and flourishing.
- FPB-001, FPB-005, FPB-006, FPB-009, FPB-010, FPB-011, FPB-012, FPB-015 — governing blueprints consulted directly in scoping this Work Order.

## Source Documents

- `docs/frontend/canon/AFX-001-Frontend-Experience-Canon.md` through `AFX-006-Member-Flourishing-Canon.md`
- `docs/frontend/blueprints/FPB-000-Frontend-Blueprint-Index.md` through `FPB-016-Acceptance-Test-Specification.md` (all 17 read in full before this Work Order was scoped)
- `docs/implementation/IC-013-Repository-Organization-Standard.md`

## Deliverables

- `apps/web/design-system/tokens/**` — token architecture
- `apps/web/design-system/theme/**` — theme generation, `ThemeStyle`, `ThemeProvider`
- `apps/web/design-system/accessibility/**` — `SkipLink`, `VisuallyHidden`
- `apps/web/design-system/components/**` — `Button`, `Card`, `LoadingState`, `EmptyState`, `ErrorState`
- `apps/web/design-system/layout/**` — `AppShell`, `PlaceholderSurface`
- `apps/web/design-system/navigation/surfaces.ts` — the 20-surface registry shared by navigation and routing
- `apps/web/state/**` — `SessionProvider`, `InterfaceProvider`, `PreferencesProvider`, `AppStateProvider`
- `apps/web/app/**` — root layout wired to the theme/state/shell providers, root redirect to `/welcome`, and 20 placeholder surface routes
- `apps/web/css-modules.d.ts` — CSS Modules type declaration for `tsc --noEmit`
- `docs/work-orders/FWO-001-Frontend-Foundation.md` (this file)

## Files Created

- `apps/web/design-system/tokens/{color,typography,spacing,motion,breakpoints,elevation,radius,z-index,index}.ts`
- `apps/web/design-system/theme/build-theme-css.ts`, `theme/ThemeStyle.tsx`, `theme/ThemeProvider.tsx`, `theme/index.ts`
- `apps/web/design-system/accessibility/SkipLink.tsx` (+ `.module.css`), `accessibility/VisuallyHidden.tsx` (+ `.module.css`), `accessibility/index.ts`
- `apps/web/design-system/components/{Button,Card,LoadingState,EmptyState,ErrorState}/*.{tsx,module.css}`, `components/index.ts`
- `apps/web/design-system/layout/AppShell.tsx` (+ `.module.css`), `layout/PlaceholderSurface.tsx`, `layout/index.ts`
- `apps/web/design-system/navigation/surfaces.ts`
- `apps/web/state/session/SessionContext.tsx`, `state/interface/InterfaceContext.tsx`, `state/preferences/PreferencesContext.tsx`, `state/AppStateProvider.tsx`, `state/index.ts`
- `apps/web/app/{welcome,conversation,home,journey,opportunities,academy,community,pods,steward,documents,tasks,calendar,notifications,messages,resources,profile,settings,permissions,search,help}/page.tsx` (20 routes)
- `apps/web/css-modules.d.ts`

## Files Modified

- `apps/web/app/layout.tsx` — now renders `ThemeStyle` in `<head>`, and wraps `children` in `ThemeProvider` → `AppStateProvider` → `AppShell`; updated metadata title/description.
- `apps/web/app/page.tsx` — replaced the monorepo-scaffold placeholder with a redirect to `/welcome`.
- `apps/web/app/globals.css` — replaced hardcoded colors with token-derived CSS variables; added global focus-visible styling and a `prefers-reduced-motion` block.

## Accessibility

- Skip link present on every screen (FPB-011 §5, §10), targeting the `main` landmark.
- Global `:focus-visible` styling using the focus-ring token; mouse-triggered focus does not show the ring.
- `prefers-reduced-motion: reduce` disables all animation durations globally in addition to the token-level `data-reduced-motion` override, so a member's OS-level preference is honored even before the in-app preference control (a future Work Order) exists.
- `LoadingState` uses `role="status"`/`aria-live="polite"`; `ErrorState` uses `role="alert"` — both per FPB-011 §4 and FPB-014 §4's requirement that failures be explained, not just visually indicated.
- Primary navigation is a `<nav aria-label="Primary">` landmark; the shell's `<main>` has `id="main-content"` and `tabIndex={-1}` so the skip link moves focus correctly.

## Testing Requirements

- `pnpm run check-types` (apps/web) — clean, no errors.
- `pnpm run lint` (apps/web, `next lint`) — no ESLint warnings or errors.
- `pnpm run build` (apps/web, `next build`) — compiles successfully; all 20 surface routes plus `/` and `/_not-found` prerender as static content with no build-time errors.
- No automated accessibility or component tests were added in this Work Order, since no components carry member-facing behavior yet beyond static placeholder content — automated accessibility testing (axe, keyboard-only, screen-reader) becomes meaningful starting with Phase Two once real interactive components exist, per FPB-011 §10 and FPB-016 §5.

## Acceptance Criteria

- [x] All governing Canons (AFX-001, 003, 004, 006) and Blueprints (FPB-000, 001, 005, 006, 009, 010, 011, 012, 015 directly; all 17 FPB documents read for context) are satisfied by the scope above.
- [x] No component references a hardcoded visual value where a token exists (FPB-006 §1).
- [x] No official Aureus branding, palette, or typography is finalized (Founder amendment).
- [x] Conversation remains architecturally primary in the shell (`Return to Conversation` quick action, conversation-first navigation ordering) per FPB-002 §4 and FPB-012 §4, even though the Conversation surface itself is a placeholder.
- [x] Reduced motion is honored without requiring any member action (system-preference default).
- [x] `apps/web` builds, lints, and type-checks cleanly.
- [x] No backend business logic exists in the frontend (FPB-009 §3) — this phase makes zero network requests.
