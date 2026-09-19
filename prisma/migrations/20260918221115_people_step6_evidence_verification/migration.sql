-- CreateEnum
CREATE TYPE "EvidenceRequirementStatus" AS ENUM ('OPEN', 'SATISFIED', 'WAIVER_REQUESTED', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EvidenceSufficiencyStatus" AS ENUM ('MISSING', 'PRESENT_UNVERIFIED', 'INSUFFICIENT', 'ADEQUATE');

-- CreateEnum
CREATE TYPE "EvidenceOrigin" AS ENUM ('MEMBER_PROVIDED', 'STEWARD_PROVIDED', 'SYSTEM_PRODUCED', 'EXTERNAL_SOURCED');

-- CreateEnum
CREATE TYPE "EvidenceItemStatus" AS ENUM ('SUBMITTED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EvidenceVerificationResult" AS ENUM ('VERIFIED', 'REJECTED', 'FLAGGED_FOR_REVIEW');

-- CreateEnum
CREATE TYPE "EvidenceVerificationMethod" AS ENUM ('HUMAN_STEWARD_REVIEW', 'PLATFORM_ADMIN_REVIEW', 'SYSTEM_RECORD_MATCH', 'EXTERNAL_ATTESTATION');

-- CreateTable
CREATE TABLE "EvidenceRequirement" (
    "id" UUID NOT NULL,
    "responsibilityId" UUID NOT NULL,
    "subjectUserId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredValidityDays" INTEGER,
    "status" "EvidenceRequirementStatus" NOT NULL DEFAULT 'OPEN',
    "currentSufficiency" "EvidenceSufficiencyStatus" NOT NULL DEFAULT 'MISSING',
    "createdByUserId" UUID NOT NULL,
    "waivedByUserId" UUID,
    "waivedReason" TEXT,
    "waivedAt" TIMESTAMP(3),
    "policyVersion" TEXT NOT NULL DEFAULT 'people-step6-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "documentId" UUID,
    "externalSourceRef" TEXT,
    "externalSourceDescription" TEXT,
    "origin" "EvidenceOrigin" NOT NULL,
    "providedByUserId" UUID NOT NULL,
    "providedByActorClass" "ResponsibilityActorClass" NOT NULL,
    "status" "EvidenceItemStatus" NOT NULL DEFAULT 'SUBMITTED',
    "supersedesItemId" UUID,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "integrityHash" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceVerification" (
    "id" UUID NOT NULL,
    "evidenceItemId" UUID NOT NULL,
    "result" "EvidenceVerificationResult" NOT NULL,
    "method" "EvidenceVerificationMethod" NOT NULL,
    "performedByUserId" UUID NOT NULL,
    "actorClass" "ResponsibilityActorClass" NOT NULL,
    "authorityBasis" TEXT NOT NULL,
    "reason" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceRequirement_responsibilityId_status_idx" ON "EvidenceRequirement"("responsibilityId", "status");

-- CreateIndex
CREATE INDEX "EvidenceRequirement_subjectUserId_status_idx" ON "EvidenceRequirement"("subjectUserId", "status");

-- CreateIndex
CREATE INDEX "EvidenceRequirement_currentSufficiency_idx" ON "EvidenceRequirement"("currentSufficiency");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceItem_supersedesItemId_key" ON "EvidenceItem"("supersedesItemId");

-- CreateIndex
CREATE INDEX "EvidenceItem_requirementId_status_idx" ON "EvidenceItem"("requirementId", "status");

-- CreateIndex
CREATE INDEX "EvidenceItem_documentId_idx" ON "EvidenceItem"("documentId");

-- CreateIndex
CREATE INDEX "EvidenceItem_validUntil_idx" ON "EvidenceItem"("validUntil");

-- CreateIndex
CREATE INDEX "EvidenceVerification_evidenceItemId_performedAt_idx" ON "EvidenceVerification"("evidenceItemId", "performedAt");

-- CreateIndex
CREATE INDEX "EvidenceVerification_performedByUserId_idx" ON "EvidenceVerification"("performedByUserId");

-- CreateIndex
CREATE INDEX "EvidenceVerification_result_idx" ON "EvidenceVerification"("result");

-- AddForeignKey
ALTER TABLE "EvidenceRequirement" ADD CONSTRAINT "EvidenceRequirement_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "Responsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRequirement" ADD CONSTRAINT "EvidenceRequirement_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "EvidenceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_supersedesItemId_fkey" FOREIGN KEY ("supersedesItemId") REFERENCES "EvidenceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceVerification" ADD CONSTRAINT "EvidenceVerification_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: at most one SUBMITTED ("current") EvidenceItem per
-- requirement. Prisma's schema language cannot express a WHERE-qualified
-- unique index, so this is hand-authored here rather than generated. It
-- turns a race between two concurrent "submit without supersession" calls
-- into a clean, catchable database constraint violation (see
-- EvidenceService.submitItem's application-level check, which this index
-- backs at the transaction-isolation level) instead of silently leaving two
-- ambiguous "current" items.
CREATE UNIQUE INDEX "EvidenceItem_requirementId_current_key" ON "EvidenceItem"("requirementId") WHERE "status" = 'SUBMITTED';
