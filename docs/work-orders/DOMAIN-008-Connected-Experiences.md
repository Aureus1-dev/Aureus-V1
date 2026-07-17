# DOMAIN-008 — Connected Experiences

| Field | Value |
|---|---|
| Domain Number | DOMAIN-008 (this session's Domain Delivery sequence) |
| Title | Connected Experiences |
| Status | Complete — Domain Completion Rule satisfied end-to-end |
| Priority | High (Founder-directed) |
| Date | 2026-07-17 |
| Process | Full Domain Delivery process: audit, Domain Implementation Plan surfacing "no live third-party credentials exist" as the central constraint, five Founder Decisions plus Trust Center/Banking/naming guidance, implementation, testing, this report |

---

## Objective

Connected Experiences gives members a place to opt into the outside services that matter to their goals — email, calendar, banking, government benefits — and to keep real documents their Steward can actually read and summarize, without ever pretending a connection exists that doesn't. The audit found no `ConnectedAccount`, `Document`, or third-party-integration backend anywhere in the codebase, and confirmed (PA-020) that "non-essential integrations" are excluded from V1 unless specifically approved — which the Founder's authorization satisfied. The audit also found zero live third-party credentials configured in any environment this codebase runs in. Founder Decision 1 resolved the resulting tension directly: **build the complete, real architecture — provider abstraction, catalog, audit trail, endpoints — but never simulate a successful connection.** Documents needed no such caveat: they are fully real in V1, backed by member-supplied text rather than invented cloud storage.

**Per the standing Domain Completion Rule, this Domain is now complete**: a member can view every connectable service with an honest answer to what Aureus can access, why, and what the AI Steward can do with it; attempt to connect a service and receive a truthful Coming Soon status (never a fabricated success) that is recorded in their own activity trail; and, independently, upload a document, have their Steward summarize real text they provided, and delete it — with every one of those actions visible afterward in the same audit trail.

## Governing Documents

**Canons:** none directly named Connected Experiences; the design answers to the Constitution's consent and non-surveillance posture as reflected in PA-018.
**Product Architecture:** PA-018 (Permissions & Access Architecture — role-based internal permissions only; third-party *consent* was an explicit gap this Domain originates, not role-based access). PA-020 (Version 1 Scope — "non-essential integrations" excluded from V1 "unless specifically approved"; the Founder's authorization is that approval).
**Blueprints:** FPB-009 (Backend Integration Map) — §5 lists "Documents," "Calendar," "Connected Accounts" as anticipated backend service categories (none previously built); §7 requires every request to respect "consent... audit logging." ENG-003 (Domain Definition Standard) — "External Service Adapters" is a named, established extension point (§4 Integration).
**Architecture precedent:** ADR-009 (Email Delivery Integration) — the exact stub/jsonTransport-fallback pattern this Domain reuses for `IConnectedAccountProvider`/`StubConnectedAccountProvider`. ADR-014 Decision 5 (Academy's `MediaAsset.storageRef` opaque-pointer pattern) — reused for `Document.storageRef` rather than inventing new cloud storage. ADR-015 Decision 1 (AI provider abstraction) — the DI-by-token pattern `AI_PROVIDER`/`EMAIL_SERVICE`/`CONNECTED_ACCOUNT_PROVIDER` all share.

## Founder Decisions (resolution record)

1. **Build the complete real architecture; never simulate success — approved.** `IConnectedAccountProvider` is a full provider abstraction (mirroring `IAiProvider`/`IEmailService`) with `StubConnectedAccountProvider` active for every `ConnectedProviderType` today, since no environment this codebase runs in has real OAuth/API credentials configured. `initiateConnection()` always reports `COMING_SOON` with the exact member-facing message: *"Coming Soon: the architecture for connecting `<service>` is complete, and live authorization will be enabled once production credentials are configured."* `ConnectedAccountsService.connect()` structurally cannot create a `ConnectedAccount` row unless the provider reports `AVAILABLE` — enforced in code, not by convention, and covered by a dedicated test (`connected-accounts.service.spec.ts` — "never creates a ConnectedAccount row when the provider reports COMING_SOON").
2. **Documents are fully real in V1 — approved.** No cloud storage was invented; `Document.storageRef` is the same opaque-pointer pattern as `MediaAsset.storageRef` (ADR-014 Decision 5). `extractedText` is supplied by the member/frontend directly; `DocumentsService.summarize()` refuses (`BadRequestException`) to generate a summary when `extractedText` is absent, so the AI Steward never fabricates a summary from a filename alone. Manual Calendar event CRUD was scoped **out** — Calendar remains a `ConnectedProviderType` (Coming Soon, like every other provider), not a feature Aureus itself owns yet.
3. **The AI Steward's boundary — approved and enforced structurally, not just documented.** The Steward may explain what's connected and what a document contains; it may never connect, revoke, upload, or delete on the member's behalf. This is not a runtime permission check on a broader capability — the shared, backend-owned interface-orchestration toolset (`INTERFACE_TOOL_SPECS`, DOMAIN-007) simply contains no such tool, for either voice or text. A dedicated test (`ai-boundary.spec.ts`) asserts the exact tool name list and fails the moment anyone adds a connect/revoke/upload/delete tool without an explicit Founder decision.
4. **The four-questions consent standard — approved.** `connected-providers.catalog.ts` is a fixed, code-defined catalog answering, for every provider: what Aureus can access, why it's needed, and what the AI Steward can do with it — plus a live-computed availability state (`CONNECTED` / `NOT_CONNECTED` / `COMING_SOON`), never a hardcoded claim of readiness. `ProviderCard` renders all four before any Connect control.
5. **Strengthened audit logging — approved.** `StewardActivityLog` is an append-only trail (never updated, never deleted) recording every `CONNECTION_REQUESTED`, `CONNECTION_ESTABLISHED`, `CONNECTION_REVOKED`, `DOCUMENT_UPLOADED`, `DOCUMENT_SUMMARIZED`, and `DOCUMENT_DELETED` event with its acting party (`MEMBER`, `AI_STEWARD`, or `SYSTEM`) — the explicit foundation for a future Trust Center, not a Trust Center itself.

**Naming:** the "Permissions" surface (`navigation/surfaces.ts`) is renamed **Connected Experiences** in nav/UI copy; its `id`/`href` (`permissions` / `/permissions`) are unchanged to avoid touching unrelated registry consumers.

## Backend Changes

- **`prisma/schema.prisma`** — five new enums (`ConnectedProviderType`, `ConnectedAccountStatus`, `DocumentCategory`, `StewardActivityEventType`, `StewardActivityActor`), three new models (`ConnectedAccount`, `Document`, `StewardActivityLog`), three new `User` relations, and `DOCUMENT_SUMMARY` added to the existing `AiCapability` enum. Migration `20260717120000_add_connected_experiences` (hand-written SQL, matching the codebase's established convention — no live database in this environment to run `prisma migrate dev` against).
- **`apps/api/src/connected-experiences/common/connected-providers.catalog.ts`** (new) — the fixed, per-provider four-question catalog.
- **`apps/api/src/connected-experiences/accounts/providers/`** (new) — `connected-account-provider.interface.ts` (`IConnectedAccountProvider`, `CONNECTED_ACCOUNT_PROVIDER` token), `stub-connected-account.provider.ts` (the "never simulate success" enforcement point), `connected-account-provider.module.ts` (DI factory, currently always resolves to the stub — architecturally ready for a real per-provider adapter to be registered later with zero change to `ConnectedAccountsService`).
- **`apps/api/src/connected-experiences/accounts/`** — `ConnectedAccountsService`/`ConnectedAccountsController` (`GET /connected-accounts` catalog+status merge, `POST /connected-accounts/:providerType/connect`, `POST /connected-accounts/:providerType/revoke`), repository interface + Prisma implementation.
- **`apps/api/src/connected-experiences/documents/`** — `DocumentsService`/`DocumentsController` (`POST /documents`, `GET /documents`, `GET /documents/:id`, `PATCH /documents/:id`, `POST /documents/:id/summarize`, `DELETE /documents/:id`), repository interface + Prisma implementation, owner-only (`NotFoundException`/`ForbiddenException`) ownership enforcement mirroring `ConversationsService.getOwnedOrThrow`.
- **`apps/api/src/connected-experiences/activity/`** — `StewardActivityLogService` (the shared audit-trail writer both sub-domains call), `StewardActivityLogController` (`GET /steward-activity`), repository interface + Prisma implementation.
- **`apps/api/src/ai/prompts/system-prompts.util.ts`** — `buildDocumentSummaryPrompt()`, operating only on real `extractedText`, explicitly instructed not to invent information.
- **`apps/api/src/ai/ai.module.ts`** — now exports `AiRequestsService` (previously module-private) so `DocumentsService` can reuse the existing audit/cost-tracked completion path rather than calling a provider directly.
- **`apps/api/src/connected-experiences/connected-experiences.module.ts`** — wires all three sub-domains; registered in `app.module.ts`; `connected-experiences` Swagger tag added in `main.ts`.

## Frontend Changes

- **`lib/api/connected-accounts.ts`, `lib/api/documents.ts`, `lib/api/steward-activity.ts`** (new) — thin typed clients mirroring the backend DTOs exactly.
- **`state/connected-experiences/ConnectedExperiencesContext.tsx`** (new) — reducer-based state covering the provider catalog, connect/revoke attempts (never assuming success — `lastConnectionAttemptByProvider` stores the honest response), documents (list/upload/update/summarize/delete with optimistic cache upsert/removal), and activity history. Composed into `AppStateProvider` alongside `AcademyProvider`.
- **`design-system/components/connected-experiences/`** (new domain) — `ConnectedExperiencesHome` (three-tab surface: Connected Accounts / Documents / Activity, mirroring `AcademyCenter`'s proven tabs pattern), `ConnectedExperiencesTabs`, `ProviderCard` (renders the four-question catalog answer plus an honest Connected/Not Connected/Coming Soon badge — never a fabricated Connected state), `ConnectedAccountsTab`, `UploadDocumentForm` (captures real file metadata via a file picker; since no cloud storage exists yet, the member pastes the document's text directly rather than the UI pretending to read file bytes it cannot), `DocumentCard`, `DocumentsTab`, `ActivityTab`, `connected-experiences-format.ts`.
- **`app/(member)/permissions/page.tsx`** — now renders `ConnectedExperiencesHome` (opening on the Connected Accounts tab), replacing the placeholder.
- **`app/(member)/documents/page.tsx`** — now renders the same `ConnectedExperiencesHome`, opening directly on the Documents tab (Documents remains its own named primary surface per FPB-002 §3).
- **`design-system/navigation/surfaces.ts`** — the `permissions` surface's label changed to "Connected Experiences" (id/href unchanged).

## Testing

- **Backend**: 662/662 unit tests, 74 suites (5 new: `stub-connected-account.provider.spec.ts`, `connected-accounts.service.spec.ts`, `documents.service.spec.ts`, `steward-activity-log.service.spec.ts`, `ai-boundary.spec.ts` — the last structurally proving the AI Steward's tool allow-list contains no connect/revoke/upload/delete capability). A full end-to-end spec (`connected-experiences.e2e.spec.ts`) was written matching every prior Domain's e2e convention (boots the full Nest app, exercises the golden path plus the self-only ownership boundary) but, like every e2e/integration spec in this codebase, requires a live Postgres connection this sandbox does not have — it will run in CI.
- **Frontend**: 371/371 tests, 73 suites (2 new: `ConnectedExperiencesContext.test.tsx` covering the reducer/state layer directly, and `ConnectedExperiencesHome.test.tsx` covering the Domain Completion Rule end-to-end — attempt to connect a provider and see an honest Coming Soon status recorded, then independently upload/summarize/delete a real document — plus a `jest-axe` accessibility pass with zero violations).
- **Full pipeline**: backend — `eslint`, `tsc --noEmit`, `nest build`, full `jest` suite all clean. Frontend — `next lint`, `tsc --noEmit`, full `jest` suite, and `next build` (both `/documents` and `/permissions` now compile as real routes, not placeholders) all clean.

## Architecture Compliance

- **Governing documents followed**: PA-018, PA-020, FPB-009, ENG-003, ADR-009, ADR-014, ADR-015.
- **Architectural deviations**: none from governing documents. The one real constraint this audit surfaced — zero live third-party credentials in any environment this codebase runs in — was resolved by Founder Decision 1 before implementation began, not discovered mid-build.

## Risks and How They Were Addressed

1. **The temptation to fake a successful connection for a better demo** — resolved structurally: `StubConnectedAccountProvider.initiateConnection()` always returns `COMING_SOON`, and `ConnectedAccountsService.connect()` has no code path that creates a `ConnectedAccount` row without an `AVAILABLE` response from the provider. Proven by a dedicated test, not just a code comment.
2. **AI-summarizing a document from its filename alone** — resolved by refusing: `DocumentsService.summarize()` throws `BadRequestException` when `extractedText` is empty, and `buildDocumentSummaryPrompt()` is only ever called with real text.
3. **The AI Steward quietly gaining a connect/revoke/upload/delete capability in a future change** — resolved with a regression-proof test (`ai-boundary.spec.ts`) asserting the exact five-tool allow-list, so any addition requires deliberately changing (and re-justifying) that assertion.
4. **Encryption-at-rest for future real OAuth refresh tokens** — flagged in the original audit as requiring an explicit decision before any schema was written. Not resolved either way in this Domain, since every provider is stub-backed and no real secret is ever stored by this implementation — documented here as a standing future concern for whoever wires the first real per-provider adapter, the same posture taken for live-provider verification in every prior Domain's report.
5. **jsdom's native `required` file input blocking test submission** — found while writing `ConnectedExperiencesHome.test.tsx`: a `<input type="file" required>` combined with `userEvent.upload()` did not satisfy jsdom's constraint validation, silently preventing the form's `submit` event from firing even though the JS-level `canSubmit` guard was already true. Fixed by removing the native `required` attribute and relying solely on the existing JS-level check (which already gated the button correctly) — a real, test-caught interaction bug between HTML5 constraint validation and jsdom's file-input handling, not a test artifact.

## What Remains

- **Real per-provider adapters** (Google OAuth for Gmail/Calendar, Plaid-style aggregators for Banking/Investment Accounts, etc.) — zero exist yet, by design; `ConnectedAccountProviderModule`'s DI factory is the single point where a real adapter would be registered and selected, mirroring `AiProviderModule`/`VoiceProviderModule`, with no change required to `ConnectedAccountsService`.
- **Encryption-at-rest decision for OAuth refresh tokens** — moot today (no real secret is ever stored), but must be resolved before the first real adapter is wired.
- **Trust Center** — `StewardActivityLog` is its foundation, not the Trust Center itself; a dedicated member-facing Trust Center surface (aggregating this audit trail with clearer visualization) remains a future Domain.
- **A generic file-storage/OCR pipeline** — Documents today rely on the member/frontend supplying `extractedText` directly; automatic text extraction from an uploaded file's actual bytes (via real cloud storage plus OCR) is explicitly out of scope, matching Founder Decision 2.

## Acceptance Criteria (Domain Completion Rule, verified)

- [x] A member can view every connectable service with an honest answer to what Aureus can access, why, and what the AI Steward can do with it.
- [x] A member can attempt to connect a service and receive a truthful status — never a fabricated success — for every provider in this environment.
- [x] A connection attempt is recorded in the member's own Steward activity trail.
- [x] A member can revoke an active connection; revoking a non-existent connection fails honestly (404), not silently.
- [x] A member can upload a real document, have their Steward summarize real text they provided, and delete it — all from one screen.
- [x] The AI Steward can explain connections and documents but structurally cannot connect, revoke, upload, or delete on the member's behalf — proven by a dedicated regression test, not just documentation.
- [x] Every new component passes `jest-axe` with zero violations.
- [x] `apps/api` and `apps/web` both build, lint, and type-check cleanly; 662/662 backend tests and 371/371 frontend tests pass, including 27 new backend tests and 7 new frontend tests for this Domain.
