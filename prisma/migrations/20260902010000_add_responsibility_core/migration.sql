-- OR-001 Responsibility Core
--
-- Adds the thin cross-domain Responsibility root and append-only event ledger.
-- This migration creates no autonomous action capability and no cross-context
-- transfer path. OR-001's public API is PERSONAL / GUIDANCE_ONLY only.

CREATE TYPE "ResponsibilityContextType" AS ENUM (
  'PERSONAL',
  'BUSINESS_TENANT',
  'BUSINESS_CUSTOMER_SHARED'
);

CREATE TYPE "ResponsibilityKind" AS ENUM (
  'OPPORTUNITY_DECISION'
);

CREATE TYPE "ResponsibilityStatus" AS ENUM (
  'ACTIVE',
  'WAITING_ON_AUREUS',
  'WAITING_ON_USER',
  'WAITING_ON_THIRD_PARTY',
  'BLOCKED',
  'COMPLETED',
  'RESPONSIBLY_EXHAUSTED',
  'CANCELLED'
);

CREATE TYPE "ResponsibilityAuthorityClass" AS ENUM (
  'GUIDANCE_ONLY'
);

CREATE TYPE "ResponsibilityPrivacyScope" AS ENUM (
  'PERSONAL_PRIVATE',
  'BUSINESS_PRIVATE',
  'SHARED_TRANSACTION'
);

CREATE TYPE "ResponsibilityEventType" AS ENUM (
  'ACCEPTED',
  'STATE_CHANGED',
  'USER_INPUT_REQUIRED',
  'EXTERNAL_WAIT_STARTED',
  'COMMITMENT_RECORDED',
  'ACTION_EVIDENCED',
  'COMPLETED',
  'RESPONSIBLY_EXHAUSTED',
  'CANCELLED'
);

CREATE TYPE "ResponsibilityActorClass" AS ENUM (
  'MEMBER',
  'AUREUS',
  'SYSTEM',
  'EXTERNAL'
);

CREATE TYPE "ResponsibilityEvidenceLevel" AS ENUM (
  'REPORTED',
  'VERIFIED'
);

CREATE TABLE "Responsibility" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "ResponsibilityKind" NOT NULL,
  "objective" TEXT NOT NULL,
  "status" "ResponsibilityStatus" NOT NULL DEFAULT 'ACTIVE',
  "contextType" "ResponsibilityContextType" NOT NULL,
  "principalUserId" UUID,
  "principalOrganizationId" UUID,
  "originConversationId" UUID,
  "originOpportunityId" UUID,
  "successCriteria" JSONB NOT NULL,
  "authorityClass" "ResponsibilityAuthorityClass" NOT NULL,
  "authorityPolicyVersion" TEXT NOT NULL,
  "privacyScope" "ResponsibilityPrivacyScope" NOT NULL,
  "privacyPolicyVersion" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "retentionExpiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Responsibility_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "Responsibility_objective_policy_check" CHECK (
    char_length("objective") BETWEEN 1 AND 2000
    AND char_length("authorityPolicyVersion") BETWEEN 1 AND 80
    AND char_length("privacyPolicyVersion") BETWEEN 1 AND 80
  ),

  CONSTRAINT "Responsibility_context_principal_check" CHECK (
    (
      "contextType" = 'PERSONAL'
      AND "principalUserId" IS NOT NULL
      AND "principalOrganizationId" IS NULL
      AND "privacyScope" = 'PERSONAL_PRIVATE'
    ) OR (
      "contextType" = 'BUSINESS_TENANT'
      AND "principalUserId" IS NULL
      AND "principalOrganizationId" IS NOT NULL
      AND "privacyScope" = 'BUSINESS_PRIVATE'
    ) OR (
      "contextType" = 'BUSINESS_CUSTOMER_SHARED'
      AND "principalUserId" IS NOT NULL
      AND "principalOrganizationId" IS NOT NULL
      AND "privacyScope" = 'SHARED_TRANSACTION'
    )
  ),

  CONSTRAINT "Responsibility_opportunity_decision_origin_check" CHECK (
    "kind" <> 'OPPORTUNITY_DECISION'
    OR (
      "contextType" = 'PERSONAL'
      AND "originConversationId" IS NOT NULL
      AND "originOpportunityId" IS NOT NULL
      AND "authorityClass" = 'GUIDANCE_ONLY'
    )
  ),

  CONSTRAINT "Responsibility_completion_timestamp_check" CHECK (
    ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL)
    OR ("status" <> 'COMPLETED' AND "completedAt" IS NULL)
  ),

  CONSTRAINT "Responsibility_retention_check" CHECK (
    "retentionExpiresAt" IS NULL OR "retentionExpiresAt" > "createdAt"
  )
);

CREATE INDEX "Responsibility_contextType_principalUserId_status_updatedAt_idx"
  ON "Responsibility"("contextType", "principalUserId", "status", "updatedAt");

CREATE INDEX "Responsibility_principalOrganizationId_status_updatedAt_idx"
  ON "Responsibility"("principalOrganizationId", "status", "updatedAt");

CREATE INDEX "Responsibility_originConversationId_idx"
  ON "Responsibility"("originConversationId");

CREATE INDEX "Responsibility_originOpportunityId_idx"
  ON "Responsibility"("originOpportunityId");

