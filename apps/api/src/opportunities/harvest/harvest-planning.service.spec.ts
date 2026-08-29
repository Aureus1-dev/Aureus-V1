import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  HarvestBenefitImpactStatus,
  HarvestFilingStatus,
  HarvestItemStatus,
  HarvestLegalStatus,
  HarvestOfferKind,
  HarvestPlanStatus,
  OpportunityStatus,
  VerificationStatus,
} from '@prisma/client';
import { OpportunitiesService } from '../opportunities.service';
import { HarvestPlanningService } from './harvest-planning.service';
import { HarvestTaxEngineService } from './harvest-tax-engine.service';
import {
  HarvestPlanWithItems,
  IHarvestRepository,
} from './repositories/harvest.repository.interface';

const repo = {
  upsertProfile: jest.fn(),
  listEligibleProfiles: jest.fn(),
  listProfilesForReview: jest.fn(),
  createPlan: jest.fn(),
  findPlanForUser: jest.fn(),
  findPlanByIdForUser: jest.fn(),
  updatePlan: jest.fn(),
  updateItem: jest.fn(),
  appendEvent: jest.fn(),
  stopOpenItems: jest.fn(),
  countOpenItems: jest.fn(),
} as unknown as jest.Mocked<IHarvestRepository>;

const opportunities = {
  findById: jest.fn(),
} as unknown as OpportunitiesService;

const basePlan = (status: HarvestPlanStatus): HarvestPlanWithItems =>
  ({
    id: 'plan-1',
    userId: 'user-1',
    taxYear: 2026,
    status,
    items: [],
    blockReasons: [],
  }) as unknown as HarvestPlanWithItems;

