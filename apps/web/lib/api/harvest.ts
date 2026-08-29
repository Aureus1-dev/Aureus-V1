import { apiRequest } from './http';

export type HarvestPlanStatus =
  | 'REVIEW_REQUIRED'
  | 'READY'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'STOPPED'
  | 'CANCELLED';

export type HarvestItemStatus =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'REQUIREMENT_MET'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWN'
  | 'SKIPPED'
  | 'STOPPED';

export interface HarvestCandidateDto {
  offerProfileId: string;
  opportunityId: string;
  opportunityRef: string | null;
  title: string;
  provider: string;
  kind: 'SPORTSBOOK' | 'ONLINE_CASINO';
  minAge: number;
  newCustomerOnly: boolean;
  advertisedValueCents: number;
  bankrollRequiredCents: number;
  estimatedMinutes: number;
  termsSourceUrl: string;
  termsVerifiedAt: string;
  licenseAuthority: string;
  licenseSourceUrl: string;
  riskNotes: string[];
}

export interface HarvestSourceSnapshot {
  opportunityId: string;
  opportunityRef: string | null;
  title: string;
  provider: string;
  officialSourceUrl: string;
  applicationUrl: string | null;
  termsSourceUrl: string;
  termsVerifiedAt: string;
  licenseAuthority: string;
  licenseSourceUrl: string;
  legalStatus: string;
  profileVersion: number;
  executionInstructions: string[];
  riskNotes: string[];
  plannedAt: string;
}

export interface HarvestPlanItemDto {
  id: string;
  position: number;
  status: HarvestItemStatus;
  projectedCashInCents: number;
  projectedCashOutCents: number;
  projectedFederalTaxCents: number;
  projectedStateTaxCents: number;
  recommendedTaxReserveCents: number;
  projectedNetAfterTaxCents: number;
  bankrollRequiredCents: number;
  projectedMinutes: number;
  playthroughRequiredCents: number;
  operatorReportedRemainingCents: number | null;
  withdrawalRequestedCents: number | null;
  withdrawalConfirmedCents: number | null;
  sourceSnapshot: HarvestSourceSnapshot;
}

export interface HarvestPlanDto {
  id: string;
  taxYear: number;
  jurisdictionState: string;
  memberAgeYears: number;
  status: HarvestPlanStatus;
  blockReasons: string[];
  projectedCashInCents: number;
  projectedCashOutCents: number;
  projectedFederalTaxCents: number;
  projectedStateTaxCents: number;
  recommendedTaxReserveCents: number;
  projectedNetValueCents: number;
  maxBankrollRequiredCents: number;
  projectedMinutes: number;
  withdrawnValueCents: number;
  stopReason: string | null;
  items: HarvestPlanItemDto[];
}

export interface CreateHarvestPlanInput {
  taxYear: number;
  jurisdictionState: string;
  jurisdictionCountry?: string;
  filingStatus:
    | 'SINGLE'
    | 'MARRIED_FILING_JOINTLY'
    | 'HEAD_OF_HOUSEHOLD'
    | 'MARRIED_FILING_SEPARATELY';
  otherTaxableIncomeCents: number;
  itemizedDeductionsBeforeGamblingCents?: number;
  benefitImpactStatus: 'NOT_APPLICABLE' | 'CLEARED' | 'UNKNOWN';
  requiresTaxProfessionalReview?: boolean;
  memberAgeYears: number;
  attestsAgeAccuracy: boolean;
  reviewedOfferEligibility: boolean;
  attestsLegalParticipation: boolean;
  excludedOfferProfileIds?: string[];
  bankrollLimitCents: number;
  projectedLossLimitCents: number;
  timeLimitMinutes: number;
  targetNetCents?: number;
  acceptsStopRule: boolean;
}

export function listHarvestCandidates(
  accessToken: string,
  state = 'PA',
  country = 'US',
): Promise<HarvestCandidateDto[]> {
  const query = new URLSearchParams({ state, country });
  return apiRequest<HarvestCandidateDto[]>(
    `/harvest/candidates?${query.toString()}`,
    { accessToken },
  );
}

export function getHarvestPlan(
  accessToken: string,
  taxYear: number,
): Promise<HarvestPlanDto | null> {
  return apiRequest<HarvestPlanDto | null>(
    `/harvest/plans/current?taxYear=${taxYear}`,
    { accessToken },
  );
}

export function createHarvestPlan(
  accessToken: string,
  input: CreateHarvestPlanInput,
): Promise<HarvestPlanDto> {
  return apiRequest<HarvestPlanDto>('/harvest/plans', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

function itemAction(
  accessToken: string,
  planId: string,
  itemId: string,
  action: string,
  body?: unknown,
): Promise<HarvestPlanDto> {
  return apiRequest<HarvestPlanDto>(
    `/harvest/plans/${planId}/items/${itemId}/${action}`,
    { method: 'POST', body, accessToken },
  );
}

export const startHarvestItem = (
  accessToken: string,
  planId: string,
  itemId: string,
) => itemAction(accessToken, planId, itemId, 'start');

export const reportHarvestProgress = (
  accessToken: string,
  planId: string,
  itemId: string,
  operatorReportedRemainingCents: number,
  progressEvidenceReference?: string,
) =>
  itemAction(accessToken, planId, itemId, 'progress', {
    operatorReportedRemainingCents,
    progressEvidenceReference,
  });

export const confirmHarvestRequirement = (
  accessToken: string,
  planId: string,
  itemId: string,
) =>
  itemAction(accessToken, planId, itemId, 'requirement-complete', {
    operatorConfirmedComplete: true,
  });

export const requestHarvestWithdrawal = (
  accessToken: string,
  planId: string,
  itemId: string,
  amountCents: number,
) =>
  itemAction(accessToken, planId, itemId, 'request-withdrawal', {
    amountCents,
  });

export const confirmHarvestWithdrawal = (
  accessToken: string,
  planId: string,
  itemId: string,
  amountCents: number,
) =>
  itemAction(accessToken, planId, itemId, 'confirm-withdrawal', {
    amountCents,
  });

export const skipHarvestItem = (
  accessToken: string,
  planId: string,
  itemId: string,
  reason: string,
) => itemAction(accessToken, planId, itemId, 'skip', { reason });

export function stopHarvestPlan(
  accessToken: string,
  planId: string,
  reason: string,
): Promise<HarvestPlanDto> {
  return apiRequest<HarvestPlanDto>(`/harvest/plans/${planId}/stop`, {
    method: 'POST',
    body: { reason },
    accessToken,
  });
}
