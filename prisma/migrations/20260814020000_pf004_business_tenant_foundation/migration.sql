-- PF-004: Organization is the canonical business tenant boundary.

ALTER TYPE "OrganizationMemberRole" ADD VALUE IF NOT EXISTS 'OWNER' BEFORE 'ADMIN';
ALTER TYPE "OrganizationMemberRole" ADD VALUE IF NOT EXISTS 'MANAGER' AFTER 'ADMIN';
ALTER TYPE "OrganizationMemberRole" ADD VALUE IF NOT EXISTS 'OPERATOR' AFTER 'MANAGER';
ALTER TYPE "OrganizationMemberRole" ADD VALUE IF NOT EXISTS 'VIEWER' AFTER 'OPERATOR';

CREATE TYPE "BusinessPublicStatus" AS ENUM ('PRIVATE', 'PUBLISHED', 'PAUSED');
CREATE TYPE "TenantAuditAction" AS ENUM (
  'PROFILE_CREATED',
  'PROFILE_UPDATED',
  'ONBOARDING_COMPLETED',
  'MEMBER_ADDED',
  'MEMBER_ROLE_CHANGED',
  'MEMBER_REMOVED'
);

ALTER TABLE "Organization"
  ADD COLUMN "tenantVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "OrganizationMember"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OrganizationMember" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE "BusinessProfile" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "publicSlug" TEXT,
  "publicStatus" "BusinessPublicStatus" NOT NULL DEFAULT 'PRIVATE',
  "serviceArea" JSONB NOT NULL,
  "businessHours" JSONB NOT NULL,
  "contactRoutes" JSONB NOT NULL,
  "escalationTarget" JSONB,
  "onboardingStep" INTEGER NOT NULL DEFAULT 0,
  "onboardingCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessProfile_onboardingStep_check" CHECK ("onboardingStep" BETWEEN 0 AND 5),
  CONSTRAINT "BusinessProfile_publicSlug_check" CHECK (
    "publicSlug" IS NULL OR "publicSlug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  CONSTRAINT "BusinessProfile_serviceArea_shape_check" CHECK (jsonb_typeof("serviceArea") = 'object'),
  CONSTRAINT "BusinessProfile_businessHours_shape_check" CHECK (jsonb_typeof("businessHours") = 'object'),
  CONSTRAINT "BusinessProfile_contactRoutes_shape_check" CHECK (jsonb_typeof("contactRoutes") = 'array'),
  CONSTRAINT "BusinessProfile_escalationTarget_shape_check" CHECK (
    "escalationTarget" IS NULL OR jsonb_typeof("escalationTarget") = 'object'
  )
);

CREATE TABLE "TenantAuditEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "action" "TenantAuditAction" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "context" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantAuditEvent_resourceType_check" CHECK (length(trim("resourceType")) > 0),
  CONSTRAINT "TenantAuditEvent_context_shape_check" CHECK (jsonb_typeof("context") = 'object')
);

CREATE UNIQUE INDEX "BusinessProfile_organizationId_key" ON "BusinessProfile"("organizationId");
CREATE UNIQUE INDEX "BusinessProfile_publicSlug_key" ON "BusinessProfile"("publicSlug");
CREATE INDEX "OrganizationMember_organizationId_role_idx" ON "OrganizationMember"("organizationId", "role");
CREATE INDEX "TenantAuditEvent_organizationId_occurredAt_idx" ON "TenantAuditEvent"("organizationId", "occurredAt");
CREATE INDEX "TenantAuditEvent_organizationId_actorId_idx" ON "TenantAuditEvent"("organizationId", "actorId");

ALTER TABLE "BusinessProfile"
  ADD CONSTRAINT "BusinessProfile_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantAuditEvent"
  ADD CONSTRAINT "TenantAuditEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
