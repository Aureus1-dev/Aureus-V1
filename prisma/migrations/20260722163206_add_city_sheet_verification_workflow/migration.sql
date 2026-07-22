-- CreateEnum
CREATE TYPE "CitySheetVerificationEventType" AS ENUM ('VERIFIED', 'REJECTED', 'FLAGGED_FOR_REVIEW');

-- CreateEnum
CREATE TYPE "CitySheetVerificationConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterEnum
ALTER TYPE "CitySheetVerificationStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "CitySheetEntry" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "sourceNotes" TEXT,
ADD COLUMN     "verificationConfidence" "CitySheetVerificationConfidence";

-- DataMigration: A3's candidate seed wrote provenance/source citations into
-- verificationNotes before sourceNotes existed. Move that text to its
-- correct new home and clear verificationNotes for any entry that has not
-- yet actually been verified by a human, so a steward's first real call
-- note is never confused with (or silently overwritten alongside) the
-- original source citation. VERIFIED/NEEDS_REVIEW/REJECTED entries are left
-- untouched here on the assumption that any verificationNotes already on a
-- non-UNVERIFIED row reflects a real human's call notes, not a seed
-- citation, and must not be moved or cleared.
UPDATE "CitySheetEntry"
SET "sourceNotes" = "verificationNotes",
    "verificationNotes" = NULL
WHERE "verificationStatus" = 'UNVERIFIED'
  AND "verificationNotes" IS NOT NULL;

-- CreateTable
CREATE TABLE "CitySheetChecklistItem" (
    "id" UUID NOT NULL,
    "category" "CitySheetCategory",
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitySheetChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitySheetVerificationEvent" (
    "id" UUID NOT NULL,
    "citySheetEntryId" UUID NOT NULL,
    "eventType" "CitySheetVerificationEventType" NOT NULL,
    "previousStatus" "CitySheetVerificationStatus" NOT NULL,
    "newStatus" "CitySheetVerificationStatus" NOT NULL,
    "confidence" "CitySheetVerificationConfidence",
    "notes" TEXT,
    "checklistResponses" JSONB,
    "performedById" UUID NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitySheetVerificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CitySheetChecklistItem_category_idx" ON "CitySheetChecklistItem"("category");

-- CreateIndex
CREATE INDEX "CitySheetChecklistItem_isActive_idx" ON "CitySheetChecklistItem"("isActive");

-- CreateIndex
CREATE INDEX "CitySheetChecklistItem_sortOrder_idx" ON "CitySheetChecklistItem"("sortOrder");

-- CreateIndex
CREATE INDEX "CitySheetVerificationEvent_citySheetEntryId_idx" ON "CitySheetVerificationEvent"("citySheetEntryId");

-- CreateIndex
CREATE INDEX "CitySheetVerificationEvent_performedById_idx" ON "CitySheetVerificationEvent"("performedById");

-- CreateIndex
CREATE INDEX "CitySheetVerificationEvent_performedAt_idx" ON "CitySheetVerificationEvent"("performedAt");

-- CreateIndex
CREATE INDEX "CitySheetVerificationEvent_eventType_idx" ON "CitySheetVerificationEvent"("eventType");

-- AddForeignKey
ALTER TABLE "CitySheetVerificationEvent" ADD CONSTRAINT "CitySheetVerificationEvent_citySheetEntryId_fkey" FOREIGN KEY ("citySheetEntryId") REFERENCES "CitySheetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
