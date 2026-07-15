# WO-024 — Business Portal

| Field | Value |
|---|---|
| Work Order Number | WO-024 |
| Title | Business Portal (PA-011) |
| Status | Complete |
| Priority | High (first of the remaining canonical backend domains; founder-directed backend-before-frontend sequencing) |
| Date | 2026-07-15 |

---

## Objective

Implement the Business Portal's foundational capabilities — verified organization profiles and representative membership — closing PA-011's complete absence from the backend (zero prior implementation) and fulfilling the migration ADR-006 §3 forward-declared when `Resource.organizationName` was modeled as a free-text stopgap.

## Scope

- A new `Organization` entity with a verification workflow identical in shape to Resources/Opportunities (`submit-for-review` → `verify`/`reject`, plus `archive`), reusing the existing shared `VerificationStatus` enum.
- A new `OrganizationMember` join entity (real FKs to `User` and `Organization`) with a two-role model (`ADMIN`/`MEMBER`) and a nested `/organizations/:organizationId/members` sub-resource for add/list/update-role/remove.
- Full CRUD + verification workflow for Organizations: create (any `STEWARD`/`ORGANIZATION_REPRESENTATIVE`/`BUSINESS_REPRESENTATIVE`/`PLATFORM_ADMINISTRATOR`, creator auto-added as first `ADMIN`), list/search (default VERIFIED-only), get by id/ref, update, soft-delete, verification-workflow actions.
- Last-remaining-`ADMIN` invariant on membership demotion/removal (mirrors WO-021's last-role guard).
- Full Swagger documentation (`organizations` tag).
- Unit and end-to-end automated tests.

## Out of Scope

- Linking `Organization` into `Resource`/`Opportunity` ownership (`organizationId` fields) — explicitly deferred (ADR-010 Decision 6); `organizationName`/`provider` remain free text.
- Recruitment tooling, partnership management, organization dashboards/analytics, member engagement tools (PA-011 components requiring further product scoping).
- Any change to `ResourcesModule`/`OpportunitiesModule`.

## Dependencies

- WO-023 (Email Delivery Integration) — complete, merged; no functional dependency, immediately preceding Work Order in sequence.
- ADR-006 (Resource Directory) — forward-declared this exact migration path.
- WO-021 (Administration & Operations) — supplies the last-remaining-role invariant pattern this WO reuses at the organization-membership level.

## Source Documents

- PA-011 — Business Portal Architecture
- PA-018 — Permissions & Access Architecture
- ADR-003 — User Module (layering pattern)
- ADR-006 — Resource Directory (organization-ownership stopgap and forward-declared migration)

## Deliverables

- ADR-010 — Business Portal
- `apps/api/src/organizations/**` (module, controllers, services, DTOs, repositories, unit + e2e tests)
- Prisma migration `add_business_portal`
- `docs/verification/WO-024-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `prisma/migrations/20260715021454_add_business_portal/`
- `apps/api/src/organizations/organizations.module.ts`
- `apps/api/src/organizations/organizations.controller.ts`
- `apps/api/src/organizations/organizations.service.ts`
- `apps/api/src/organizations/organizations.service.spec.ts`
- `apps/api/src/organizations/organizations.e2e.spec.ts`
- `apps/api/src/organizations/dto/{create,update,list-organizations-query,reject,organization-response,paginated-organizations-response}.dto.ts`
- `apps/api/src/organizations/repositories/{organization.repository.interface,prisma-organization.repository}.ts`
- `apps/api/src/organizations/members/organization-members.controller.ts`
- `apps/api/src/organizations/members/organization-members.service.ts`
- `apps/api/src/organizations/members/organization-members.service.spec.ts`
- `apps/api/src/organizations/members/dto/{add-member,update-member,member-response}.dto.ts`
- `apps/api/src/organizations/members/repositories/{organization-member.repository.interface,prisma-organization-member.repository}.ts`
- `docs/architecture/ADR-010-Business-Portal.md`
- `docs/work-orders/WO-024-Business-Portal.md` (this file)
- `docs/verification/WO-024-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `prisma/schema.prisma` — `Organization`, `OrganizationMember` models; `OrganizationType`, `OrganizationStatus`, `OrganizationMemberRole` enums; `User.organizationMemberships` back-relation.
- `apps/api/src/app.module.ts` — registers `OrganizationsModule`.
- `apps/api/src/main.ts` — Swagger `organizations` tag.
- `docs/releases/version-1-readiness.md` — WO-024 marked complete, Business Portal moved off the Remaining Work Orders list, scores recomputed, next WO recommendation updated.

## Database Changes

New migration `add_business_portal`: `Organization` table (verification-workflow fields, sequence-numbered `organizationRef`), `OrganizationMember` table (real FKs to `User`/`Organization`, unique on `[organizationId, userId]`), three new enums. No changes to any existing table.

## API Changes

New: `POST/GET/PATCH/DELETE /organizations`, `GET /organizations/by-ref/:ref`, `POST /organizations/:id/{submit-for-review,verify,reject,archive}`, `POST/GET /organizations/:organizationId/members`, `PATCH/DELETE /organizations/:organizationId/members/:userId`.

## Security Requirements

- All mutating endpoints require `JwtAuthGuard`; creation additionally requires `RolesGuard` (`STEWARD`/`ORGANIZATION_REPRESENTATIVE`/`BUSINESS_REPRESENTATIVE`/`PLATFORM_ADMINISTRATOR`).
- Organization management (update/delete/submit-for-review/archive) requires the caller to be an `ADMIN` member of that specific organization, or hold `STEWARD`/`PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` — ownership is always resolved server-side via the `OrganizationMember` table, never trusted from the request body.
- `verify`/`reject` are `STEWARD`/`PLATFORM_ADMINISTRATOR`-only, matching the Resources/Opportunities moderation precedent.
- Membership management requires `ADMIN` authority (or platform moderator roles); self-removal is permitted without `ADMIN` authority.
- The last-remaining-`ADMIN` invariant prevents any organization from being left without a manager.
- Membership listing is restricted to organization members and platform moderators (not public), consistent with the platform's conservative-by-default authorization stance.

## Testing Requirements

- Unit: `OrganizationsService` and `OrganizationMembersService` — every authorization branch (`ADMIN`, non-`ADMIN` member, non-member, `STEWARD`/Admin override), every verification-workflow state-transition guard, and the last-remaining-`ADMIN` invariant for both demotion and removal.
- End-to-end: full HTTP lifecycle via Supertest against a booted application — creation role-gating, the full verification workflow (submit → verify / submit → reject), default VERIFIED-only listing, direct id/ref lookup, membership add/list/update-role/remove including the last-`ADMIN` guard and self-removal, and administrator override. Real registered users are used for personas that become `OrganizationMember` rows, since `OrganizationMember.userId` carries a real FK (mirrors the WO-022 `Goal.userId` finding).

## Acceptance Criteria

- [x] An unauthenticated caller cannot create, update, or manage an organization (401).
- [x] A caller without a creator role cannot create an organization (403).
- [x] The creator of an organization is automatically its first `ADMIN` member.
- [x] A non-member cannot update, delete, submit-for-review, or archive another organization's profile (403).
- [x] Only `STEWARD`/`PLATFORM_ADMINISTRATOR` may verify or reject (403 otherwise).
- [x] `GET /organizations` defaults to `VERIFIED`-only; `DRAFT`/`PENDING_REVIEW` organizations are excluded from the default listing but directly fetchable by id/ref.
- [x] An `ADMIN` member may add/list/update-role/remove other members; a plain `MEMBER` may list but not manage.
- [x] A member may remove themselves regardless of role, unless doing so would leave the organization with zero `ADMIN`s.
- [x] Demoting or removing the organization's last remaining `ADMIN` returns 409.
- [x] A `PLATFORM_ADMINISTRATOR` may manage/archive any organization regardless of membership.
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest`, `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification via curl confirms the full create → membership → delete workflow end-to-end against a running compiled instance.

## Definition of Done

Met — see `docs/verification/WO-024-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- No linkage yet between `Organization` and `Resource`/`Opportunity` — an organization cannot yet formally "publish under" its verified profile (ADR-010 Decision 6, explicitly deferred).
- Organization creation and first-`ADMIN`-membership creation are two non-transactional sequential writes, consistent with the rest of the codebase's precedent (ADR-010 Risks).
- No scoring/ranking mechanism for organization search (not requested by PA-011 for this slice).
- Recruitment tooling, partnership management, dashboards/analytics remain unbuilt (PA-011 components out of scope for this WO).

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
