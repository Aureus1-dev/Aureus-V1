-- CreateEnum
CREATE TYPE "SeasonOfLife" AS ENUM ('STUDENT', 'EARLY_CAREER', 'YOUNG_FAMILY', 'ESTABLISHED_CAREER', 'MID_LIFE_TRANSITION', 'EMPTY_NEST', 'RETIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "PodType" AS ENUM ('HOME', 'INTEREST');

-- CreateEnum
CREATE TYPE "PodStatus" AS ENUM ('FORMING', 'ACTIVE', 'DORMANT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PodMemberRole" AS ENUM ('MEMBER', 'STEWARD');

-- CreateEnum
CREATE TYPE "PodMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'DEFERRED', 'ENDED');

-- CreateEnum
CREATE TYPE "PodMembershipOrigin" AS ENUM ('MEMBER_REQUEST', 'AI_MATCH_SUGGESTION', 'STEWARD_INVITATION', 'ADMIN_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "PodEventType" AS ENUM ('MEETING', 'SERVICE_PROJECT', 'CELEBRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PodEventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RsvpResponse" AS ENUM ('YES', 'NO', 'MAYBE');

-- CreateEnum
CREATE TYPE "MeetingCadence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'AD_HOC');

-- CreateEnum
CREATE TYPE "ServiceProjectStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PodRequestType" AS ENUM ('JOIN', 'LEAVE', 'REASSIGNMENT', 'PROPOSE_NEW_POD');

-- CreateEnum
CREATE TYPE "PodRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PodInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "AiCapability" ADD VALUE 'POD_INSIGHT';

-- AlterEnum
ALTER TYPE "ConversationType" ADD VALUE 'POD';

-- AlterTable
ALTER TABLE "AiRecommendation" ADD COLUMN     "podId" UUID;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "podId" UUID;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "availabilityNotes" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "faithPreference" TEXT,
ADD COLUMN     "localAreaDescription" TEXT,
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "seasonOfLife" "SeasonOfLife",
ADD COLUMN     "stateProvince" TEXT;

-- AlterTable
ALTER TABLE "StewardshipEscalation" ADD COLUMN     "podId" UUID,
ALTER COLUMN "relationshipId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Pod" (
    "id" UUID NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "podRef" TEXT,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "type" "PodType" NOT NULL,
    "status" "PodStatus" NOT NULL DEFAULT 'FORMING',
    "capacity" INTEGER NOT NULL DEFAULT 12,
    "primaryLanguage" TEXT,
    "dormancyThresholdDays" INTEGER NOT NULL DEFAULT 60,
    "parentPodId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodMembership" (
    "id" UUID NOT NULL,
    "podId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "PodMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "PodMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "origin" "PodMembershipOrigin" NOT NULL,
    "invitedById" UUID,
    "joinedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodEvent" (
    "id" UUID NOT NULL,
    "podId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PodEventType" NOT NULL DEFAULT 'MEETING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "createdById" UUID NOT NULL,
    "status" "PodEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodEventRsvp" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "response" "RsvpResponse" NOT NULL DEFAULT 'MAYBE',
    "attended" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodEventRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodMeetingSchedule" (
    "id" UUID NOT NULL,
    "podId" UUID NOT NULL,
    "cadence" "MeetingCadence" NOT NULL DEFAULT 'WEEKLY',
    "dayOfWeek" INTEGER,
    "timeOfDay" TEXT,
    "location" TEXT,
    "durationMinutes" INTEGER,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodMeetingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodServiceProject" (
    "id" UUID NOT NULL,
    "podId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ServiceProjectStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodServiceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "PodRequestType" NOT NULL,
    "podId" UUID,
    "proposedPodName" TEXT,
    "proposedPodDescription" TEXT,
    "reason" TEXT,
    "status" "PodRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodInvitation" (
    "id" UUID NOT NULL,
    "podId" UUID NOT NULL,
    "invitedUserId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "message" TEXT,
    "status" "PodInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pod_sequenceNumber_key" ON "Pod"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Pod_podRef_key" ON "Pod"("podRef");

-- CreateIndex
CREATE INDEX "Pod_type_idx" ON "Pod"("type");

-- CreateIndex
CREATE INDEX "Pod_status_idx" ON "Pod"("status");

-- CreateIndex
CREATE INDEX "Pod_parentPodId_idx" ON "Pod"("parentPodId");

-- CreateIndex
CREATE INDEX "PodMembership_podId_idx" ON "PodMembership"("podId");

-- CreateIndex
CREATE INDEX "PodMembership_userId_idx" ON "PodMembership"("userId");

-- CreateIndex
CREATE INDEX "PodMembership_status_idx" ON "PodMembership"("status");

-- CreateIndex
CREATE INDEX "PodEvent_podId_idx" ON "PodEvent"("podId");

-- CreateIndex
CREATE INDEX "PodEvent_startsAt_idx" ON "PodEvent"("startsAt");

-- CreateIndex
CREATE INDEX "PodEventRsvp_userId_idx" ON "PodEventRsvp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PodEventRsvp_eventId_userId_key" ON "PodEventRsvp"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PodMeetingSchedule_podId_key" ON "PodMeetingSchedule"("podId");

-- CreateIndex
CREATE INDEX "PodServiceProject_podId_idx" ON "PodServiceProject"("podId");

-- CreateIndex
CREATE INDEX "PodServiceProject_status_idx" ON "PodServiceProject"("status");

-- CreateIndex
CREATE INDEX "PodRequest_userId_idx" ON "PodRequest"("userId");

-- CreateIndex
CREATE INDEX "PodRequest_podId_idx" ON "PodRequest"("podId");

-- CreateIndex
CREATE INDEX "PodRequest_status_idx" ON "PodRequest"("status");

-- CreateIndex
CREATE INDEX "PodInvitation_podId_idx" ON "PodInvitation"("podId");

-- CreateIndex
CREATE INDEX "PodInvitation_invitedUserId_idx" ON "PodInvitation"("invitedUserId");

-- CreateIndex
CREATE INDEX "PodInvitation_status_idx" ON "PodInvitation"("status");

-- CreateIndex
CREATE INDEX "AiRecommendation_podId_idx" ON "AiRecommendation"("podId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_podId_key" ON "Conversation"("podId");

-- CreateIndex
CREATE INDEX "StewardshipEscalation_podId_idx" ON "StewardshipEscalation"("podId");

-- AddForeignKey
ALTER TABLE "StewardshipEscalation" ADD CONSTRAINT "StewardshipEscalation_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_parentPodId_fkey" FOREIGN KEY ("parentPodId") REFERENCES "Pod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodMembership" ADD CONSTRAINT "PodMembership_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodMembership" ADD CONSTRAINT "PodMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodEvent" ADD CONSTRAINT "PodEvent_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodEventRsvp" ADD CONSTRAINT "PodEventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PodEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodEventRsvp" ADD CONSTRAINT "PodEventRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodMeetingSchedule" ADD CONSTRAINT "PodMeetingSchedule_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodServiceProject" ADD CONSTRAINT "PodServiceProject_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodRequest" ADD CONSTRAINT "PodRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodRequest" ADD CONSTRAINT "PodRequest_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodInvitation" ADD CONSTRAINT "PodInvitation_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodInvitation" ADD CONSTRAINT "PodInvitation_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

