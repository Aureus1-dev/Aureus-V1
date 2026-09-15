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
  CONSTRAINT "GuardianChildRelationship_not_self" CHECK ("guardianUserId" <> "childUserId"),
  CONSTRAINT "GuardianChildRelationship_active_requires_assent"
    CHECK ("status" <> 'ACTIVE' OR "childAssentedAt" IS NOT NULL),
  CONSTRAINT "GuardianChildRelationship_revoked_requires_timestamp"
    CHECK ("status" <> 'REVOKED' OR "revokedAt" IS NOT NULL)
);

CREATE TABLE "ResponsibilityWorkContract" (
  "id" UUID NOT NULL,
  "responsibilityId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "workForm" "GovernedWorkForm" NOT NULL,
  "sourceType" "GovernedWorkSourceType" NOT NULL,
  "sourceUserId" UUID,
  "stakeTypes" "GovernedWorkStakeType"[] NOT NULL,
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
  CONSTRAINT "ResponsibilityWorkContract_stake_required" CHECK (cardinality("stakeTypes") > 0),
  CONSTRAINT "ResponsibilityWorkContract_renegotiation_reason_required" CHECK (
    ("version" = 1 AND "changeReason" IS NULL)
    OR
    ("version" > 1 AND NULLIF(BTRIM("changeReason"), '') IS NOT NULL)
  )
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

-- These PC-001 schema models deliberately keep principal/provenance ids scalar
-- rather than adding reverse relation fields to the existing monolithic User and
-- Responsibility declarations. Database triggers enforce existence and lifecycle
-- guarantees without creating Prisma schema drift from undeclared FKs. The
-- referenced row is KEY SHARE locked so a concurrent delete cannot race an insert;
-- once the insert commits, the lifecycle trigger handles any subsequent delete.
CREATE FUNCTION enforce_guardian_child_relationship_users()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1 FROM "User" WHERE "id" = NEW."guardianUserId" FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'guardian user does not exist' USING ERRCODE = '23503';
  END IF;

  PERFORM 1 FROM "User" WHERE "id" = NEW."childUserId" FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'child user does not exist' USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GuardianChildRelationship_users_exist"
BEFORE INSERT OR UPDATE OF "guardianUserId", "childUserId"
ON "GuardianChildRelationship"
FOR EACH ROW EXECUTE FUNCTION enforce_guardian_child_relationship_users();

CREATE FUNCTION enforce_work_contract_responsibility()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1 FROM "Responsibility" WHERE "id" = NEW."responsibilityId" FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'responsibility does not exist' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ResponsibilityWorkContract_responsibility_exists"
BEFORE INSERT ON "ResponsibilityWorkContract"
FOR EACH ROW EXECUTE FUNCTION enforce_work_contract_responsibility();

-- Preserve privacy/lifecycle behavior even though the additive Prisma schema
-- intentionally does not declare reverse relations on the legacy root models.
CREATE FUNCTION cleanup_parent_child_relationships_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "GuardianChildRelationship"
  WHERE "guardianUserId" = OLD."id" OR "childUserId" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GuardianChildRelationship_user_lifecycle"
AFTER DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION cleanup_parent_child_relationships_on_user_delete();

CREATE FUNCTION cleanup_work_contracts_on_responsibility_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "ResponsibilityWorkContract" WHERE "responsibilityId" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ResponsibilityWorkContract_responsibility_lifecycle"
AFTER DELETE ON "Responsibility"
FOR EACH ROW EXECUTE FUNCTION cleanup_work_contracts_on_responsibility_delete();

-- Done Means and carry allocation are commitments, not editable form fields.
-- A material change must create a new version. DELETE remains available for
-- Responsibility/User lifecycle deletion so privacy erasure is not blocked.
CREATE FUNCTION prevent_responsibility_work_contract_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ResponsibilityWorkContract rows are immutable; create a new version';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ResponsibilityWorkContract_immutable"
BEFORE UPDATE ON "ResponsibilityWorkContract"
FOR EACH ROW EXECUTE FUNCTION prevent_responsibility_work_contract_update();
