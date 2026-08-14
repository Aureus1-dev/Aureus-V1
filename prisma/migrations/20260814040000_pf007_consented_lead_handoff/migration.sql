-- PF-007: explicit-consent lead capture, tenant-safe human assignment,
-- attributable Ward handoff, transparent signals, and bounded deletion.

CREATE TYPE "WardLeadContactMethod" AS ENUM ('EMAIL', 'PHONE', 'SMS');
CREATE TYPE "WardLeadDesiredTiming" AS ENUM (
  'AS_SOON_AS_POSSIBLE',
  'WITHIN_ONE_MONTH',
  'ONE_TO_THREE_MONTHS',
  'THREE_TO_SIX_MONTHS',
  'EXPLORING'
);
CREATE TYPE "WardLeadStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'CONTACTED', 'CLOSED', 'LOST');
CREATE TYPE "WardLeadEventType" AS ENUM ('SUBMITTED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGED');

CREATE TABLE "WardLead" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "displayName" TEXT NOT NULL,
  "contactMethod" "WardLeadContactMethod" NOT NULL,
  "contactValue" TEXT NOT NULL,
  "projectSummary" TEXT NOT NULL,
  "projectLocation" TEXT,
  "desiredTiming" "WardLeadDesiredTiming",
  "consentPurpose" TEXT NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "consentText" TEXT NOT NULL,
  "consentTextSha256" TEXT NOT NULL,
  "consentDataClasses" TEXT[] NOT NULL,
  "consentGrantedAt" TIMESTAMP(3) NOT NULL,
  "consentExpiresAt" TIMESTAMP(3) NOT NULL,
  "submissionFingerprint" TEXT NOT NULL,
  "qualificationSignals" JSONB NOT NULL,
  "assignedToId" UUID NOT NULL,
  "status" "WardLeadStatus" NOT NULL DEFAULT 'SUBMITTED',
  "acceptedAt" TIMESTAMP(3),
  "contactedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "outcomeReason" TEXT,
  "notificationAttemptedAt" TIMESTAMP(3),
  "assignmentNotifiedAt" TIMESTAMP(3),
  "lastStateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WardLead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WardLead_required_text_check" CHECK (
    char_length("displayName") BETWEEN 1 AND 120
    AND char_length("contactValue") BETWEEN 3 AND 320
    AND char_length("projectSummary") BETWEEN 10 AND 2000
    AND ("projectLocation" IS NULL OR char_length("projectLocation") BETWEEN 1 AND 200)
  ),
  CONSTRAINT "WardLead_consent_contract_check" CHECK (
    "consentPurpose" = 'lead_handoff'
    AND "consentVersion" = 'lead-handoff-v1'
    AND "consentDataClasses" = ARRAY['identity', 'contact', 'project', 'conversation']::TEXT[]
    AND "consentTextSha256" ~ '^[a-f0-9]{64}$'
    AND "submissionFingerprint" ~ '^[a-f0-9]{64}$'
    AND "consentExpiresAt" = "retentionExpiresAt"
    AND "retentionExpiresAt" > "consentGrantedAt"
  ),
  CONSTRAINT "WardLead_state_evidence_check" CHECK (
    (
      "status" = 'SUBMITTED'
      AND "acceptedAt" IS NULL AND "contactedAt" IS NULL AND "closedAt" IS NULL
      AND "outcomeReason" IS NULL
    ) OR (
      "status" = 'ACCEPTED'
      AND "acceptedAt" IS NOT NULL AND "contactedAt" IS NULL AND "closedAt" IS NULL
      AND "outcomeReason" IS NULL
    ) OR (
      "status" = 'CONTACTED'
      AND "acceptedAt" IS NOT NULL AND "contactedAt" IS NOT NULL AND "closedAt" IS NULL
      AND "outcomeReason" IS NULL
    ) OR (
      "status" IN ('CLOSED', 'LOST')
      AND "acceptedAt" IS NOT NULL AND "closedAt" IS NOT NULL
      AND char_length("outcomeReason") BETWEEN 3 AND 500
    )
  )
);

CREATE UNIQUE INDEX "WardLead_conversationId_key" ON "WardLead"("conversationId");
CREATE UNIQUE INDEX "WardLead_organizationId_id_key" ON "WardLead"("organizationId", "id");
CREATE UNIQUE INDEX "WardLead_organizationId_conversationId_key"
  ON "WardLead"("organizationId", "conversationId");
CREATE INDEX "WardLead_organizationId_status_submittedAt_idx"
  ON "WardLead"("organizationId", "status", "submittedAt");
CREATE INDEX "WardLead_organizationId_assignedToId_status_idx"
  ON "WardLead"("organizationId", "assignedToId", "status");
CREATE INDEX "WardLead_retentionExpiresAt_idx" ON "WardLead"("retentionExpiresAt");

ALTER TABLE "WardLead"
  ADD CONSTRAINT "WardLead_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WardLead"
  ADD CONSTRAINT "WardLead_conversation_fkey"
  FOREIGN KEY ("organizationId", "conversationId")
  REFERENCES "WardConversation"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- The assignee must be an actual member of this same tenant. Cross-tenant
-- assignment is rejected by PostgreSQL even if application code regresses.
ALTER TABLE "WardLead"
  ADD CONSTRAINT "WardLead_assignee_fkey"
  FOREIGN KEY ("organizationId", "assignedToId")
  REFERENCES "OrganizationMember"("organizationId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WardLeadEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "leadId" UUID NOT NULL,
  "type" "WardLeadEventType" NOT NULL,
  "actorId" UUID,
  "fromStatus" "WardLeadStatus",
  "toStatus" "WardLeadStatus",
  "reason" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WardLeadEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WardLeadEvent_shape_check" CHECK (
    ("type" = 'SUBMITTED' AND "actorId" IS NULL AND "fromStatus" IS NULL AND "toStatus" = 'SUBMITTED')
    OR ("type" IN ('ASSIGNED', 'REASSIGNED') AND "fromStatus" IS NULL AND "toStatus" IS NULL)
    OR ("type" = 'STATUS_CHANGED' AND "fromStatus" IS NOT NULL AND "toStatus" IS NOT NULL)
  ),
  CONSTRAINT "WardLeadEvent_reason_check" CHECK (
    "reason" IS NULL OR char_length("reason") BETWEEN 3 AND 500
  )
);

CREATE INDEX "WardLeadEvent_organizationId_leadId_occurredAt_idx"
  ON "WardLeadEvent"("organizationId", "leadId", "occurredAt");
CREATE INDEX "WardLeadEvent_actorId_idx" ON "WardLeadEvent"("actorId");

ALTER TABLE "WardLeadEvent"
  ADD CONSTRAINT "WardLeadEvent_lead_fkey"
  FOREIGN KEY ("organizationId", "leadId")
  REFERENCES "WardLead"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WardLeadEvent"
  ADD CONSTRAINT "WardLeadEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
