-- CreateEnum
CREATE TYPE "AiMessageCompletionStatus" AS ENUM ('COMPLETE', 'INTERRUPTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoiceSessionEndReason" AS ENUM ('MEMBER_ENDED', 'TIMEOUT', 'DURATION_LIMIT', 'ERROR', 'RECONNECT_SUPERSEDED');

-- CreateEnum
CREATE TYPE "AiTurnEventType" AS ENUM ('MEMBER_SPEECH_STARTED', 'MEMBER_SPEECH_STOPPED', 'MEMBER_TURN_FINALIZED', 'STEWARD_RESPONSE_STARTED', 'STEWARD_RESPONSE_COMPLETED', 'STEWARD_RESPONSE_INTERRUPTED', 'SILENCE_TIMEOUT');

-- AlterTable
ALTER TABLE "AiMessage" ADD COLUMN     "completionStatus" "AiMessageCompletionStatus" NOT NULL DEFAULT 'COMPLETE',
ADD COLUMN     "providerItemId" TEXT,
ADD COLUMN     "voiceSessionId" UUID;

-- CreateTable
CREATE TABLE "AiVoiceSession" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "turnDetectionMode" TEXT NOT NULL,
    "turnDetectionConfig" JSONB NOT NULL,
    "providerSessionRef" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endReason" "VoiceSessionEndReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiVoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTurnEvent" (
    "id" UUID NOT NULL,
    "voiceSessionId" UUID NOT NULL,
    "type" "AiTurnEventType" NOT NULL,
    "providerItemId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AiTurnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiVoiceSession_conversationId_idx" ON "AiVoiceSession"("conversationId");

-- CreateIndex
CREATE INDEX "AiVoiceSession_userId_idx" ON "AiVoiceSession"("userId");

-- CreateIndex
CREATE INDEX "AiVoiceSession_userId_endedAt_idx" ON "AiVoiceSession"("userId", "endedAt");

-- CreateIndex
CREATE INDEX "AiTurnEvent_voiceSessionId_occurredAt_idx" ON "AiTurnEvent"("voiceSessionId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiTurnEvent_voiceSessionId_type_providerItemId_key" ON "AiTurnEvent"("voiceSessionId", "type", "providerItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AiMessage_voiceSessionId_providerItemId_key" ON "AiMessage"("voiceSessionId", "providerItemId");

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "AiVoiceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiVoiceSession" ADD CONSTRAINT "AiVoiceSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiVoiceSession" ADD CONSTRAINT "AiVoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTurnEvent" ADD CONSTRAINT "AiTurnEvent_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "AiVoiceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

