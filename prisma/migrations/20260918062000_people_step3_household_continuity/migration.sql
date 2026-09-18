-- PEOPLE Step 3 — Household & Relationship Continuity
-- Structural continuity only. Household membership/relationship/dependency
-- records do not grant access to another person's conversations, documents,
-- connected accounts, or Personal Responsibilities.

CREATE TYPE "HouseholdStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "HouseholdMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'ENDED');
CREATE TYPE "HouseholdRelationshipType" AS ENUM (
  'SPOUSE_OR_PARTNER',
  'PARENT_OR_GUARDIAN',
  'CHILD_OR_DEPENDENT',
  'CAREGIVER',
  'CARE_RECIPIENT',
  'SIBLING',
  'RELATIVE',
  'ROOMMATE',
  'OTHER'
);
CREATE TYPE "HouseholdRelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'ENDED');
CREATE TYPE "HouseholdDependencyKind" AS ENUM (
  'FINANCIAL',
  'CARE',
  'HOUSING',
  'TRANSPORTATION',
  'ADMINISTRATIVE',
  'HEALTHCARE',
  'OTHER'
);
CREATE TYPE "HouseholdDependencyStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'ENDED');
CREATE TYPE "HouseholdResponsibilityShareStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'ENDED');

CREATE TABLE "Household" (
  "id" UUID NOT NULL,
  "label" TEXT,
  "status" "HouseholdStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Household_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Household_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "HouseholdMembership" (
  "id" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "HouseholdMembershipStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" UUID,
  "joinedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdMembership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdMembership_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdMembership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HouseholdMembership_userId_status_idx" ON "HouseholdMembership"("userId", "status");
CREATE INDEX "HouseholdMembership_householdId_status_idx" ON "HouseholdMembership"("householdId", "status");
CREATE UNIQUE INDEX "HouseholdMembership_current_unique"
  ON "HouseholdMembership"("householdId", "userId")
  WHERE "status" IN ('PENDING', 'ACTIVE');

CREATE TABLE "HouseholdRelationship" (
  "id" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "subjectUserId" UUID NOT NULL,
  "relatedUserId" UUID NOT NULL,
  "type" "HouseholdRelationshipType" NOT NULL,
  "status" "HouseholdRelationshipStatus" NOT NULL DEFAULT 'PENDING',
  "proposedByUserId" UUID NOT NULL,
  "confirmedByUserId" UUID,
  "confirmedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdRelationship_distinct_members_check" CHECK ("subjectUserId" <> "relatedUserId"),
  CONSTRAINT "HouseholdRelationship_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdRelationship_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdRelationship_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdRelationship_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdRelationship_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HouseholdRelationship_householdId_status_idx" ON "HouseholdRelationship"("householdId", "status");
CREATE INDEX "HouseholdRelationship_subjectUserId_idx" ON "HouseholdRelationship"("subjectUserId");
CREATE INDEX "HouseholdRelationship_relatedUserId_idx" ON "HouseholdRelationship"("relatedUserId");
CREATE UNIQUE INDEX "HouseholdRelationship_current_pair_unique"
  ON "HouseholdRelationship"("householdId", LEAST("subjectUserId", "relatedUserId"), GREATEST("subjectUserId", "relatedUserId"))
  WHERE "status" IN ('PENDING', 'ACTIVE');

CREATE TABLE "HouseholdDependency" (
  "id" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "dependentUserId" UUID NOT NULL,
  "supporterUserId" UUID NOT NULL,
  "kind" "HouseholdDependencyKind" NOT NULL,
  "status" "HouseholdDependencyStatus" NOT NULL DEFAULT 'PENDING',
  "proposedByUserId" UUID NOT NULL,
  "confirmedByUserId" UUID,
  "confirmedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdDependency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdDependency_distinct_members_check" CHECK ("dependentUserId" <> "supporterUserId"),
  CONSTRAINT "HouseholdDependency_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdDependency_dependentUserId_fkey" FOREIGN KEY ("dependentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdDependency_supporterUserId_fkey" FOREIGN KEY ("supporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdDependency_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdDependency_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HouseholdDependency_householdId_status_idx" ON "HouseholdDependency"("householdId", "status");
CREATE INDEX "HouseholdDependency_dependentUserId_idx" ON "HouseholdDependency"("dependentUserId");
CREATE INDEX "HouseholdDependency_supporterUserId_idx" ON "HouseholdDependency"("supporterUserId");
CREATE UNIQUE INDEX "HouseholdDependency_current_unique"
  ON "HouseholdDependency"("householdId", "dependentUserId", "supporterUserId", "kind")
  WHERE "status" IN ('PENDING', 'ACTIVE');

CREATE TABLE "HouseholdResponsibilityParticipant" (
  "id" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "responsibilityId" UUID NOT NULL,
  "participantUserId" UUID NOT NULL,
  "status" "HouseholdResponsibilityShareStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" UUID NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdResponsibilityParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdResponsibilityParticipant_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdResponsibilityParticipant_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "Responsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdResponsibilityParticipant_participantUserId_fkey" FOREIGN KEY ("participantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdResponsibilityParticipant_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "HouseholdResponsibilityParticipant_householdId_status_idx" ON "HouseholdResponsibilityParticipant"("householdId", "status");
CREATE INDEX "HouseholdResponsibilityParticipant_participantUserId_status_idx" ON "HouseholdResponsibilityParticipant"("participantUserId", "status");
CREATE UNIQUE INDEX "HouseholdResponsibilityParticipant_current_unique"
  ON "HouseholdResponsibilityParticipant"("responsibilityId", "participantUserId")
  WHERE "status" IN ('PENDING', 'ACTIVE');

CREATE TABLE "HouseholdEvent" (
  "id" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "actorUserId" UUID,
  "eventType" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" UUID NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HouseholdEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdEvent_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HouseholdEvent_householdId_occurredAt_idx" ON "HouseholdEvent"("householdId", "occurredAt");
CREATE INDEX "HouseholdEvent_actorUserId_idx" ON "HouseholdEvent"("actorUserId");
