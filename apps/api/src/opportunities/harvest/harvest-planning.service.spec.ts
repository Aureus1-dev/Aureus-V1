import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  HarvestBenefitImpactStatus,
  HarvestFilingStatus,
  HarvestItemStatus,
  HarvestLegalStatus,
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