describe('HarvestPlanningService', () => {
  let service: HarvestPlanningService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HarvestPlanningService(
      repo,
      opportunities,
      new HarvestTaxEngineService(),
    );
  });

  it('rejects VERIFIED_REGULATED Pennsylvania profiles without official PGCB license evidence', async () => {
    (opportunities.findById as jest.Mock).mockResolvedValue({
      status: OpportunityStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
    });

    await expect(
      service.upsertProfile(
        'opp-1',
        {
          kind: HarvestOfferKind.SPORTSBOOK,
          jurisdictionState: 'PA',
          legalStatus: HarvestLegalStatus.VERIFIED_REGULATED,
          licenseAuthority: 'Unverified source',
          licenseSourceUrl: 'https://example.com/license',
          termsSourceUrl: 'https://example.com/terms',
          termsVerifiedAt: new Date().toISOString(),
          advertisedValueCents: 10_000,
          bankrollRequiredCents: 10_000,
          projectedCashInCents: 10_000,
          projectedCashOutCents: 0,
          projectedTaxableWinningsCents: 10_000,
          projectedDeductibleLossesCents: 0,
          playthroughRequiredCents: 0,
          estimatedMinutes: 10,
          executionInstructions: ['Follow the verified terms.'],
          riskNotes: [],
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(repo.upsertProfile).not.toHaveBeenCalled();
  });

  it('blocks a guest from starting a persistent harvest plan', async () => {
    await expect(
      service.createPlan('guest-1', true, {
        taxYear: 2026,
        jurisdictionState: 'PA',
        filingStatus: HarvestFilingStatus.SINGLE,
        otherTaxableIncomeCents: 0,
        benefitImpactStatus: HarvestBenefitImpactStatus.NOT_APPLICABLE,
        bankrollLimitCents: 10_000,
        projectedLossLimitCents: 5_000,
        timeLimitMinutes: 60,
        memberAgeYears: 34,
        attestsAgeAccuracy: true,
        reviewedOfferEligibility: true,
        attestsLegalParticipation: true,
        acceptsStopRule: true,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks planning without explicit legal-participation and self-exclusion attestation', async () => {
    await expect(
      service.createPlan('user-1', false, {
        taxYear: 2026,
        jurisdictionState: 'PA',
        filingStatus: HarvestFilingStatus.SINGLE,
        otherTaxableIncomeCents: 0,
        benefitImpactStatus: HarvestBenefitImpactStatus.NOT_APPLICABLE,
        bankrollLimitCents: 10_000,
        projectedLossLimitCents: 5_000,
        timeLimitMinutes: 60,
        memberAgeYears: 34,
        attestsAgeAccuracy: true,
        reviewedOfferEligibility: true,
        attestsLegalParticipation: false,
        acceptsStopRule: true,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.listEligibleProfiles).not.toHaveBeenCalled();
  });

  it('does not request offers when benefit impact is unresolved', async () => {
    repo.findPlanForUser.mockResolvedValue(null);
    repo.createPlan.mockImplementation(async ({ plan }) =>
      ({
        ...basePlan(HarvestPlanStatus.REVIEW_REQUIRED),
        ...plan,
      }) as HarvestPlanWithItems,
    );

    const result = await service.createPlan('user-1', false, {
      taxYear: 2026,
      jurisdictionState: 'PA',
      filingStatus: HarvestFilingStatus.SINGLE,
      otherTaxableIncomeCents: 2_000_000,
      benefitImpactStatus: HarvestBenefitImpactStatus.UNKNOWN,
      bankrollLimitCents: 50_000,
      projectedLossLimitCents: 10_000,
      timeLimitMinutes: 120,
      memberAgeYears: 34,
      attestsAgeAccuracy: true,
      reviewedOfferEligibility: true,
      attestsLegalParticipation: true,
      acceptsStopRule: true,
    });

    expect(repo.listEligibleProfiles).not.toHaveBeenCalled();
    expect(result.status).toBe(HarvestPlanStatus.REVIEW_REQUIRED);
    expect(result.blockReasons.join(' ')).toMatch(/benefit impact/i);
  });

  it('sequences by current after-tax value per minute rather than pre-tax headline value', async () => {
    const fresh = new Date();
    const opportunity = (id: string, title: string) => ({
      id,
      opportunityRef: `AUR-OPP-${id}`,
      title,
      provider: title,
      officialSourceUrl: 'https://example.com/official',
      applicationUrl: 'https://example.com/apply',
    });
    const profile = (
      id: string,
      projectedCashInCents: number,
      projectedCashOutCents: number,
      projectedTaxableWinningsCents: number,
      projectedDeductibleLossesCents: number,
    ) => ({
      id,
      minAge: 21,
      bankrollRequiredCents: 100_000,
      projectedCashInCents,
      projectedCashOutCents,
      projectedTaxableWinningsCents,
      projectedDeductibleLossesCents,
      playthroughRequiredCents: 0,
      estimatedMinutes: 10,
      termsSourceUrl: 'https://example.com/terms',
      termsVerifiedAt: fresh,
      expiresAt: null,
      licenseAuthority: 'Pennsylvania Gaming Control Board',
      licenseSourceUrl:
        'https://gamingcontrolboard.pa.gov/online-sports-wagering-licensed-operators',
      legalStatus: HarvestLegalStatus.VERIFIED_REGULATED,
      profileVersion: 1,
      executionInstructions: ['Follow the verified terms.'],
      riskNotes: [],
      opportunity: opportunity(`opp-${id}`, id),
    });

    repo.findPlanForUser.mockResolvedValue(null);
    repo.listEligibleProfiles.mockResolvedValue([
      profile('headline', 100_000, 0, 100_000, 0),
      profile('tax-efficient', 197_000, 98_000, 99_000, 98_000),
    ] as never);
    repo.createPlan.mockResolvedValue(basePlan(HarvestPlanStatus.READY));

    await service.createPlan('user-1', false, {
      taxYear: 2026,
      jurisdictionState: 'PA',
      filingStatus: HarvestFilingStatus.SINGLE,
      otherTaxableIncomeCents: 0,
      benefitImpactStatus: HarvestBenefitImpactStatus.NOT_APPLICABLE,
      bankrollLimitCents: 200_000,
      projectedLossLimitCents: 200_000,
      timeLimitMinutes: 120,
      targetNetCents: 98_000,
      memberAgeYears: 34,
      attestsAgeAccuracy: true,
      reviewedOfferEligibility: true,
      attestsLegalParticipation: true,
      acceptsStopRule: true,
    });

    const createArg = repo.createPlan.mock.calls[0][0];
    expect(createArg.items).toHaveLength(1);
    expect(createArg.items[0].offerProfileId).toBe('tax-efficient');
  });

  it('enforces stop across all open items', async () => {
    repo.findPlanByIdForUser
      .mockResolvedValueOnce(basePlan(HarvestPlanStatus.ACTIVE))
      .mockResolvedValueOnce(basePlan(HarvestPlanStatus.STOPPED));

    const result = await service.stopPlan('user-1', 'plan-1', {
      reason: 'Member asked to stop.',
    });

    expect(repo.stopOpenItems).toHaveBeenCalledWith('plan-1');
    expect(repo.updatePlan).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({ status: HarvestPlanStatus.STOPPED }),
    );
    expect(result.status).toBe(HarvestPlanStatus.STOPPED);
  });

  it('refuses to start an offer whose reviewed terms are stale at execution time', async () => {
    const stale = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const freshOpportunityVerification = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    );
    const ready = {
      ...basePlan(HarvestPlanStatus.READY),
      memberAgeYears: 34,
      items: [
        {
          id: 'item-1',
          position: 1,
          status: HarvestItemStatus.QUEUED,
          sourceSnapshot: { profileVersion: 1 },
          offerProfile: {
            minAge: 21,
            profileVersion: 1,
            legalStatus: HarvestLegalStatus.VERIFIED_REGULATED,
            termsVerifiedAt: stale,
            expiresAt: null,
            opportunity: {
              status: OpportunityStatus.ACTIVE,
              verificationStatus: VerificationStatus.VERIFIED,
              deletedAt: null,
              dateLastVerified: freshOpportunityVerification,
              deadline: null,
            },
          },
        },
      ],
    } as unknown as HarvestPlanWithItems;
    repo.findPlanByIdForUser.mockResolvedValue(ready);

    await expect(
      service.startItem('user-1', 'plan-1', 'item-1'),
    ).rejects.toThrow(ConflictException);
    expect(repo.updateItem).not.toHaveBeenCalled();
  });

  it('refuses to start when the reviewed promotion profile changed after planning', async () => {
    const fresh = new Date();
    const ready = {
      ...basePlan(HarvestPlanStatus.READY),
      memberAgeYears: 34,
      items: [
        {
          id: 'item-1',
          position: 1,
          status: HarvestItemStatus.QUEUED,
          sourceSnapshot: { profileVersion: 1 },
          offerProfile: {
            minAge: 21,
            profileVersion: 2,
            legalStatus: HarvestLegalStatus.VERIFIED_REGULATED,
            termsVerifiedAt: fresh,
            expiresAt: null,
            opportunity: {
              status: OpportunityStatus.ACTIVE,
              verificationStatus: VerificationStatus.VERIFIED,
              deletedAt: null,
              dateLastVerified: fresh,
              deadline: null,
            },
          },
        },
      ],
    } as unknown as HarvestPlanWithItems;
    repo.findPlanByIdForUser.mockResolvedValue(ready);

    await expect(
      service.startItem('user-1', 'plan-1', 'item-1'),
    ).rejects.toThrow(ConflictException);
    expect(repo.updateItem).not.toHaveBeenCalled();
  });

  it('requires operator progress to reach zero before requirement completion', async () => {
    const active = {
      ...basePlan(HarvestPlanStatus.ACTIVE),
      items: [
        {
          id: 'item-1',
          status: HarvestItemStatus.IN_PROGRESS,
          operatorReportedRemainingCents: null,
        },
      ],
    } as unknown as HarvestPlanWithItems;
    repo.findPlanByIdForUser.mockResolvedValue(active);

    await expect(
      service.confirmRequirement('user-1', 'plan-1', 'item-1', {
        operatorConfirmedComplete: true,
      }),
    ).rejects.toThrow(ConflictException);
    expect(repo.updateItem).not.toHaveBeenCalled();
  });

  it('allows withdrawal settlement after stop without reopening gambling execution', async () => {
    const stoppedWithSettlement = {
      ...basePlan(HarvestPlanStatus.STOPPED),
      items: [
        {
          id: 'item-1',
          status: HarvestItemStatus.REQUIREMENT_MET,
        },
      ],
    } as unknown as HarvestPlanWithItems;
    repo.findPlanByIdForUser
      .mockResolvedValueOnce(stoppedWithSettlement)
      .mockResolvedValueOnce(stoppedWithSettlement);

    await service.requestWithdrawal('user-1', 'plan-1', 'item-1', {
      amountCents: 10_000,
    });

    expect(repo.updateItem).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        status: HarvestItemStatus.WITHDRAWAL_REQUESTED,
        withdrawalRequestedCents: 10_000,
      }),
    );
  });

  it('rejects a confirmed withdrawal larger than the recorded request', async () => {
    const active = {
      ...basePlan(HarvestPlanStatus.ACTIVE),
      items: [
        {
          id: 'item-1',
          status: HarvestItemStatus.WITHDRAWAL_REQUESTED,
          withdrawalRequestedCents: 10_000,
        },
      ],
    } as unknown as HarvestPlanWithItems;
    repo.findPlanByIdForUser.mockResolvedValue(active);

    await expect(
      service.confirmWithdrawal('user-1', 'plan-1', 'item-1', {
        amountCents: 10_001,
      }),
    ).rejects.toThrow(ConflictException);
    expect(repo.updateItem).not.toHaveBeenCalled();
  });

  it('rejects a start after stop means stop', async () => {
    const stopped = {
      ...basePlan(HarvestPlanStatus.STOPPED),
      items: [
        {
          id: 'item-1',
          position: 1,
          status: HarvestItemStatus.STOPPED,
        },
      ],
    } as unknown as HarvestPlanWithItems;
    repo.findPlanByIdForUser.mockResolvedValue(stopped);

    await expect(
      service.startItem('user-1', 'plan-1', 'item-1'),
    ).rejects.toThrow(ConflictException);
  });
});
