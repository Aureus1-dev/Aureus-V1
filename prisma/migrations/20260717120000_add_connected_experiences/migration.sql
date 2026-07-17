-- AlterEnum
ALTER TYPE "AiCapability" ADD VALUE 'DOCUMENT_SUMMARY';

-- CreateEnum
CREATE TYPE "ConnectedProviderType" AS ENUM ('GMAIL', 'GOOGLE_CALENDAR', 'OUTLOOK_MAIL', 'OUTLOOK_CALENDAR', 'BANKING', 'PAYROLL', 'INVESTMENT_ACCOUNTS', 'GOVERNMENT_BENEFITS', 'TAX_RECORDS');

-- CreateEnum
CREATE TYPE "ConnectedAccountStatus" AS ENUM ('CONNECTED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('IDENTIFICATION', 'LEASE', 'FINANCIAL', 'EMPLOYMENT', 'EDUCATION', 'MEDICAL', 'LEGAL', 'OTHER');

-- CreateEnum
CREATE TYPE "StewardActivityEventType" AS ENUM ('CONNECTION_REQUESTED', 'CONNECTION_ESTABLISHED', 'CONNECTION_REVOKED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SUMMARIZED', 'DOCUMENT_DELETED');

-- CreateEnum
CREATE TYPE "StewardActivityActor" AS ENUM ('MEMBER', 'AI_STEWARD', 'SYSTEM');

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerType" "ConnectedProviderType" NOT NULL,
    "status" "ConnectedAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "grantedScopes" TEXT[],
    "externalAccountRef" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "documentRef" TEXT,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageRef" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "extractedText" TEXT,
    "aiSummary" TEXT,
    "aiSummaryGeneratedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StewardActivityLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventType" "StewardActivityEventType" NOT NULL,
    "actor" "StewardActivityActor" NOT NULL,
    "description" TEXT NOT NULL,
    "connectedAccountId" UUID,
    "documentId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StewardActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedAccount_userId_idx" ON "ConnectedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_providerType_key" ON "ConnectedAccount"("userId", "providerType");

-- CreateIndex
CREATE UNIQUE INDEX "Document_sequenceNumber_key" ON "Document"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Document_documentRef_key" ON "Document"("documentRef");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "StewardActivityLog_userId_idx" ON "StewardActivityLog"("userId");

-- CreateIndex
CREATE INDEX "StewardActivityLog_occurredAt_idx" ON "StewardActivityLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardActivityLog" ADD CONSTRAINT "StewardActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardActivityLog" ADD CONSTRAINT "StewardActivityLog_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StewardActivityLog" ADD CONSTRAINT "StewardActivityLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
