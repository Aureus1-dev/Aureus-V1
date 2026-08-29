-- Responsible Annual Harvest: fail-closed promotion execution with tax/risk gates.

CREATE TYPE "HarvestOfferKind" AS ENUM ('SPORTSBOOK', 'ONLINE_CASINO', 'BANKING', 'OTHER');
CREATE TYPE "HarvestLegalStatus" AS ENUM ('VERIFIED_REGULATED', 'REVIEW_REQUIRED', 'BLOCKED');
CREATE TYPE "HarvestFilingStatus" AS ENUM ('SINGLE', 'MARRIED_FILING_JOINTLY', 'HEAD_OF_HOUSEHOLD', 'MARRIED_FILING_SEPARATELY');
CREATE TYPE "HarvestBenefitImpactStatus" AS ENUM ('NOT_APPLICABLE', 'CLEARED', 'UNKNOWN');
CREATE TYPE "HarvestPlanStatus" AS ENUM ('REVIEW_REQUIRED', 'READY', 'ACTIVE', 'COMPLETED', 'STOPPED', 'CANCELLED');
CREATE TYPE "HarvestItemStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'REQUIREMENT_MET', 'WITHDRAWAL_REQUESTED', 'WITHDRAWN', 'SKIPPED', 'STOPPED');
CREATE TYPE "HarvestEventType" AS ENUM ('PLAN_CREATED', 'ITEM_STARTED', 'PROGRESS_REPORTED', 'REQUIREMENT_CONFIRMED', 'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_CONFIRMED', 'ITEM_SKIPPED', 'STOP_ENFORCED', 'PLAN_COMPLETED');

CREATE TABLE "HarvestOfferProfile" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "kind" "HarvestOfferKind" NOT NULL,
    "jurisdictionCountry" TEXT NOT NULL DEFAULT 'US',
    "jurisdictionState" TEXT NOT NULL,
    "minAge" INTEGER NOT NULL DEFAULT 21,
    "legalStatus" "HarvestLegalStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "licenseAuthority" TEXT NOT NULL,
    "licenseSourceUrl" TEXT NOT NULL,
    "termsSourceUrl" TEXT NOT NULL,
    "termsVerifiedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "newCustomerOnly" BOOLEAN NOT NULL DEFAULT true,
    "advertisedValueCents" INTEGER NOT NULL,
    "bankrollRequiredCents" INTEGER NOT NULL DEFAULT 0,
    "projectedCashInCents" INTEGER NOT NULL,
    "projectedCashOutCents" INTEGER NOT NULL,
    "projectedTaxableWinningsCents" INTEGER NOT NULL DEFAULT 0,
    "projectedDeductibleLossesCents" INTEGER NOT NULL DEFAULT 0,
    "playthroughRequiredCents" INTEGER NOT NULL DEFAULT 0,
    "defaultUnitWagerCents" INTEGER,
    "estimatedActionsPerMinute" DOUBLE PRECISION,
    "estimatedMinutes" INTEGER NOT NULL,
    "executionInstructions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "riskNotes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdById" UUID NOT NULL,
    "lastUpdatedById" UUID NOT NULL,
    "profileVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HarvestOfferProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HarvestPlan" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "jurisdictionCountry" TEXT NOT NULL DEFAULT 'US',
    "jurisdictionState" TEXT NOT NULL,
    "filingStatus" "HarvestFilingStatus" NOT NULL,
    "otherTaxableIncomeCents" INTEGER NOT NULL,
    "itemizedDeductionsBeforeGamblingCents" INTEGER NOT NULL DEFAULT 0,
    "benefitImpactStatus" "HarvestBenefitImpactStatus" NOT NULL,
    "requiresTaxProfessionalReview" BOOLEAN NOT NULL DEFAULT false,
    "memberAgeYears" INTEGER NOT NULL,
    "ageEligibilityAttestedAt" TIMESTAMP(3) NOT NULL,
    "eligibilityReviewAttestedAt" TIMESTAMP(3) NOT NULL,
    "bankrollLimitCents" INTEGER NOT NULL,
    "projectedLossLimitCents" INTEGER NOT NULL,
    "timeLimitMinutes" INTEGER NOT NULL,
    "targetNetCents" INTEGER,
    "stopRuleAcceptedAt" TIMESTAMP(3) NOT NULL,
    "status" "HarvestPlanStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "blockReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "projectedCashInCents" INTEGER NOT NULL DEFAULT 0,
    "projectedCashOutCents" INTEGER NOT NULL DEFAULT 0,
    "projectedFederalTaxCents" INTEGER NOT NULL DEFAULT 0,
    "projectedStateTaxCents" INTEGER NOT NULL DEFAULT 0,
    "recommendedTaxReserveCents" INTEGER NOT NULL DEFAULT 0,
    "projectedNetValueCents" INTEGER NOT NULL DEFAULT 0,
    "projectedGamblingWinningsCents" INTEGER NOT NULL DEFAULT 0,
    "projectedDeductibleLossesCents" INTEGER NOT NULL DEFAULT 0,
    "maxBankrollRequiredCents" INTEGER NOT NULL DEFAULT 0,
    "projectedMinutes" INTEGER NOT NULL DEFAULT 0,
    "withdrawnValueCents" INTEGER NOT NULL DEFAULT 0,
    "stoppedAt" TIMESTAMP(3),
    "stopReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HarvestPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HarvestPlanItem" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "offerProfileId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "HarvestItemStatus" NOT NULL DEFAULT 'QUEUED',
    "projectedCashInCents" INTEGER NOT NULL,
    "projectedCashOutCents" INTEGER NOT NULL,
    "projectedTaxableWinningsCents" INTEGER NOT NULL,
    "projectedDeductibleLossesCents" INTEGER NOT NULL,
    "projectedFederalTaxCents" INTEGER NOT NULL,
    "projectedStateTaxCents" INTEGER NOT NULL,
    "recommendedTaxReserveCents" INTEGER NOT NULL,
    "projectedNetAfterTaxCents" INTEGER NOT NULL,
    "bankrollRequiredCents" INTEGER NOT NULL,
    "projectedMinutes" INTEGER NOT NULL,
    "playthroughRequiredCents" INTEGER NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "operatorReportedRemainingCents" INTEGER,
    "progressEvidenceReference" TEXT,
    "progressUpdatedAt" TIMESTAMP(3),
    "withdrawalRequestedCents" INTEGER,
    "withdrawalConfirmedCents" INTEGER,
    "startedAt" TIMESTAMP(3),
    "requirementConfirmedAt" TIMESTAMP(3),
    "withdrawalRequestedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HarvestPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HarvestEvent" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "type" "HarvestEventType" NOT NULL,
    "itemId" UUID,
    "metadata" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HarvestEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HarvestOfferProfile_opportunityId_key" ON "HarvestOfferProfile"("opportunityId");
