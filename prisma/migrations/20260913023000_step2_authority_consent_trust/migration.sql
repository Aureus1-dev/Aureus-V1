-- Step 2 — Authority, Consent & Trust.
CREATE TYPE "AuthorityContextType" AS ENUM ('PERSONAL', 'BUSINESS_TENANT');
CREATE TYPE "AuthorityCapability" AS ENUM ('SEE', 'LISTEN', 'READ', 'WRITE', 'SHARE', 'ACT');
CREATE TYPE "AuthorityResourceClass" AS ENUM ('MICROPHONE', 'SCREEN', 'CONVERSATION', 'CONNECTED_ACCOUNT', 'CALENDAR', 'EMAIL', 'FILES', 'BUSINESS_DATA', 'OTHER');
CREATE TYPE "AuthorityRequestSource" AS ENUM ('USER', 'AUREUS', 'DERIVED_PATTERN');
CREATE TYPE "AuthorityRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');
CREATE TYPE "AuthorityGrantStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "AuthorityCapabilityStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "AuthorityEventType" AS ENUM ('REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_DENIED', 'GRANT_CREATED', 'GRANT_REVOKED', 'CAPABILITY_SUSPENDED', 'CAPABILITY_RESUMED');
CREATE TYPE "AuthorityDecisionResult" AS ENUM ('PERMIT', 'NEEDS_APPROVAL', 'DENY');

CREATE TABLE "AuthorityRequest" (
  "id" UUID NOT NULL,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "resourceClass" "AuthorityResourceClass" NOT NULL,
  "resourceRef" TEXT,
  "purpose" TEXT NOT NULL,
  "source" "AuthorityRequestSource" NOT NULL DEFAULT 'USER',
  "status" "AuthorityRequestStatus" NOT NULL DEFAULT 'PENDING',
  "policyVersion" TEXT NOT NULL DEFAULT 'step2-v1',
  "requestedByUserId" UUID,
  "approvedByUserId" UUID,
  "deniedByUserId" UUID,
  "expiresAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorityRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityRequest_context_check" CHECK (
    ("contextType" = 'PERSONAL' AND "organizationId" IS NULL AND "subjectUserId" IS NOT NULL)
    OR ("contextType" = 'BUSINESS_TENANT' AND "organizationId" IS NOT NULL)
  )
);

CREATE TABLE "AuthorityGrant" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "resourceClass" "AuthorityResourceClass" NOT NULL,
  "resourceRef" TEXT,
  "purpose" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "status" "AuthorityGrantStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorityGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityGrant_context_check" CHECK (
    ("contextType" = 'PERSONAL' AND "organizationId" IS NULL AND "subjectUserId" IS NOT NULL)
    OR ("contextType" = 'BUSINESS_TENANT' AND "organizationId" IS NOT NULL)
  )
);

CREATE TABLE "AuthorityCapabilityState" (
  "id" UUID NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "status" "AuthorityCapabilityStatus" NOT NULL DEFAULT 'ACTIVE',
  "suspendedReason" TEXT,
  "suspendedAt" TIMESTAMP(3),
  "suspendedByUserId" UUID,
  "resumedAt" TIMESTAMP(3),
  "resumedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorityCapabilityState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityCapabilityState_context_check" CHECK (
    ("contextType" = 'PERSONAL' AND "organizationId" IS NULL AND "subjectUserId" IS NOT NULL)
    OR ("contextType" = 'BUSINESS_TENANT' AND "organizationId" IS NOT NULL)
  )
);

CREATE TABLE "AuthorityEvent" (
  "id" UUID NOT NULL,
  "eventType" "AuthorityEventType" NOT NULL,
  "actorUserId" UUID,
  "requestId" UUID,
  "grantId" UUID,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability",
  "resourceClass" "AuthorityResourceClass",
  "resourceRef" TEXT,
  "reason" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthorityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthorityDecision" (
  "id" UUID NOT NULL,
  "actorUserId" UUID,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "resourceClass" "AuthorityResourceClass" NOT NULL,
  "resourceRef" TEXT,
  "result" "AuthorityDecisionResult" NOT NULL,
  "reason" TEXT NOT NULL,
  "grantId" UUID,
  "policyVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthorityDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthorityGrant_requestId_key" ON "AuthorityGrant"("requestId");
CREATE UNIQUE INDEX "AuthorityCapabilityState_scopeKey_capability_key" ON "AuthorityCapabilityState"("scopeKey", "capability");
CREATE INDEX "AuthorityRequest_subjectUserId_status_createdAt_idx" ON "AuthorityRequest"("subjectUserId", "status", "createdAt");
CREATE INDEX "AuthorityRequest_organizationId_status_createdAt_idx" ON "AuthorityRequest"("organizationId", "status", "createdAt");
CREATE INDEX "AuthorityRequest_capability_resourceClass_status_idx" ON "AuthorityRequest"("capability", "resourceClass", "status");
CREATE INDEX "AuthorityGrant_subjectUserId_status_capability_resourceClass_idx" ON "AuthorityGrant"("subjectUserId", "status", "capability", "resourceClass");
CREATE INDEX "AuthorityGrant_organizationId_status_capability_resourceClass_idx" ON "AuthorityGrant"("organizationId", "status", "capability", "resourceClass");
CREATE INDEX "AuthorityGrant_expiresAt_idx" ON "AuthorityGrant"("expiresAt");
CREATE INDEX "AuthorityCapabilityState_subjectUserId_status_idx" ON "AuthorityCapabilityState"("subjectUserId", "status");
CREATE INDEX "AuthorityCapabilityState_organizationId_status_idx" ON "AuthorityCapabilityState"("organizationId", "status");
CREATE INDEX "AuthorityEvent_subjectUserId_occurredAt_idx" ON "AuthorityEvent"("subjectUserId", "occurredAt");
CREATE INDEX "AuthorityEvent_organizationId_occurredAt_idx" ON "AuthorityEvent"("organizationId", "occurredAt");
CREATE INDEX "AuthorityEvent_requestId_idx" ON "AuthorityEvent"("requestId");
CREATE INDEX "AuthorityEvent_grantId_idx" ON "AuthorityEvent"("grantId");
CREATE INDEX "AuthorityDecision_subjectUserId_createdAt_idx" ON "AuthorityDecision"("subjectUserId", "createdAt");
CREATE INDEX "AuthorityDecision_organizationId_createdAt_idx" ON "AuthorityDecision"("organizationId", "createdAt");
CREATE INDEX "AuthorityDecision_result_createdAt_idx" ON "AuthorityDecision"("result", "createdAt");

ALTER TABLE "AuthorityRequest" ADD CONSTRAINT "AuthorityRequest_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityRequest" ADD CONSTRAINT "AuthorityRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AuthorityRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityCapabilityState" ADD CONSTRAINT "AuthorityCapabilityState_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityCapabilityState" ADD CONSTRAINT "AuthorityCapabilityState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
