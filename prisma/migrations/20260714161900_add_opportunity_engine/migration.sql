-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('EMPLOYMENT', 'EDUCATION', 'SCHOLARSHIP', 'GRANT', 'GOVERNMENT_BENEFIT', 'HOUSING', 'FINANCIAL_ASSISTANCE', 'BANKING_INCENTIVE', 'CREDIT_BUILDING', 'BUSINESS', 'VOLUNTEER', 'COMMUNITY_PROGRAM', 'HEALTH_WELLNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "BenefitType" AS ENUM ('JOB', 'GRANT', 'SCHOLARSHIP', 'LOAN', 'BENEFIT', 'HOUSING', 'CREDIT', 'TRAINING', 'VOLUNTEER', 'COMMUNITY', 'HEALTH', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ADMIN_ENTRY', 'ORGANIZATION_SUBMISSION', 'BUSINESS_SUBMISSION');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('SAVED', 'APPLYING', 'APPLIED', 'RECEIVED', 'NOT_INTERESTED');

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" UUID NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "opportunityRef" TEXT,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "category" "OpportunityCategory" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider" TEXT NOT NULL,
    "officialSourceUrl" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "location" TEXT,
    "country" TEXT,
    "state" TEXT,
    "eligibilityRules" TEXT NOT NULL,
    "benefitType" "BenefitType" NOT NULL,
    "benefitAmount" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "datePublished" TIMESTAMP(3),
    "dateLastVerified" TIMESTAMP(3),
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'ADMIN_ENTRY',
    "submittedById" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "lastUpdatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedOpportunity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "trackingStatus" "TrackingStatus" NOT NULL DEFAULT 'SAVED',
    "notes" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" "OpportunityCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_sequenceNumber_key" ON "Opportunity"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_opportunityRef_key" ON "Opportunity"("opportunityRef");

-- CreateIndex
CREATE INDEX "Opportunity_category_idx" ON "Opportunity"("category");

-- CreateIndex
CREATE INDEX "Opportunity_verificationStatus_idx" ON "Opportunity"("verificationStatus");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_benefitType_idx" ON "Opportunity"("benefitType");

-- CreateIndex
CREATE INDEX "Opportunity_deadline_idx" ON "Opportunity"("deadline");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "SavedOpportunity_userId_idx" ON "SavedOpportunity"("userId");

-- CreateIndex
CREATE INDEX "SavedOpportunity_opportunityId_idx" ON "SavedOpportunity"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedOpportunity_userId_opportunityId_key" ON "SavedOpportunity"("userId", "opportunityId");

-- CreateIndex
CREATE INDEX "UserInterest_userId_idx" ON "UserInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_userId_category_key" ON "UserInterest"("userId", "category");

-- AddForeignKey
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