-- Race-safe duplicate protection for the first OR-001 proof. A completed,
-- cancelled, or responsibly exhausted decision may later be represented by a
-- new Responsibility if the product explicitly chooses to reopen the work.
CREATE UNIQUE INDEX "Responsibility_open_opportunity_decision_key"
  ON "Responsibility"("principalUserId", "originOpportunityId")
  WHERE "contextType" = 'PERSONAL'
    AND "kind" = 'OPPORTUNITY_DECISION'
    AND "principalUserId" IS NOT NULL
    AND "originOpportunityId" IS NOT NULL
    AND "status" NOT IN ('COMPLETED', 'RESPONSIBLY_EXHAUSTED', 'CANCELLED');

ALTER TABLE "Responsibility"
  ADD CONSTRAINT "Responsibility_principalUserId_fkey"
  FOREIGN KEY ("principalUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Responsibility"
  ADD CONSTRAINT "Responsibility_principalOrganizationId_fkey"
  FOREIGN KEY ("principalOrganizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ResponsibilityEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "responsibilityId" UUID NOT NULL,
  "type" "ResponsibilityEventType" NOT NULL,
  "actorClass" "ResponsibilityActorClass" NOT NULL,
  "actorUserId" UUID,
  "fromStatus" "ResponsibilityStatus",
  "toStatus" "ResponsibilityStatus",
  "sourceSystem" TEXT,
  "sourceRecordType" TEXT,
  "sourceRecordId" TEXT,
  "sourceState" TEXT,
  "evidenceLevel" "ResponsibilityEvidenceLevel",
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResponsibilityEvent_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "ResponsibilityEvent_source_lengths_check" CHECK (
    ("sourceSystem" IS NULL OR char_length("sourceSystem") BETWEEN 1 AND 80)
    AND ("sourceRecordType" IS NULL OR char_length("sourceRecordType") BETWEEN 1 AND 80)
    AND ("sourceRecordId" IS NULL OR char_length("sourceRecordId") BETWEEN 1 AND 200)
    AND ("sourceState" IS NULL OR char_length("sourceState") BETWEEN 1 AND 120)
  ),

  CONSTRAINT "ResponsibilityEvent_evidence_shape_check" CHECK (
    (
      "type" IN ('ACTION_EVIDENCED', 'COMPLETED')
      AND "sourceSystem" IS NOT NULL
      AND "sourceRecordType" IS NOT NULL
      AND "sourceRecordId" IS NOT NULL
      AND "sourceState" IS NOT NULL
      AND "evidenceLevel" IS NOT NULL
    ) OR (
      "type" NOT IN ('ACTION_EVIDENCED', 'COMPLETED')
      AND "sourceSystem" IS NULL
      AND "sourceRecordType" IS NULL
      AND "sourceRecordId" IS NULL
      AND "sourceState" IS NULL
      AND "evidenceLevel" IS NULL
    )
  ),

  CONSTRAINT "ResponsibilityEvent_or001_shape_check" CHECK (
    (
      "type" = 'ACCEPTED'
      AND "actorClass" = 'MEMBER'
      AND "actorUserId" IS NOT NULL
      AND "fromStatus" IS NULL
      AND "toStatus" = 'ACTIVE'
    ) OR (
      "type" = 'COMMITMENT_RECORDED'
      AND "actorClass" = 'AUREUS'
      AND "actorUserId" IS NULL
      AND "fromStatus" IS NULL
      AND "toStatus" IS NULL
    ) OR (
      "type" = 'USER_INPUT_REQUIRED'
      AND "actorClass" = 'AUREUS'
      AND "actorUserId" IS NULL
      AND "fromStatus" = 'ACTIVE'
      AND "toStatus" = 'WAITING_ON_USER'
    ) OR (
      "type" = 'ACTION_EVIDENCED'
      AND "actorClass" = 'SYSTEM'
      AND "actorUserId" IS NULL
      AND "fromStatus" IS NULL
      AND "toStatus" IS NULL
    ) OR (
      "type" = 'COMPLETED'
      AND "actorClass" = 'SYSTEM'
      AND "actorUserId" IS NULL
      AND "fromStatus" IN ('ACTIVE', 'WAITING_ON_USER')
      AND "toStatus" = 'COMPLETED'
    ) OR (
      "type" NOT IN (
        'ACCEPTED',
        'COMMITMENT_RECORDED',
        'USER_INPUT_REQUIRED',
        'ACTION_EVIDENCED',
        'COMPLETED'
      )
    )
  )
);

CREATE INDEX "ResponsibilityEvent_responsibilityId_occurredAt_idx"
  ON "ResponsibilityEvent"("responsibilityId", "occurredAt");

CREATE INDEX "ResponsibilityEvent_actorUserId_idx"
  ON "ResponsibilityEvent"("actorUserId");

CREATE INDEX "ResponsibilityEvent_sourceRecordType_sourceRecordId_idx"
  ON "ResponsibilityEvent"("sourceRecordType", "sourceRecordId");

ALTER TABLE "ResponsibilityEvent"
  ADD CONSTRAINT "ResponsibilityEvent_responsibilityId_fkey"
  FOREIGN KEY ("responsibilityId") REFERENCES "Responsibility"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- actorUserId is immutable provenance rather than a live User FK. This avoids
-- rewriting accepted-event history during User lifecycle deletion; the owning
-- Responsibility still cascades through principalUserId.
