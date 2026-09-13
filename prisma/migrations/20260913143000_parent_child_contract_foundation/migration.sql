-- PC-001 — Parent + Child relationship authority and governed-work contract foundation.
-- Responsibility remains the canonical work root; this migration adds only the
-- relational authority and immutable contract envelope required by later slices.

CREATE TYPE "ParentChildRelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "GovernedWorkForm" AS ENUM ('PRACTICE');
CREATE TYPE "GovernedWorkSourceType" AS ENUM (
  'CHILD_CHOSEN',
  'PARENT_ASSIGNED',
  'EXTERNAL_OBLIGATION',
  'SHARED_HOUSEHOLD'
);
CREATE TYPE "GovernedWorkStakeType" AS ENUM (
  'AUTHORITATIVE_ASSIGNMENT',
  'EXPLICIT_COMMITMENT',
  'EXTERNAL_CLOCK',
  'DEPENDENT_PERSON',
  'RESOURCE_COMMITMENT',
  'IRREVERSIBLE_ACTION',
  'PREAGREED_SUCCESS_STANDARD'
);

CREATE TABLE "GuardianChildRelationship" (
  "id" UUID NOT NULL,
  "guardianUserId" UUID NOT NULL,
  "childUserId" UUID NOT NULL,
  "status" "ParentChildRelationshipStatus" NOT NULL DEFAULT 'PENDING',
  "guardianAttestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "childAssentedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuardianChildRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GuardianChildRelationship_not_self" CHECK ("guardianUserId" <> "childUserId")
);

CREATE TABLE "ResponsibilityWorkContract" (
  "id" UUID NOT NULL,
  "responsibilityId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "workForm" "GovernedWorkForm" NOT NULL,
  "sourceType" "GovernedWorkSourceType" NOT NULL,
  "sourceUserId" UUID,
  "stakeTypes" "GovernedWorkStakeType"[],
  "doneMeans" JSONB NOT NULL,
  "principalCarries" JSONB NOT NULL,
  "aureusCarries" JSONB NOT NULL,
  "togetherCarries" JSONB NOT NULL,
  "humanRequired" JSONB NOT NULL,
  "expectedEvidence" JSONB NOT NULL,
  "assistanceBoundary" JSONB NOT NULL,
  "verificationPolicyVersion" TEXT NOT NULL,
  "workTemplateKey" TEXT NOT NULL,
  "difficultyKey" TEXT,
  "createdByUserId" UUID NOT NULL,
  "changeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResponsibilityWorkContract_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResponsibilityWorkContract_version_positive" CHECK ("version" > 0),
  CONSTRAINT "ResponsibilityWorkContract_stake_required" CHECK (cardinality("stakeTypes") > 0)
);

CREATE INDEX "GuardianChildRelationship_guardianUserId_status_idx"
  ON "GuardianChildRelationship"("guardianUserId", "status");
CREATE INDEX "GuardianChildRelationship_childUserId_status_idx"
  ON "GuardianChildRelationship"("childUserId", "status");
CREATE INDEX "GuardianChildRelationship_guardianUserId_childUserId_createdAt_idx"
  ON "GuardianChildRelationship"("guardianUserId", "childUserId", "createdAt");

-- One live authority relationship per guardian/child pair. Revocation preserves
-- history while allowing a later fresh proposal rather than mutating old consent.
CREATE UNIQUE INDEX "GuardianChildRelationship_one_open_pair"
  ON "GuardianChildRelationship"("guardianUserId", "childUserId")
  WHERE "status" IN ('PENDING', 'ACTIVE');

CREATE UNIQUE INDEX "ResponsibilityWorkContract_responsibilityId_version_key"
  ON "ResponsibilityWorkContract"("responsibilityId", "version");
CREATE INDEX "ResponsibilityWorkContract_responsibilityId_createdAt_idx"
  ON "ResponsibilityWorkContract"("responsibilityId", "createdAt");
CREATE INDEX "ResponsibilityWorkContract_createdByUserId_idx"
  ON "ResponsibilityWorkContract"("createdByUserId");

ALTER TABLE "GuardianChildRelationship"
  ADD CONSTRAINT "GuardianChildRelationship_guardianUserId_fkey"
  FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuardianChildRelationship"
  ADD CONSTRAINT "GuardianChildRelationship_childUserId_fkey"
  FOREIGN KEY ("childUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResponsibilityWorkContract"
  ADD CONSTRAINT "ResponsibilityWorkContract_responsibilityId_fkey"
  FOREIGN KEY ("responsibilityId") REFERENCES "Responsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Done Means and carry allocation are commitments, not editable form fields.
-- A material change must create a new version. DELETE remains possible through
-- Responsibility/User lifecycle cascades so privacy deletion is not blocked.
CREATE FUNCTION prevent_responsibility_work_contract_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ResponsibilityWorkContract rows are immutable; create a new version';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ResponsibilityWorkContract_immutable"
BEFORE UPDATE ON "ResponsibilityWorkContract"
FOR EACH ROW EXECUTE FUNCTION prevent_responsibility_work_contract_update();
