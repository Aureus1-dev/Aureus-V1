ALTER TYPE "AiCapability" ADD VALUE 'APPLICATION_GUIDANCE';

CREATE TYPE "GuidedApplicationSessionStatus" AS ENUM ('ACTIVE', 'ENDED');

CREATE TABLE "GuidedApplicationSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "applicationUrl" TEXT NOT NULL,
    "status" "GuidedApplicationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "screenCaptureConsentGrantedAt" TIMESTAMP(3),
    "screenCaptureConsentRevokedAt" TIMESTAMP(3),
    "lastFrameAnalyzedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidedApplicationSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuidedApplicationSession_userId_status_idx"
ON "GuidedApplicationSession"("userId", "status");

CREATE INDEX "GuidedApplicationSession_conversationId_status_idx"
ON "GuidedApplicationSession"("conversationId", "status");

CREATE INDEX "GuidedApplicationSession_opportunityId_idx"
ON "GuidedApplicationSession"("opportunityId");

ALTER TABLE "GuidedApplicationSession"
ADD CONSTRAINT "GuidedApplicationSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuidedApplicationSession"
ADD CONSTRAINT "GuidedApplicationSession_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuidedApplicationSession"
ADD CONSTRAINT "GuidedApplicationSession_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
