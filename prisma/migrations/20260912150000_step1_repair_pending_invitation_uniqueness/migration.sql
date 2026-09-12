-- Step 1 repair #5 — DB-enforced pending-invitation uniqueness.
--
-- The application-level "look up a pending invitation for this org+email,
-- then create one if none exists" check is inherently raceable: two
-- concurrent invite requests can both pass the lookup before either
-- commits its insert, producing two PENDING invitations for the same
-- person. A partial unique index closes this at the database boundary —
-- Postgres itself now refuses the second concurrent insert — while still
-- allowing a person to be re-invited after their earlier invitation was
-- accepted, declined, revoked, or expired (those rows are excluded by the
-- WHERE clause, so they never conflict with a new PENDING one).
--
-- Case-insensitive on the recipient email (lower(...)), matching the
-- case-insensitive matching already used everywhere else in the
-- invitation lifecycle (repository lookups, accept()'s address check).
--
-- This constraint is intentionally expressed only here, not in
-- schema.prisma's DSL — Prisma has no `@@unique` syntax for a partial
-- (WHERE-scoped) or expression index. This mirrors the existing
-- hand-written CHECK constraints on BusinessProfile from the PF-004
-- migration, which are DB-only in exactly the same way.
CREATE UNIQUE INDEX "OrganizationInvitation_org_pending_email_unique"
ON "OrganizationInvitation" ("organizationId", lower("invitedEmail"))
WHERE "status" = 'PENDING';
