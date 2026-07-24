-- CreateEnum
CREATE TYPE "CitySheetCategory" AS ENUM ('CRISIS_LINE', 'ASSISTANCE_PROGRAM', 'LEGAL_AID', 'FOOD_RESOURCE', 'HOUSING_UTILITIES', 'EMPLOYMENT_JOB_SEARCH', 'TRANSPORTATION', 'BENEFITS_APPLICATION_SUPPORT', 'MAIL_CORRESPONDENCE_SUPPORT', 'HEALTHCARE', 'OTHER');

-- CreateEnum
CREATE TYPE "LaunchAreaScope" AS ENUM ('CORE_LAUNCH_COUNTY', 'GREATER_PHILADELPHIA_SUPPLEMENTAL');

-- CreateEnum
CREATE TYPE "CitySheetVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "CitySheetEntryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "CitySheetEntry" (
    "id" UUID NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "citySheetRef" TEXT,
    "organizationName" TEXT NOT NULL,
    "category" "CitySheetCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "serviceArea" TEXT NOT NULL,
    "launchScope" "LaunchAreaScope" NOT NULL DEFAULT 'CORE_LAUNCH_COUNTY',
    "phone" TEXT,
    "website" TEXT,
    "hours" TEXT NOT NULL,
    "eligibilityRequirements" TEXT,
    "languagesSupported" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessibilityNotes" TEXT,
    "cost" TEXT,
    "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referralRequired" BOOLEAN NOT NULL DEFAULT false,
    "isEmergencyService" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "CitySheetVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "lastVerifiedAt" TIMESTAMP(3),
    "verifiedById" UUID,
    "verificationNotes" TEXT,
    "nextReviewDueAt" TIMESTAMP(3),
    "status" "CitySheetEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitySheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CitySheetEntry_sequenceNumber_key" ON "CitySheetEntry"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CitySheetEntry_citySheetRef_key" ON "CitySheetEntry"("citySheetRef");

-- CreateIndex
CREATE INDEX "CitySheetEntry_category_idx" ON "CitySheetEntry"("category");

-- CreateIndex
CREATE INDEX "CitySheetEntry_launchScope_idx" ON "CitySheetEntry"("launchScope");

-- CreateIndex
CREATE INDEX "CitySheetEntry_verificationStatus_idx" ON "CitySheetEntry"("verificationStatus");

-- CreateIndex
CREATE INDEX "CitySheetEntry_status_idx" ON "CitySheetEntry"("status");

-- CreateIndex
CREATE INDEX "CitySheetEntry_createdById_idx" ON "CitySheetEntry"("createdById");
