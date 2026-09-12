-- Step 1 — Business Identity & Boundary: invitation lifecycle + ownership
-- transfer audit trail.
--
-- Scoped to exactly this feature's additive changes. (Schema-diffing
-- against the full migration history also surfaces pre-existing,
-- unrelated drift — stale `id` column defaults and renamed composite
-- foreign-key constraints from earlier migrations — that predates this
-- work order and is intentionally left untouched here.)

-- CreateEnum
CREATE TYPE "OrganizationInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- AlterEnum
-- PostgreSQL cannot add multiple enum values and use them in the same
-- transaction; each ADD VALUE below is safe to run standalone and none is
-- referenced elsewhere in this migration.
ALTER TYPE "TenantAuditAction" ADD VALUE 'ORGANIZATION_CREATED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'MEMBER_INVITED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'INVITATION_ACCEPTED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'INVITATION_DECLINED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'INVITATION_REVOKED';
ALTER TYPE "TenantAuditAction" ADD VALUE 'OWNERSHIP_TRANSFERRED';

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "OrganizationInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" UUID,
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_status_idx" ON "OrganizationInvitation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_invitedEmail_status_idx" ON "OrganizationInvitation"("invitedEmail", "status");

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
