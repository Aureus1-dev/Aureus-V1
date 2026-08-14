-- PF-005: tenant-owned business knowledge workspace.

ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'KNOWLEDGE_CREATED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'KNOWLEDGE_UPDATED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'KNOWLEDGE_SUBMITTED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'KNOWLEDGE_APPROVED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'KNOWLEDGE_REJECTED';
ALTER TYPE "TenantAuditAction" ADD VALUE IF NOT EXISTS 'LIBRARY_CANDIDATE_CREATED';

CREATE TYPE "BusinessKnowledgeType" AS ENUM (
  'SERVICE',
  'FAQ',
  'POLICY',
  'PRICING_BOUNDARY',
  'GEOGRAPHY',
  'QUALIFICATION',
  'ESCALATION'
);

CREATE TYPE "BusinessKnowledgeStatus" AS ENUM (
  'DRAFT',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE "BusinessKnowledgeSourceKind" AS ENUM ('MANUAL', 'IMPORT');
CREATE TYPE "LibraryCandidateExportStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "BusinessKnowledgeRecord" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "knowledgeType" "BusinessKnowledgeType" NOT NULL,
  "status" "BusinessKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceKind" "BusinessKnowledgeSourceKind" NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceFileName" TEXT,
  "sourceMimeType" TEXT,
  "freshnessIntervalDays" INTEGER NOT NULL,
  "nextReviewAt" TIMESTAMP(3) NOT NULL,
  "accountableReviewerId" UUID NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdById" UUID NOT NULL,
  "lastUpdatedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "BusinessKnowledgeRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessKnowledgeRecord_title_check" CHECK (length("title") BETWEEN 3 AND 200),
  CONSTRAINT "BusinessKnowledgeRecord_summary_check" CHECK (length("summary") BETWEEN 1 AND 500),
  CONSTRAINT "BusinessKnowledgeRecord_content_check" CHECK (length("content") BETWEEN 10 AND 100000),
  CONSTRAINT "BusinessKnowledgeRecord_sourceReference_check" CHECK (length("sourceReference") BETWEEN 1 AND 500),
  CONSTRAINT "BusinessKnowledgeRecord_freshness_check" CHECK ("freshnessIntervalDays" BETWEEN 1 AND 3650),
  CONSTRAINT "BusinessKnowledgeRecord_import_shape_check" CHECK (
    ("sourceKind" = 'MANUAL' AND "sourceFileName" IS NULL AND "sourceMimeType" IS NULL)
    OR
    ("sourceKind" = 'IMPORT' AND length("sourceFileName") BETWEEN 1 AND 200
      AND "sourceMimeType" IN ('text/plain', 'text/markdown'))
  ),
  CONSTRAINT "BusinessKnowledgeRecord_review_state_check" CHECK (
    ("status" = 'DRAFT' AND "submittedAt" IS NULL AND "reviewedAt" IS NULL AND "rejectionReason" IS NULL)
    OR ("status" = 'UNDER_REVIEW' AND "submittedAt" IS NOT NULL AND "reviewedAt" IS NULL AND "rejectionReason" IS NULL)
    OR ("status" = 'APPROVED' AND "submittedAt" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "rejectionReason" IS NULL)
    OR ("status" = 'REJECTED' AND "submittedAt" IS NOT NULL AND "reviewedAt" IS NOT NULL AND length("rejectionReason") >= 3)
    OR ("status" = 'ARCHIVED')
  )
);

CREATE TABLE "LibraryCandidateExport" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "knowledgeRecordId" UUID NOT NULL,
  "status" "LibraryCandidateExportStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "payloadSha256" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "decisionReason" TEXT,

  CONSTRAINT "LibraryCandidateExport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LibraryCandidateExport_payload_shape_check" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "LibraryCandidateExport_payloadSha256_check" CHECK ("payloadSha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "LibraryCandidateExport_decision_check" CHECK (
    ("status" = 'PENDING' AND "decidedAt" IS NULL)
    OR ("status" IN ('ACCEPTED', 'REJECTED') AND "decidedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "BusinessKnowledgeRecord_organizationId_id_key"
  ON "BusinessKnowledgeRecord"("organizationId", "id");
CREATE INDEX "BusinessKnowledgeRecord_organizationId_status_idx"
  ON "BusinessKnowledgeRecord"("organizationId", "status");
CREATE INDEX "BusinessKnowledgeRecord_organizationId_knowledgeType_idx"
  ON "BusinessKnowledgeRecord"("organizationId", "knowledgeType");
CREATE INDEX "BusinessKnowledgeRecord_organizationId_nextReviewAt_idx"
  ON "BusinessKnowledgeRecord"("organizationId", "nextReviewAt");
CREATE INDEX "BusinessKnowledgeRecord_accountableReviewerId_idx"
  ON "BusinessKnowledgeRecord"("accountableReviewerId");

CREATE INDEX "LibraryCandidateExport_organizationId_status_idx"
  ON "LibraryCandidateExport"("organizationId", "status");
CREATE INDEX "LibraryCandidateExport_knowledgeRecordId_idx"
  ON "LibraryCandidateExport"("knowledgeRecordId");
CREATE UNIQUE INDEX "LibraryCandidateExport_one_pending_per_record_key"
  ON "LibraryCandidateExport"("organizationId", "knowledgeRecordId")
  WHERE "status" = 'PENDING';

ALTER TABLE "BusinessKnowledgeRecord"
  ADD CONSTRAINT "BusinessKnowledgeRecord_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryCandidateExport"
  ADD CONSTRAINT "LibraryCandidateExport_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryCandidateExport"
  ADD CONSTRAINT "LibraryCandidateExport_organizationId_knowledgeRecordId_fkey"
  FOREIGN KEY ("organizationId", "knowledgeRecordId")
  REFERENCES "BusinessKnowledgeRecord"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Candidate attribution and payload bytes are immutable after creation. A
-- later admission workflow may update only decision fields.
CREATE FUNCTION "protect_library_candidate_snapshot"()
RETURNS trigger AS $$
BEGIN
  IF NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
    OR NEW."knowledgeRecordId" IS DISTINCT FROM OLD."knowledgeRecordId"
    OR NEW."payload" IS DISTINCT FROM OLD."payload"
    OR NEW."payloadSha256" IS DISTINCT FROM OLD."payloadSha256"
    OR NEW."createdById" IS DISTINCT FROM OLD."createdById"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'Library candidate snapshot attribution and payload are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LibraryCandidateExport_immutable_snapshot"
BEFORE UPDATE ON "LibraryCandidateExport"
FOR EACH ROW EXECUTE FUNCTION "protect_library_candidate_snapshot"();
