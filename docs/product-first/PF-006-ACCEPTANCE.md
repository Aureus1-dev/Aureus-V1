# PF-006 Acceptance — Public Ward Conversation

Status: implementation complete; merge authorization pending.

Exact base: `3f0aa58db0124d5648c71be46a811993764f7917` (PF-005 merged to `main`).

## Product acceptance

- A published, verified business receives a tenant-specific `/ward/:slug` URL and `/embed/ward/:slug` surface.
- A visitor can open and use the Ward without an Aureus account, sign-in gate, member record, member memory, or member permissions.
- Guest continuity uses a random bearer secret held in tab-scoped browser storage; only its SHA-256 digest is stored, and the token and conversation expire automatically.
- Every conversation, message, citation, and provider request carries one tenant boundary. Composite foreign keys reject cross-tenant conversation and citation relationships at the database layer.
- Retrieval selects only current, reviewed, non-deleted `APPROVED` tenant knowledge. Grounded replies require valid source markers and return a visible attribution snapshot.
- Missing or unsupported knowledge fails closed to an honest unknown and an available public human-contact route. Provider outages also fail to a human route.
- The Ward has no tools and cannot book, buy, submit, promise, determine eligibility, or access internal/member data.
- Crisis language bypasses the provider and displays the existing 911/988 emergency-service boundary.
- Public routes have per-IP throttles, a 20-turn session ceiling, a 1,200-character input ceiling, a shared global/capability cost ledger, a per-tenant spend ceiling, and the platform emergency stop.
- Source text and visitor text are treated as untrusted quoted data. Unsafe legacy source/contact links are not exposed as clickable public URLs.
- The interface is mobile-first, keyboard usable, screen-reader labeled, and passes the focused automated accessibility check.
- Publication remains an explicit business-console action. Publishing requires a verified business, completed setup, and at least one current approved knowledge source; pausing removes the public surface.

## Verification record

- Focused API safety/service suites: 47 tests passed.
- Focused web transport/accessibility suites: 11 tests passed.
- Production build: API, shared package, and web passed; Next.js emitted both Ward routes.
- Prisma schema: formatted, generated, and validated locally.
- Type checking, lint, and Product Contract v1 validation passed. Lint retains one pre-existing unused `_model` warning in the voice client.
- The repository-wide Prettier command is not a release gate and currently reports 1,573 pre-existing files; PF-006 has no whitespace errors under `git diff --check`.
- Full PostgreSQL migration, API coverage suite, web suite, and both Docker builds: required GitHub Actions checks on the draft PR because this workspace has no PostgreSQL server or container runtime.
- Pre-existing external status: the PF-005 merge commit reports a Railway API deployment failure while its GitHub Actions checks passed. PF-006 does not deploy or alter that external service.

## Rollback

Pause each published Ward from the business console to remove public access without deleting tenant knowledge. If code rollback is required, revert the PF-006 commit; the additive tables and enum value may remain dormant until a separately reviewed database cleanup is authorized.

## Explicitly deferred

PF-006 does not collect a lead, transfer a conversation to a sales team, send messages, schedule callbacks, or perform consequential actions. Consented lead capture and human handoff belong to PF-007.
