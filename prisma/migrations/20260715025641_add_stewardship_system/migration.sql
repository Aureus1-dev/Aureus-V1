-- CreateEnum
CREATE TYPE "StewardshipRelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "StewardshipRelationshipOrigin" AS ENUM ('MEMBER_REQUEST', 'AI_RECOMMENDATION', 'ORGANIZATION_ASSIGNMENT', 'ADMIN_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "StewardshipEndReason" AS ENUM ('MEMBER_REQUEST', 'STEWARD_RESIGNATION', 'ORGANIZATION_REASSIGNMENT', 'ADMIN_REASSIGNMENT', 'STEWARD_INACTIVITY');

-- CreateEnum
CREATE TYPE "StewardshipNoteVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "StewardshipTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StewardshipRecommendationType" AS ENUM ('OPPORTUNITY', 'RESOURCE');

-- CreateEnum
CREATE TYPE "StewardshipEscalationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "StewardshipEscalationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "StewardCapacity" (
    "id" UUID NOT NULL,
    "stewardId" UUID NOT NULL,
    "maxActiveMembers" INTEGER NOT NULL DEFAULT 25,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StewardCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StewardshipRelationship" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "stewardId" UUID,
    "status" "StewardshipRelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "origin" "StewardshipRelationshipOrigin" NOT NULL,
    "requestedById" UUID,
    "assignedById" UUID,
    "assignedByOrganizationId" UUID,
    "recommendedById" UUID,
    "endReason" "StewardshipEndReason",
    "endedById" UUID,
    "endedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StewardshipRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StewardshipNote" (
    "id" UUID NOT NULL,
    "relationshipId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" "StewardshipNoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StewardshipNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StewardshipTask" (
    "id" UUID NOT NULL,
    "relationshipId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StewardshipTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StewardshipTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StewardshipRecommendation" (
    "id" UUID NOT NULL,
    "relationshipId" UUID NOT NULL,
    "type" "StewardshipRecommendationType" NOT NULL,
    "opportunityId" UUID,
    "resourceId" UUID,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StewardshipRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StewardshipEscalation" (
    "id" UUID NOT NULL,
    "relationshipId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "StewardshipEscalationSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "StewardshipEscalationStatus" NOT NULL DEFAULT 'OPEN',
    "raisedById" UUID NOT NULL,
    "resolvedById" UUID,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "StewardshipEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StewardCapacity_stewardId_key" ON "StewardCapacity"("stewardId");

-- CreateIndex
CREATE INDEX "StewardshipRelationship_memberId_idx" ON "StewardshipRelationship"("memberId");

-- CreateIndex
CREATE INDEX "StewardshipRelationship_stewardId_idx" ON "StewardshipRelationship"("stewardId");

-- CreateIndex
CREATE INDEX "StewardshipRelationship_status_idx" ON "StewardshipRelationship"("status");

-- CreateIndex
CREATE INDEX "StewardshipNote_relationshipId_idx" ON "StewardshipNote"("relationshipId");

-- CreateIndex
CREATE INDEX "StewardshipTask_relationshipId_idx" ON "StewardshipTask"("relationshipId");

-- CreateIndex
CREATE INDEX "StewardshipRecommendation_relationshipId_idx" ON "StewardshipRecommendation"("relationshipId");

-- CreateIndex
CREATE INDEX "StewardshipRecommendation_opportunityId_idx" ON "StewardshipRecommendation"("opportunityId");

-- CreateIndex
CREATE INDEX "StewardshipRecommendation_resourceId_idx" ON "StewardshipRecommendation"("resourceId");

-- CreateIndex
CREATE INDEX "StewardshipEscalation_relationshipId_idx" ON "StewardshipEscalation"("relationshipId");

-- CreateIndex
CREATE INDEX "StewardshipEscalation_status_idx" ON "StewardshipEscalation"("status");

-- AddForeignKey
ALTER TABLE "StewardCapacity" ADD CONSTRAINT "StewardCapacity_stewardId_fkey" FOREIGN KEY ("stewardId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipRelationship" ADD CONSTRAINT "StewardshipRelationship_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipRelationship" ADD CONSTRAINT "StewardshipRelationship_stewardId_fkey" FOREIGN KEY ("stewardId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipNote" ADD CONSTRAINT "StewardshipNote_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "StewardshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipTask" ADD CONSTRAINT "StewardshipTask_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "StewardshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipRecommendation" ADD CONSTRAINT "StewardshipRecommendation_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "StewardshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipRecommendation" ADD CONSTRAINT "StewardshipRecommendation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipRecommendation" ADD CONSTRAINT "StewardshipRecommendation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardshipEscalation" ADD CONSTRAINT "StewardshipEscalation_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "StewardshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
