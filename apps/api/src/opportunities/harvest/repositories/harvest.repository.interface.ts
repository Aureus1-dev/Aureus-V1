import {
  HarvestBenefitImpactStatus,
  HarvestEventType,
  HarvestFilingStatus,
  HarvestItemStatus,
  HarvestLegalStatus,
  HarvestOfferKind,
  HarvestOfferProfile,
  HarvestPlan,
  HarvestPlanItem,
  HarvestPlanStatus,
  Opportunity,
  Prisma,
} from '@prisma/client';

export const HARVEST_REPOSITORY = 'HARVEST_REPOSITORY';

export type HarvestProfileWithOpportunity = HarvestOfferProfile & {
  opportunity: Opportunity;
};

export type HarvestPlanItemWithProfile = HarvestPlanItem & {
  offerProfile: HarvestOfferProfile & { opportunity: Opportunity };
};

export type HarvestPlanWithItems = HarvestPlan & {
  items: HarvestPlanItemWithProfile[];
};

export interface HarvestProfileWrite {
  kind: HarvestOfferKind;
  jurisdictionCountry: string;
  jurisdictionState: string;
  minAge: number;
  legalStatus: HarvestLegalStatus;
  licenseAuthority: string;
  licenseSourceUrl: string;
  termsSourceUrl: string;
  termsVerifiedAt: Date;
  expiresAt: Date | null;
  newCustomerOnly: boolean;
  advertisedValueCents: number;
  bankrollRequiredCents: number;
  projectedCashInCents: number;
  projectedCashOutCents: number;
  projectedTaxableWinningsCents: number;
  projectedDeductibleLossesCents: number;
  playthroughRequiredCents: number;
  defaultUnitWagerCents: number | null;
  estimatedActionsPerMinute: number | null;
  estimatedMinutes: number;
  executionInstructions: string[];
  riskNotes: string[];
  createdById: string;
  lastUpdatedById: string;
}

export interface HarvestPlanWrite {
  userId: string;
  taxYear: number;
  jurisdictionCountry: string;
  jurisdictionState: string;
  filingStatus: HarvestFilingStatus;
  otherTaxableIncomeCents: number;
  itemizedDeductionsBeforeGamblingCents: number;
  benefitImpactStatus: HarvestBenefitImpactStatus;
  requiresTaxProfessionalReview: boolean;
  memberAgeYears: number;
  ageEligibilityAttestedAt: Date;
  eligibilityReviewAttestedAt: Date;
  bankrollLimitCents: number;
  projectedLossLimitCents: number;
  timeLimitMinutes: number;
  targetNetCents: number | null;
  stopRuleAcceptedAt: Date;
  status: HarvestPlanStatus;
  blockReasons: string[];
  projectedCashInCents: number;
  projectedCashOutCents: number;
  projectedFederalTaxCents: number;
  projectedStateTaxCents: number;
  recommendedTaxReserveCents: number;
  projectedNetValueCents: number;
  projectedGamblingWinningsCents: number;
  projectedDeductibleLossesCents: number;
  maxBankrollRequiredCents: number;
  projectedMinutes: number;
}

export interface HarvestPlanItemWrite {
  offerProfileId: string;
  position: number;
  status: HarvestItemStatus;
  projectedCashInCents: number;
  projectedCashOutCents: number;
  projectedTaxableWinningsCents: number;
  projectedDeductibleLossesCents: number;
  projectedFederalTaxCents: number;
  projectedStateTaxCents: number;
  recommendedTaxReserveCents: number;
  projectedNetAfterTaxCents: number;
  bankrollRequiredCents: number;
  projectedMinutes: number;
  playthroughRequiredCents: number;
  sourceSnapshot: Prisma.InputJsonValue;
}

export interface HarvestPlanCreate {
  plan: HarvestPlanWrite;
  items: HarvestPlanItemWrite[];
}

export interface IHarvestRepository {
  upsertProfile(
    opportunityId: string,
    data: HarvestProfileWrite,
  ): Promise<HarvestOfferProfile>;
  listEligibleProfiles(
    state: string,
    country: string,
    verifiedAfter: Date,
    now: Date,
  ): Promise<HarvestProfileWithOpportunity[]>;
  listProfilesForReview(
    staleBefore: Date,
    now: Date,
  ): Promise<HarvestProfileWithOpportunity[]>;
  createPlan(data: HarvestPlanCreate): Promise<HarvestPlanWithItems>;
  findPlanForUser(
    userId: string,
    taxYear: number,
  ): Promise<HarvestPlanWithItems | null>;
  findPlanByIdForUser(
    planId: string,
    userId: string,
  ): Promise<HarvestPlanWithItems | null>;
  updatePlan(
    planId: string,
    data: Prisma.HarvestPlanUncheckedUpdateInput,
  ): Promise<HarvestPlan>;
  updateItem(
    itemId: string,
    data: Prisma.HarvestPlanItemUncheckedUpdateInput,
  ): Promise<HarvestPlanItem>;
  appendEvent(
    planId: string,
    type: HarvestEventType,
    itemId: string | null,
    metadata: Prisma.InputJsonValue,
  ): Promise<void>;
  stopOpenItems(planId: string): Promise<void>;
  countOpenItems(planId: string): Promise<number>;
}
