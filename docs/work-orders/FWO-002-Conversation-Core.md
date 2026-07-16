# FWO-002 — Conversation Core

| Field | Value |
|---|---|
| Work Order Number | FWO-002 |
| Title | Conversation Core (Phase Two) |
| Status | Complete |
| Priority | High (the primary interface per AFX-001 §3) |
| Date | 2026-07-16 |

---

## Objective

Implement Phase Two — Conversation Core of the Frontend Build Order (FPB-015): "The conversation becomes the primary interface." This Work Order replaces the `/conversation` placeholder shipped in FWO-001 with a production text conversation experience wired to the existing `/ai/conversations` backend service (WO-029).

Scoped and Founder-approved before implementation, per the Decision Discipline, including two binding architectural boundaries (Founder Decision, this Work Order):

1. **Dynamic Screen Orchestration is deferred.** No heuristic parsing, keyword matching, or inference over assistant message text is used to trigger navigation. The backend currently returns plain conversational text with no structured directive field; inventing one on the frontend would mean the frontend performing backend business logic (FPB-009 §3). Functional conversation-directed navigation awaits an approved, typed orchestration contract (action type, approved route/target, validated parameters, explanation, approval requirement, confidence/fallback) executed only through a centralized, allowlisted frontend boundary.
2. **Voice Interaction is fully deferred, not scaffolded.** No microphone control, enabled or disabled, is present. No audio is captured. No speech endpoint is mocked. The composer's `onChange(value: string)` contract is input-source-agnostic — a future voice input could populate the same draft state — but this Work Order implements only text.

## Scope

- **Conversation state** (FPB-010 §3): `ConversationProvider` — current conversation, conversation list/history with pagination metadata, messages keyed by conversation, pending-response flag, draft (preserved across recoverable failures), recoverable error state.
- **Conversation components** (FPB-005 §3): `ConversationSurface`, `MemberMessage`, `StewardMessage`, `ThinkingIndicator`, `ConversationTimeline`, `MessageComposer`, `ConversationHistory` — built exclusively from the token/theme system shipped in FWO-001.
- **AI steward integration**: the real `/ai/conversations` contract (create, list, get, list messages, ask) — see API Changes below. No mock or invented endpoints.
- **Reflection and response flow** (AFX-002 §5): a calm `ThinkingIndicator` while awaiting the reply; the steward's response is rendered exactly as returned — the frontend does not fabricate or rewrite a separate "reflection" (Reflection Boundary, Founder Decision).
- **Context preservation** (FPB-002 §7, FPB-010 §4): conversation state lives above the route in `AppStateProvider`, so it survives navigation within the app shell.
- **Conversation history**: backed directly by `GET /ai/conversations` (paginated) and `GET /ai/conversations/:id/messages`.
- **Error and recovery** (FPB-014): 401/429/503/400/network failures classified and shown via calm, non-technical `ErrorState` copy; retryable errors offer a "Try again" action; the draft is always restored on failure so no typed content is lost.
- **Duplicate-send prevention**: the composer and `sendMessage()` both guard on `pendingResponse`.

## Out of Scope (intentionally deferred — see Founder Decision above)

- **Dynamic Screen Orchestration** (FPB-004 §7, FPB-002 §4) — requires a backend/AI-orchestration contract that does not yet exist. Required dependency: a structured, typed directive field returned alongside (not instead of) the conversational text, validated and allowlisted before the frontend acts on it.
- **Voice interaction** (FPB-008) — requires a backend speech/audio contract that does not yet exist. No UI affordance for voice is present in this Work Order (Founder Decision: prefer an honest, complete text experience over a visible nonfunctional control).
- **Authentication/login UI** — this Work Order assumes `SessionState.accessToken` is populated by a future authentication Work Order. Until then, the surface correctly displays a sign-in prompt and makes no unauthenticated requests.
- Any other primary surface's content (Journey, Opportunities, etc.) — Phases Three/Four.

## Dependencies

- FWO-001 (Frontend Foundation) — token/theme system, `AppShell`, `Button`/`Card`/`LoadingState`/`EmptyState`/`ErrorState`, `SessionProvider`/`InterfaceProvider`/`PreferencesProvider`, the `/conversation` route scaffold.
- `apps/api/src/ai/conversations/**` (WO-029) — the exact, unmodified backend contract this Work Order integrates against.
- AFX-001, AFX-002 — governing canons.
- FPB-002, FPB-003 §6, FPB-004, FPB-005 §3, FPB-007 §4, FPB-008, FPB-009, FPB-010 §3, FPB-011 §9, FPB-013, FPB-014 — governing blueprints consulted directly.

## Deliverables

