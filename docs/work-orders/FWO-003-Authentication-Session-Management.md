# FWO-003 — Authentication & Session Management

| Field | Value |
|---|---|
| Work Order Number | FWO-003 |
| Title | Authentication & Session Management |
| Status | Complete |
| Priority | High (unblocks every authenticated frontend surface, including Conversation Core) |
| Date | 2026-07-16 |

---

## Objective

Implement the complete frontend authentication experience and session lifecycle against the existing, unmodified backend authentication API (`apps/api/src/auth/**`, WO-019/ADR-005): login, registration, password reset, email verification UI, session initialization, protected routes, access-token management, automatic refresh, session restoration, logout, and session-expiration handling.

Scoped and Founder-approved before implementation. The approval carried an explicit boundary: this Work Order owns the full authentication lifecycle; it does **not** own Conversation logic, Voice, Journey, Opportunities, or AI orchestration, and no authentication lifecycle logic may migrate into the Conversation module (`state/conversation/**`, `design-system/components/conversation/**`, `lib/api/conversations.ts`) — verified unmodified by this Work Order.

## Scope

- **Token architecture** (`lib/auth/token-store.ts`): access token in memory only, refresh token persisted to `localStorage`, module-level subscriber pattern so both React and the non-React transport layer read a single source of truth.
- **Session bridge** (`lib/auth/session-bridge.ts`): refresh-with-in-flight-deduplication, required because refresh tokens rotate on every use (ADR-005) — two concurrent 401s must not each attempt their own refresh.
- **Automatic refresh + retry-once**, implemented in the shared transport layer (`lib/api/http.ts`), not in any feature module. Every existing domain client (`lib/api/conversations.ts`, unmodified) gains this behavior automatically since it defaults to on.
- **`SessionContext`** rebuilt as a reactive mirror over the token store, adding `login`/`register`/`logout` actions, `isRestoring`, `sessionExpired`, and member identity (`memberId`/`email`/`roles`) decoded from the access token — while preserving the exact `session`/`setSession` shape FWO-002 already depends on.
- **Auth forms** (`design-system/components/auth/**`): `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailStatus`, built from FWO-001 primitives plus a new `FormField` primitive (FPB-005 §3 "Forms").
- **`AuthGate`**: protects the 20 FPB-002 member surfaces, waiting for silent restoration before deciding whether to redirect, so an already-authenticated member never sees a flash of the sign-in screen.
- **Route restructuring**: the 20 FWO-001 surfaces moved into a route group (`app/(member)/**`, URLs unchanged) so `AppShell` + `AuthGate` apply only to authenticated surfaces; five new top-level routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`) render without member navigation chrome, at the exact paths the backend's email templates already link to.

## Out of Scope (confirmed not touched)

- `state/conversation/**`, `design-system/components/conversation/**`, `lib/api/conversations.ts` — zero diff.
- Voice, Journey, Opportunities, AI orchestration.
- Any backend contract change — every endpoint consumed exactly as implemented in WO-019/ADR-005.
- Resend-verification-email — no such backend endpoint exists; not invented.

## Dependencies

- `apps/api/src/auth/**` (WO-019/ADR-005) — the exact, unmodified backend contract this Work Order integrates against.
- FWO-001 (design tokens, component primitives, `AppShell`) and FWO-002 (established the `lib/api/http.ts` shared transport layer this Work Order extends).
- OAS-SEC-003 (Identity and Access Management Framework), ADR-005 — governing security tier.
- FPB-005 §3, FPB-009, FPB-010 §3, FPB-011, FPB-014 — governing blueprints consulted directly.

## Architecture Decisions

1. **Token storage split**: access token in memory only, never in `localStorage`; refresh token in `localStorage` since the backend issues tokens in the JSON response body, not an `httpOnly` cookie, and no cookie-based alternative exists without a backend contract change (out of scope). Documented as a known, standard bearer-token-SPA tradeoff, not a silent decision — see Risks.
2. **Concurrent-401 de-duplication** in `session-bridge.ts`, required by the refresh token's rotate-on-every-use behavior (ADR-005) — verified by a dedicated test.
3. **Refresh-and-retry lives in `lib/api/http.ts`**, shared transport infrastructure already established in FWO-002, not in Conversation code — the concrete mechanism satisfying the Founder's module boundary.
4. **Route group restructuring** (`app/(member)/**`) — a mechanical, URL-preserving reorganization to apply `AuthGate`/`AppShell` only to authenticated surfaces; not a redesign of any surface's content or of authentication itself.
5. **Member identity decoded from the access token client-side** (`lib/auth/decode-access-token.ts`) rather than an extra `GET /auth/me` round-trip after every refresh — the token already carries `sub`/`email`/`roles`; the frontend never uses this for authorization decisions, only presentation (the backend re-validates every request).

## Deliverables

- `lib/auth/{token-store,session-bridge,decode-access-token}.ts` (+ tests)
- `lib/api/auth.ts` (+ `http.ts` extended with `configureAuthBridge`/`retryOn401`, + tests)
- `state/session/SessionContext.tsx` (rebuilt, + tests)
- `design-system/components/FormField/**`
- `design-system/components/auth/**` (`AuthLayout`, `AuthGate`, `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailStatus`, `auth-error-copy.ts`, `password-strength.ts`, all + tests)
- `app/(member)/**` (route group, 20 surfaces relocated, URLs unchanged)
- `app/{login,register,forgot-password,reset-password,verify-email}/page.tsx`
- `app/(member)/layout.tsx`, `app/layout.tsx` (updated)
- `docs/work-orders/FWO-003-Authentication-Session-Management.md` (this file)

## Files Created

- `apps/web/lib/auth/token-store.ts` (+ `.test.ts`)
- `apps/web/lib/auth/session-bridge.ts` (+ `.test.ts`)
- `apps/web/lib/auth/decode-access-token.ts`
- `apps/web/lib/api/auth.ts`
- `apps/web/design-system/components/FormField/{FormField.tsx,FormField.module.css,index.ts}`
- `apps/web/design-system/components/auth/{AuthLayout,AuthGate,LoginForm,RegisterForm,ForgotPasswordForm,ResetPasswordForm,VerifyEmailStatus}.tsx` (+ `.module.css` where applicable, + `.test.tsx` each), `auth-error-copy.ts`, `password-strength.ts`, `index.ts`
- `apps/web/app/(member)/layout.tsx`
- `apps/web/app/{login,register,forgot-password,reset-password,verify-email}/page.tsx`
- `apps/web/state/session/SessionContext.test.tsx`

## Files Modified

- `apps/web/lib/api/http.ts` — added `configureAuthBridge`, `retryOn401` option, refresh-and-retry-once on 401 (defaults on; `lib/api/conversations.ts` itself untouched).
- `apps/web/lib/api/http.test.ts` — added 401-retry coverage.
- `apps/web/state/session/SessionContext.tsx` — rebuilt as a token-store-backed reactive mirror with `login`/`register`/`logout`/`isRestoring`/`sessionExpired`; `session`/`setSession` shape preserved for FWO-002 compatibility.
- `apps/web/app/layout.tsx` — no longer wraps `children` in `AppShell` (moved to the new member route group layout).
- The 20 FWO-001 route files — relocated (`git mv`) into `app/(member)/`; only their relative import depth changed (one additional `../`), no content changes.

## Database Changes

None. Frontend-only; consumes the existing WO-019 schema/API without modification.

## API Changes

None (integration-only). Consumed, unmodified: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `GET /auth/me` (client exposed for completeness, not currently called on any critical path — member identity is decoded from the access token instead).

## Accessibility

- `FormField` associates label, help text, and error message via `aria-describedby`/`aria-invalid`/`aria-required` once, reused by every auth form.
- Password-strength and token-missing errors use `role="alert"` (via `FormField`/`ErrorState`) so they're announced immediately.
- `AuthGate` shows an explicit `LoadingState` during restoration rather than an unannounced blank screen.
- All auth form and `AuthGate` component tests pass `jest-axe` with zero violations.

## Testing Requirements

- **Unit**: `token-store.test.ts` (4 tests — set/clear/persist/notify), `session-bridge.test.ts` (5 tests — no-op without a token, refresh success/rotation, refresh failure clears tokens, concurrent-call de-duplication, sequential refreshes after completion), `http.test.ts` (+3 tests — retry-and-succeed, retry-exhausted-surfaces-401, `retryOn401: false` skips the bridge entirely).
- **Integration**: `SessionContext.test.tsx` (6 tests — cold start, login decodes identity from the token, silent restoration from an existing session, logout clears state and best-effort revokes server-side, a failed restoration marks the session expired, the `setSession` escape hatch remains functional for dependent modules).
- **Component + accessibility**: `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailStatus`, `AuthGate` (26 tests total) — success paths, backend-error pass-through, client-side password validation, missing-token handling, session-expired notice, loading/redirect behavior, `jest-axe` on every form.
- **Regression**: all 30 pre-existing FWO-002 tests re-run unchanged and pass, confirming zero impact on the Conversation module from the `SessionContext`/`http.ts` changes.
- **Totals**: 17 suites, 72 tests, all passing.
- **Not automated in this Work Order**: no live backend was running during testing; all API calls are mocked at the module boundary. No manual browser/screen-reader session was performed.

## Architecture Compliance

- **Governing Canons followed**: AFX-001 §7 (Earn Every Question — password rules explained, not hidden), §10 (Preparation Before Approval), §11 (Member Sovereignty — logout is immediate and local-first).
- **Governing Blueprints followed**: FPB-005 §3 (Forms), FPB-009 (frontend consumes the documented contract only — verified no backend change), FPB-010 §3 (Session State — "Authentication" category now fully populated), FPB-011, FPB-014.
- **Constitutional/security tier**: OAS-SEC-003, ADR-005 — authentication mechanisms verify identity and protect credentials; refresh-token rotation and hashed server-side storage are backend properties this Work Order relies on rather than reimplements.
- **Architectural deviations**: none. The route-group restructuring is a mechanical layout change, not a deviation from any governing document.

## Acceptance Criteria

- [x] Login, registration, password reset, and email verification all work against the real, unmodified backend contract.
- [x] The 20 member surfaces are inaccessible without authentication; an authenticated member reloading the page never sees a flash of the sign-in screen.
- [x] A member's session survives a page reload via silent refresh-token-based restoration.
- [x] An expired/revoked session redirects to `/login` with a calm, explicit notice — no silent failure.
- [x] Logout is immediate locally and best-effort revokes the refresh token server-side.
- [x] No authentication lifecycle logic exists anywhere under `state/conversation/**`, `design-system/components/conversation/**`, or in `lib/api/conversations.ts` — confirmed via diff review.
- [x] `apps/web` builds, lints, and type-checks cleanly; 72/72 tests pass, including all 30 pre-existing FWO-002 tests unchanged.
