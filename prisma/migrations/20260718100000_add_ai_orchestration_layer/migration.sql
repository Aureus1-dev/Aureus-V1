-- AlterEnum
ALTER TYPE "AiCapability" ADD VALUE 'NEXT_BEST_ACTION';
ALTER TYPE "AiCapability" ADD VALUE 'STEWARD_ESCALATION';

-- CreateEnum
CREATE TYPE "AiOrchestrationGoal" AS ENUM ('NEXT_BEST_ACTION', 'OPPORTUNITY_SUGGESTION', 'RESOURCE_SUGGESTION', 'JOURNEY_GUIDANCE', 'STEWARD_ESCALATION', 'EDUCATIONAL_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "AiOrchestrationStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'NO_ACTION');

-- AlterTable
ALTER TABLE "AiRecommendation" ADD COLUMN     "relationshipId" UUID;

-- CreateTable
CREATE TABLE "AiOrchestrationRun" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "goal" "AiOrchestrationGoal" NOT NULL,
    "capabilitiesInvoked" "AiCapability"[],
    "outcome" TEXT NOT NULL,
    "status" "AiOrchestrationStatus" NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiOrchestrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRecommendation_relationshipId_idx" ON "AiRecommendation"("relationshipId");

-- CreateIndex
CREATE INDEX "AiOrchestrationRun_userId_idx" ON "AiOrchestrationRun"("userId");

-- CreateIndex
CREATE INDEX "AiOrchestrationRun_goal_idx" ON "AiOrchestrationRun"("goal");

-- CreateIndex
CREATE INDEX "AiOrchestrationRun_createdAt_idx" ON "AiOrchestrationRun"("createdAt");

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "StewardshipRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOrchestrationRun" ADD CONSTRAINT "AiOrchestrationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