- `apps/web/lib/api/{config,errors,http,conversations}.ts` — typed backend client
- `apps/web/state/session/SessionContext.tsx` — extended with `accessToken` (fills in FPB-010 §3's "Authentication" category)
- `apps/web/state/conversation/ConversationContext.tsx` — Conversation State
- `apps/web/state/AppStateProvider.tsx` — extended to compose `ConversationProvider`
- `apps/web/design-system/components/conversation/**` — all conversation components + tests
- `apps/web/app/conversation/page.tsx` — now renders `ConversationSurface`
- `apps/web/jest.config.ts`, `jest.setup.ts` — test infrastructure (mirrors `apps/api`'s Jest convention)
- `docs/work-orders/FWO-002-Conversation-Core.md` (this file)

## Files Created

- `apps/web/jest.config.ts`, `apps/web/jest.setup.ts`
- `apps/web/lib/api/config.ts`, `lib/api/errors.ts`, `lib/api/http.ts`, `lib/api/conversations.ts`, `lib/api/http.test.ts`
- `apps/web/state/conversation/ConversationContext.tsx` (+ `.test.tsx`)
- `apps/web/design-system/components/conversation/{ConversationSurface,ConversationTimeline,ConversationHistory,MemberMessage,StewardMessage,ThinkingIndicator,MessageComposer}.tsx` (+ `.module.css` and `.test.tsx` for each), `conversation-error-copy.ts` (+ `.test.ts`), `Message.module.css`, `Message.test.tsx`, `index.ts`
- `apps/web/design-system/components/Button/Button.test.tsx` (smoke test added while wiring the test harness)

## Files Modified

- `apps/web/state/session/SessionContext.tsx` — added `accessToken: string | null`.
- `apps/web/state/AppStateProvider.tsx` — composes `ConversationProvider`.
- `apps/web/state/index.ts` — exports the conversation state module.
- `apps/web/app/conversation/page.tsx` — renders `ConversationSurface` instead of `PlaceholderSurface`.
- `apps/web/package.json` — added `test`/`test:watch` scripts and test devDependencies (`jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jest-axe`, `@types/jest-axe`, `identity-obj-proxy`).

## Database Changes

None. This Work Order is frontend-only; it consumes the existing WO-029 schema/API without modification.

## API Changes

None (integration-only). Consumed, unmodified: `POST /ai/conversations`, `GET /ai/conversations`, `GET /ai/conversations/:id`, `GET /ai/conversations/:id/messages`, `POST /ai/conversations/:id/messages`.

## Accessibility

- `ConversationTimeline` uses `role="log"` / `aria-live="polite"` / `aria-relevant="additions"` so new messages are announced without re-announcing history (FPB-011 §9).
- `MemberMessage`/`StewardMessage` carry a visually-hidden speaker label so screen-reader members can distinguish sides of the conversation without relying on visual position alone.
- `ThinkingIndicator` uses `role="status"` with an explicit `aria-label` (FPB-011 §4, AFX-002 §4 "Silence").
- `MessageComposer` has a properly associated `<label>`, supports Enter-to-send / Shift+Enter-for-newline, and disables the send action (not just visually, via the `disabled` attribute) while a response is pending or the draft is empty.
- All conversation components pass `jest-axe` with zero violations (verified in CI-equivalent local run, not just visual review).
- An initial version used `<ol>`/`<li>` for the timeline; `jest-axe` caught that `role="log"` is not an allowed ARIA role on a list element and that non-`<li>` children violate list semantics — corrected to a `<div role="log">` containing plain `<div>` message rows. This is a concrete example of automated accessibility testing catching a real defect before merge, not just a checklist item.

## Testing Requirements

- **Unit** (`lib/api/http.test.ts`): bearer-token attachment, error-message extraction, `ApiError` retryable classification, `NetworkError` on fetch rejection.
- **Unit** (`conversation-error-copy.test.ts`): every error kind produces non-empty, non-technical copy.
- **Integration** (`ConversationContext.test.tsx`, 9 tests): conversation creation on first message with deterministic ordering, existing-conversation loading, paginated history loading, duplicate-send prevention while pending, 503 draft-preservation and retryable-error reporting, 429 classification, unauthenticated guard (no API call made), network-failure classification, whitespace-only submission rejected.
- **Component** (`MessageComposer.test.tsx`, `ConversationTimeline.test.tsx`, `Message.test.tsx`, `ConversationSurface.test.tsx`): keyboard behavior (Enter vs. Shift+Enter), disabled states, message ordering, thinking-indicator visibility, sign-in gating, end-to-end send flow, 503 error presentation with the draft intact — 4 `jest-axe` checks across these suites, all passing with zero violations.
- **Totals**: 8 suites, 30 tests, all passing.
- **Not automated in this Work Order**: true responsive-breakpoint and `prefers-reduced-motion` behavior are CSS-driven (same token-based mechanism verified in FWO-001) — `jsdom` does not evaluate real layout or media queries, so these were verified by code review against the FWO-001 token/motion system rather than a browser-rendered assertion. Real end-to-end browser testing (e.g., against a running backend) was not performed in this Work Order.

## Architecture Compliance

- **Governing Canons followed**: AFX-001 (conversation-first, one meaningful next step, member sovereignty), AFX-002 (steward role, rhythm of conversation, reflection before recommendation, silence, member sovereignty).
- **Governing Blueprints followed**: FPB-002 §7 (context preservation), FPB-004 (lifecycle-informed component structure), FPB-005 §3 (named conversation components), FPB-007 §7 (`ThinkingIndicator` respects reduced motion), FPB-009 (frontend consumes the documented contract only; no business logic), FPB-010 §3 (Conversation State), FPB-011 §9 (conversation accessibility), FPB-014 (calm, action-oriented recovery language).
- **Approved deferrals**: Dynamic Screen Orchestration and Voice Interaction — both by explicit Founder Decision, documented above with the specific backend dependency each requires.
- **Architectural deviations**: none identified.

## Acceptance Criteria

- [x] Conversation is the primary rendered experience at `/conversation`, replacing the FWO-001 placeholder.
- [x] All conversation UI is built from FWO-001 tokens/components; no hardcoded visual values introduced.
- [x] The frontend integrates only the documented, unmodified `/ai/conversations` contract.
- [x] No frontend-side inference over assistant text drives navigation (Founder Decision 1).
- [x] No voice UI, functional or non-functional, is present (Founder Decision 2).
- [x] Draft content survives every recoverable failure path.
- [x] Duplicate sends are structurally prevented, not just visually discouraged.
- [x] `apps/web` builds, lints, and type-checks cleanly; 30/30 tests pass, including 4 `jest-axe` accessibility checks.