CREATE INDEX "HarvestOfferProfile_legalStatus_jurisdictionState_idx" ON "HarvestOfferProfile"("legalStatus", "jurisdictionState");
CREATE INDEX "HarvestOfferProfile_termsVerifiedAt_idx" ON "HarvestOfferProfile"("termsVerifiedAt");
CREATE INDEX "HarvestOfferProfile_expiresAt_idx" ON "HarvestOfferProfile"("expiresAt");
CREATE UNIQUE INDEX "HarvestPlan_userId_taxYear_key" ON "HarvestPlan"("userId", "taxYear");
CREATE INDEX "HarvestPlan_userId_status_idx" ON "HarvestPlan"("userId", "status");
CREATE UNIQUE INDEX "HarvestPlanItem_planId_offerProfileId_key" ON "HarvestPlanItem"("planId", "offerProfileId");
CREATE UNIQUE INDEX "HarvestPlanItem_planId_position_key" ON "HarvestPlanItem"("planId", "position");
CREATE INDEX "HarvestPlanItem_planId_status_idx" ON "HarvestPlanItem"("planId", "status");
CREATE INDEX "HarvestEvent_planId_occurredAt_idx" ON "HarvestEvent"("planId", "occurredAt");
CREATE INDEX "HarvestEvent_itemId_idx" ON "HarvestEvent"("itemId");

ALTER TABLE "HarvestOfferProfile" ADD CONSTRAINT "HarvestOfferProfile_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HarvestPlan" ADD CONSTRAINT "HarvestPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HarvestPlanItem" ADD CONSTRAINT "HarvestPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "HarvestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HarvestPlanItem" ADD CONSTRAINT "HarvestPlanItem_offerProfileId_fkey" FOREIGN KEY ("offerProfileId") REFERENCES "HarvestOfferProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HarvestEvent" ADD CONSTRAINT "HarvestEvent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "HarvestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
