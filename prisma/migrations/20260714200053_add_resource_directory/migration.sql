-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('GOVERNMENT_AGENCY', 'NONPROFIT_ORGANIZATION', 'COMMUNITY_ORGANIZATION', 'EDUCATIONAL_INSTITUTION', 'HEALTHCARE_PROVIDER', 'FINANCIAL_SERVICES', 'LEGAL_SERVICES', 'HOUSING_RESOURCES', 'EMPLOYMENT_SERVICES', 'BUSINESS_SUPPORT', 'TECHNOLOGY_TOOLS', 'MENTAL_HEALTH_WELLNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ORGANIZATION', 'PROGRAM', 'SERVICE', 'PROFESSIONAL', 'TOOL', 'COMMUNITY_RESOURCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "SourceType" ADD VALUE 'EXTERNAL_SOURCE';

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "resourceRef" TEXT,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizationName" TEXT NOT NULL,
    "officialSourceUrl" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "location" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "eligibilityNotes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "datePublished" TIMESTAMP(3),
    "dateLastVerified" TIMESTAMP(3),
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'ADMIN_ENTRY',
    "ownerId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "lastUpdatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedResource" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resource_sequenceNumber_key" ON "Resource"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_resourceRef_key" ON "Resource"("resourceRef");

-- CreateIndex
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

-- CreateIndex
CREATE INDEX "Resource_resourceType_idx" ON "Resource"("resourceType");

-- CreateIndex
CREATE INDEX "Resource_verificationStatus_idx" ON "Resource"("verificationStatus");

-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE INDEX "Resource_ownerId_idx" ON "Resource"("ownerId");

-- CreateIndex
CREATE INDEX "Resource_country_idx" ON "Resource"("country");

-- CreateIndex
CREATE INDEX "Resource_createdAt_idx" ON "Resource"("createdAt");

-- CreateIndex
CREATE INDEX "SavedResource_userId_idx" ON "SavedResource"("userId");

-- CreateIndex
CREATE INDEX "SavedResource_resourceId_idx" ON "SavedResource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedResource_userId_resourceId_key" ON "SavedResource"("userId", "resourceId");

-- AddForeignKey
ALTER TABLE "SavedResource" ADD CONSTRAINT "SavedResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
