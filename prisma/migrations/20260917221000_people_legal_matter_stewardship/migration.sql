-- PEOPLE-LEGAL-001: bounded Legal / Matter Stewardship truth layer.

CREATE TYPE "LegalMatterUrgency" AS ENUM ('ROUTINE', 'TIME_SENSITIVE', 'URGENT', 'EMERGENCY');
CREATE TYPE "LegalMatterSourceKind" AS ENUM ('OFFICIAL_PRIMARY', 'OFFICIAL_PROCEDURE', 'SECONDARY_EXPLANATORY', 'MEMBER_RECORD', 'OTHER');
CREATE TYPE "LegalMatterSourceVerification" AS ENUM ('MEMBER_REPORTED', 'IDENTITY_VERIFIED');
CREATE TYPE "LegalMatterProvenance" AS ENUM ('OBSERVED', 'REPORTED', 'INFERRED', 'SIMULATED');
CREATE TYPE "LegalMatterDeadlineStatus" AS ENUM ('REPORTED', 'VERIFIED', 'COMPLETED', 'REVIEW_REQUIRED');
CREATE TYPE "LegalMatterReviewStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "LegalMatterRetentionState" AS ENUM ('ACTIVE', 'REVIEW_REQUIRED', 'PRESERVED', 'ELIGIBLE_FOR_DELETION');
CREATE TYPE "LegalJurisdictionEnablementStatus" AS ENUM ('SAFE_MODE_ONLY', 'ENABLED', 'DISABLED');
CREATE TYPE "LegalActionType" AS ENUM ('ORGANIZE_RECORDS', 'RETRIEVE_OFFICIAL_SOURCE', 'TRACK_REPORTED_DEADLINE', 'PREPARE_QUESTIONS', 'FILE', 'SERVE', 'SIGN', 'CERTIFY', 'TESTIFY', 'SETTLE', 'PLEAD', 'APPEAL', 'WAIVE', 'REPRESENT');

CREATE TABLE "LegalMatter" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "responsibilityId" UUID NOT NULL,
  "statedNeedId" UUID NOT NULL,
  "matterType" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "forum" TEXT,
  "proceduralPosture" TEXT NOT NULL,
  "urgency" "LegalMatterUrgency" NOT NULL DEFAULT 'ROUTINE',
  "disclosureAcknowledgedAt" TIMESTAMP(3) NOT NULL,
  "assistanceMode" TEXT NOT NULL DEFAULT 'SAFE_MODE',
  "legalReviewRequired" BOOLEAN NOT NULL DEFAULT true,
  "retentionBasis" TEXT NOT NULL DEFAULT 'LEGAL_MATTER_V1_REVIEW_90_DAYS_AFTER_CLOSURE',
  "retentionState" "LegalMatterRetentionState" NOT NULL DEFAULT 'ACTIVE',
  "retentionReviewAt" TIMESTAMP(3),
  "legalHoldBasis" TEXT,
  "outcomeSummary" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalMatter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalMatterSource" (
  "id" UUID NOT NULL,
  "matterId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "kind" "LegalMatterSourceKind" NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "proposition" TEXT NOT NULL,
  "provenance" "LegalMatterProvenance" NOT NULL DEFAULT 'REPORTED',
  "verification" "LegalMatterSourceVerification" NOT NULL DEFAULT 'MEMBER_REPORTED',
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "verifiedByUserId" UUID,
  "verificationNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalMatterSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalMatterFact" (
  "id" UUID NOT NULL,
  "matterId" UUID NOT NULL,
  "statement" TEXT NOT NULL,
  "provenance" "LegalMatterProvenance" NOT NULL DEFAULT 'REPORTED',
  "sourceId" UUID,
  "observedAt" TIMESTAMP(3),
  "observedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalMatterFact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalMatterDeadline" (
  "id" UUID NOT NULL,
  "matterId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "timeZone" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "calculationBasis" TEXT,
  "sourceId" UUID,
  "status" "LegalMatterDeadlineStatus" NOT NULL DEFAULT 'REPORTED',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalMatterDeadline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalMatterReviewRequest" (
  "id" UUID NOT NULL,
  "matterId" UUID NOT NULL,
  "requestedByUserId" UUID NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" "LegalMatterReviewStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" UUID,
  CONSTRAINT "LegalMatterReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalMatterDocumentLink" (
  "id" UUID NOT NULL,
  "matterId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalMatterDocumentLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalJurisdictionPolicy" (
  "id" UUID NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "matterType" TEXT NOT NULL,
  "assistanceCategory" TEXT NOT NULL,
  "status" "LegalJurisdictionEnablementStatus" NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "effectiveAt" TIMESTAMP(3),
  "reviewedByUserId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalJurisdictionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalMatter_responsibilityId_key" ON "LegalMatter"("responsibilityId");
CREATE UNIQUE INDEX "LegalMatter_statedNeedId_key" ON "LegalMatter"("statedNeedId");
CREATE INDEX "LegalMatter_userId_updatedAt_idx" ON "LegalMatter"("userId", "updatedAt");
CREATE INDEX "LegalMatter_jurisdiction_matterType_idx" ON "LegalMatter"("jurisdiction", "matterType");
CREATE INDEX "LegalMatterSource_matterId_createdAt_idx" ON "LegalMatterSource"("matterId", "createdAt");
CREATE INDEX "LegalMatterSource_verification_checkedAt_idx" ON "LegalMatterSource"("verification", "checkedAt");
CREATE INDEX "LegalMatterFact_matterId_createdAt_idx" ON "LegalMatterFact"("matterId", "createdAt");
CREATE INDEX "LegalMatterFact_sourceId_idx" ON "LegalMatterFact"("sourceId");
CREATE INDEX "LegalMatterDeadline_matterId_dueAt_idx" ON "LegalMatterDeadline"("matterId", "dueAt");
CREATE INDEX "LegalMatterDeadline_sourceId_idx" ON "LegalMatterDeadline"("sourceId");
CREATE INDEX "LegalMatterReviewRequest_matterId_status_createdAt_idx" ON "LegalMatterReviewRequest"("matterId", "status", "createdAt");
CREATE UNIQUE INDEX "LegalMatterDocumentLink_matterId_documentId_key" ON "LegalMatterDocumentLink"("matterId", "documentId");
CREATE INDEX "LegalMatterDocumentLink_documentId_idx" ON "LegalMatterDocumentLink"("documentId");
CREATE UNIQUE INDEX "LegalJurisdictionPolicy_jurisdiction_matterType_assistanceCategory_key" ON "LegalJurisdictionPolicy"("jurisdiction", "matterType", "assistanceCategory");
CREATE INDEX "LegalJurisdictionPolicy_status_checkedAt_idx" ON "LegalJurisdictionPolicy"("status", "checkedAt");

ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "Responsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_statedNeedId_fkey" FOREIGN KEY ("statedNeedId") REFERENCES "StatedNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatterSource" ADD CONSTRAINT "LegalMatterSource_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatterFact" ADD CONSTRAINT "LegalMatterFact_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatterFact" ADD CONSTRAINT "LegalMatterFact_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LegalMatterSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalMatterDeadline" ADD CONSTRAINT "LegalMatterDeadline_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatterDeadline" ADD CONSTRAINT "LegalMatterDeadline_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LegalMatterSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalMatterReviewRequest" ADD CONSTRAINT "LegalMatterReviewRequest_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatterDocumentLink" ADD CONSTRAINT "LegalMatterDocumentLink_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatterDocumentLink" ADD CONSTRAINT "LegalMatterDocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
