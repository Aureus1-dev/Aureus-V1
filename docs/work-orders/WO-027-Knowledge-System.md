# WO-027 — Knowledge System

| Field | Value |
|---|---|
| Work Order Number | WO-027 |
| Title | Knowledge System (PA-013) |
| Status | Complete |
| Priority | High (only remaining canonical backend domain not blocked on a founder scope/product decision) |
| Date | 2026-07-15 |

---

## Objective

Implement the Knowledge System's Core Responsibilities — a structured, categorized, verified article repository with revision/version history and search — reusing the established verification-workflow pattern (Resources/Opportunities/Organizations) rather than inventing a new one, and proving Communication System's `notify()` integration point (WO-026/ADR-012) is genuinely reusable by a second, independently-built domain.

## Scope

- `KnowledgeArticle`: title/summary/content, `KnowledgeCategory` (9 values per PA-013's named Knowledge Categories), tags, optional `sourceUrl`, reusing the shared `VerificationStatus` verification workflow verbatim (`submit-for-review` → `verify`/`reject`, plus `archive`).
- `KnowledgeArticleRevision`: an append-only, pre-edit snapshot created whenever a substantive field (title/summary/content/category) changes; `KnowledgeArticle.version` increments alongside it.
- Full CRUD + verification workflow: create (Steward/Org/Business representative/Administrator), list/search (default VERIFIED-only, full-text + category + tag filters), get by ID/ref, update (author/Steward/Admin), soft-delete, verification-workflow actions.
- `GET /knowledge/articles/:id/revisions` — read-only revision history.
- Author notification on `verify`/`reject` via `NotificationsService.notify()` — the second real Communication System integration call site (after WO-026's Announcements fan-out), using a new, additive `NotificationCategory.KNOWLEDGE` enum value.
- Full Swagger documentation (`knowledge` tag).
- Unit, Prisma integration, and end-to-end automated tests.

## Out of Scope

- Search relevance scoring/ranking (no `confidenceScore`/`freshnessScore` equivalent) — not requested by PA-013's Core Responsibilities.
- Revision rollback (restoring a prior version as the live row) — revisions are read-only history in V1.
- AI Intelligence Engine / Academy actually consuming Knowledge articles as context/educational content — both domains are unbuilt; Knowledge's read endpoints require no further changes to serve them later.
- Any change to `ResourcesModule`/`OpportunitiesModule`/`OrganizationsModule`/`StewardshipModule` business logic.
- Wiring `notify()` into any *already-shipped* domain's own lifecycle events — that remains explicitly deferred per ADR-012 Decision 4; this WO only wires its own, newly-built domain.

## Dependencies

- WO-026 (Communication System) — complete, merged; supplies `NotificationsService`/`notify()`, extended with one additive `NotificationCategory.KNOWLEDGE` enum value, and the immediately preceding Work Order in sequence.
- WO-020 (Resource Directory) — supplies the verification-workflow pattern (shared `VerificationStatus`, `submit-for-review`/`verify`/`reject`/`archive` action-endpoint shape) reused verbatim.
- ADR-006 (Resource Directory) — the architectural precedent this WO extends to a fourth domain.

## Source Documents

- PA-013 — Knowledge System Architecture
- PA-018 — Permissions & Access Architecture
- ADR-003 — User Module (layering pattern)
- ADR-006 — Resource Directory (verification-workflow pattern reused verbatim)
- ADR-012 — Communication System (`notify()` integration point, `NotificationCategory` extensibility design)

## Deliverables

- ADR-013 — Knowledge System
- `apps/api/src/knowledge/**` (module, service, controller, repositories, DTOs, unit + integration + e2e tests)
- Prisma migration `add_knowledge_system`
- `docs/verification/WO-027-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `prisma/migrations/20260715073320_add_knowledge_system/`
- `apps/api/src/knowledge/knowledge.module.ts`
- `apps/api/src/knowledge/knowledge.controller.ts`
- `apps/api/src/knowledge/knowledge.service.ts`
- `apps/api/src/knowledge/knowledge.service.spec.ts`
- `apps/api/src/knowledge/knowledge.integration.spec.ts`
- `apps/api/src/knowledge/knowledge.e2e.spec.ts`
- `apps/api/src/knowledge/dto/{create-article,update-article,reject-article,list-articles-query,article-response,paginated-articles-response,revision-response}.dto.ts`
- `apps/api/src/knowledge/repositories/{knowledge-article.repository.interface,prisma-knowledge-article.repository,knowledge-article-revision.repository.interface,prisma-knowledge-article-revision.repository}.ts`
- `docs/architecture/ADR-013-Knowledge-System.md`
- `docs/work-orders/WO-027-Knowledge-System.md` (this file)
- `docs/verification/WO-027-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `prisma/schema.prisma` — `KnowledgeArticle`, `KnowledgeArticleRevision` models; `KnowledgeCategory`, `KnowledgeArticleStatus` enums; one additive `NotificationCategory.KNOWLEDGE` enum value (ADR-012 extension).
- `apps/api/src/app.module.ts` — registers `KnowledgeModule`.
- `apps/api/src/main.ts` — Swagger `knowledge` tag.
- `docs/releases/version-1-readiness.md` — WO-027 marked complete, Knowledge System moved off the Remaining Backend Domains list, scores recomputed, next WO recommendation updated.

## Database Changes

New migration `add_knowledge_system`: `KnowledgeArticle` table (verification-workflow fields, sequence-numbered `articleRef`, `version` counter), `KnowledgeArticleRevision` table (real FK to `KnowledgeArticle`, `@@unique([articleId, versionNumber])`), two new enums (`KnowledgeCategory`, `KnowledgeArticleStatus`), and one additive value (`KNOWLEDGE`) on the existing `NotificationCategory` enum. No changes to any existing table's columns.

## API Changes

New: `POST/GET /knowledge/articles`, `GET /knowledge/articles/by-ref/:ref`, `GET /knowledge/articles/:id`, `GET /knowledge/articles/:id/revisions`, `PATCH/DELETE /knowledge/articles/:id`, `POST /knowledge/articles/:id/{submit-for-review,verify,reject,archive}`.

## Security Requirements

- All mutating endpoints require `JwtAuthGuard`; creation and moderation additionally require `RolesGuard` (`CREATOR_ROLES`/`MODERATOR_ROLES`, matching Resources' precedent exactly).
- Article management (update/delete/submit-for-review/archive) requires the caller to be the article's `authorId`, or hold `STEWARD`/`PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` — authorship is always resolved server-side, never trusted from the request body.
- `verify`/`reject` are `STEWARD`/`PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR`-only, matching the Resources/Opportunities/Organizations moderation precedent.
- Author notification on verify/reject uses the recipient's real `authorId` — never trusted from the request body — and is idempotent (dedupeKey) against retried verify/reject calls.
- Default listing excludes unverified content from general discovery (PA-013 "publish unverified information as authoritative" boundary); direct-ID/ref access remains available to authors and reviewers.

## Testing Requirements

- Unit: `KnowledgeService.spec.ts` (18 tests) — every authorization branch (author/non-author/Administrator), the full verification-workflow state machine, revision-creation-vs-not branching (substantive vs. non-substantive edits), and both notification call sites (verify/reject).
- Integration: `knowledge.integration.spec.ts` (4 tests) — real PostgreSQL, no mocks, verifying the unique `articleRef` constraint, case-insensitive full-text search, tag-array containment, and the `[articleId, versionNumber]` unique constraint on revisions.
- End-to-end: `knowledge.e2e.spec.ts` (18 tests) — full HTTP lifecycle via Supertest against a booted application: creation role-gating, default VERIFIED-only listing with direct-ID/ref access to unverified content, revision-history creation/non-creation on substantive/non-substantive edits, the full submit → verify (with real author notification) and submit → reject (with real author notification, reason included) workflows, re-rejection conflict handling, archival, and soft-delete authorization. The `author` persona is a real registered user via `/auth/register` (required — `Notification.recipientId` carries a real FK, per ADR-012), since this spec verifies real notifications are delivered; moderator personas remain fully synthetic self-minted tokens, matching the WO-020 Resources e2e precedent (`KnowledgeArticle.authorId` itself is a loose pointer with no FK).

## Acceptance Criteria

- [x] An unauthenticated caller cannot create, update, or manage an article (401).
- [x] A caller without a creator role cannot create an article (403).
- [x] A non-author, non-privileged caller cannot update, delete, submit-for-review, or archive another author's article (403).
- [x] Only `STEWARD`/`PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` may verify or reject (403 otherwise).
- [x] `GET /knowledge/articles` defaults to `VERIFIED`-only; `DRAFT`/`PENDING_REVIEW` articles are excluded from the default listing but directly fetchable by id/ref.
- [x] A non-substantive edit (tags/sourceUrl only) creates no revision and does not increment `version`.
- [x] A substantive edit (title/summary/content/category) creates exactly one revision snapshotting the pre-edit state and increments `version`.
- [x] `GET /knowledge/articles/:id/revisions` returns the full, newest-first revision history.
- [x] Verifying an article notifies its author via the Communication System (`category: KNOWLEDGE`, `type: knowledge.article.verified`), visible via `GET /communications/notifications`.
- [x] Rejecting an article notifies its author with the rejection reason (`type: knowledge.article.rejected`).
- [x] Re-rejecting an already-`REJECTED` article returns 409.
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest` (full monorepo suite), `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification via curl confirms the full create → submit → verify → notify → default-listing → substantive-edit-creates-revision workflow end-to-end against a running compiled instance.

## Definition of Done

Met — see `docs/verification/WO-027-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- Revisions snapshot only title/summary/content/category — changes to tags or sourceUrl alone leave no historical record (ADR-013 Decision 2, deliberate scope decision).
- No search relevance ranking or scoring, unlike Resources' `confidenceScore`/`freshnessScore` (ADR-013 Risks — not requested by PA-013).
- No revision rollback endpoint — restoring a prior version is a manual `PATCH` today.
- `NotificationCategory.KNOWLEDGE` has exactly one producer (this domain) so far — expected for a newly-shipped domain, mirrors `ANNOUNCEMENT`'s state when WO-026 shipped.
- AI Intelligence Engine and Academy do not yet consume Knowledge articles (PA-013 Outputs: "AI knowledge context," "educational content") — both domains remain unbuilt.

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
