import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HarvestBenefitImpactStatus,
  HarvestEventType,
  HarvestItemStatus,
  HarvestLegalStatus,
  HarvestPlanStatus,
  OpportunityStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { OpportunitiesService } from '../opportunities.service';
import {
  ConfirmHarvestRequirementDto,
  CreateHarvestPlanDto,
  HarvestAmountDto,
  ReportHarvestProgressDto,
  SkipHarvestItemDto,
  StopHarvestPlanDto,
  UpsertHarvestProfileDto,
} from './dto/harvest.dto';
import { HarvestTaxEngineService } from './harvest-tax-engine.service';
import {
  HARVEST_REPOSITORY,
  HarvestPlanItemWithProfile,
  HarvestPlanWithItems,
  HarvestProfileWithOpportunity,
  IHarvestRepository,
} from './repositories/harvest.repository.interface';

const TERMS_MAX_AGE_DAYS = 14;
const TERMS_MAX_AGE_MS = TERMS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const OPPORTUNITY_MAX_VERIFICATION_AGE_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class HarvestPlanningService {
  constructor(
    @Inject(HARVEST_REPOSITORY)
    private readonly repo: IHarvestRepository,
    private readonly opportunities: OpportunitiesService,
    private readonly taxes: HarvestTaxEngineService,
  ) {}

  async upsertProfile(
    opportunityId: string,
    dto: UpsertHarvestProfileDto,
    actorId: string,
  ) {
    const opportunity = await this.opportunities.findById(opportunityId);

    if (
      dto.legalStatus === HarvestLegalStatus.VERIFIED_REGULATED &&
      (opportunity.status !== OpportunityStatus.ACTIVE ||
        opportunity.verificationStatus !== VerificationStatus.VERIFIED)
    ) {
      throw new ConflictException(
        'A harvest profile cannot be VERIFIED_REGULATED until its Opportunity is VERIFIED + ACTIVE.',
      );
    }

    if (
      dto.legalStatus === HarvestLegalStatus.VERIFIED_REGULATED &&
      dto.jurisdictionState.toUpperCase() === 'PA' &&
      !this.isPennsylvaniaGamingControlBoardUrl(dto.licenseSourceUrl)
    ) {
      throw new BadRequestException(
        'Pennsylvania gaming profiles require Pennsylvania Gaming Control Board license evidence before VERIFIED_REGULATED status.',
      );
    }

    const termsVerifiedAt = new Date(dto.termsVerifiedAt);
    if (termsVerifiedAt.getTime() > Date.now() + 5 * 60_000) {
      throw new BadRequestException(
        'termsVerifiedAt cannot be in the future.',
      );
    }

    return this.repo.upsertProfile(opportunityId, {
      kind: dto.kind,
      jurisdictionCountry: (dto.jurisdictionCountry ?? 'US').toUpperCase(),
      jurisdictionState: dto.jurisdictionState.toUpperCase(),
      minAge: dto.minAge ?? 21,
      legalStatus: dto.legalStatus,
      licenseAuthority: dto.licenseAuthority,
      licenseSourceUrl: dto.licenseSourceUrl,
      termsSourceUrl: dto.termsSourceUrl,
      termsVerifiedAt,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      newCustomerOnly: dto.newCustomerOnly ?? true,
      advertisedValueCents: dto.advertisedValueCents,
      bankrollRequiredCents: dto.bankrollRequiredCents,
      projectedCashInCents: dto.projectedCashInCents,
      projectedCashOutCents: dto.projectedCashOutCents,
      projectedTaxableWinningsCents: dto.projectedTaxableWinningsCents,
      projectedDeductibleLossesCents: dto.projectedDeductibleLossesCents,
      playthroughRequiredCents: dto.playthroughRequiredCents,
      defaultUnitWagerCents: dto.defaultUnitWagerCents ?? null,
      estimatedActionsPerMinute: dto.estimatedActionsPerMinute ?? null,
      estimatedMinutes: dto.estimatedMinutes,
      executionInstructions: dto.executionInstructions,
      riskNotes: dto.riskNotes,
      createdById: actorId,
      lastUpdatedById: actorId,
    });
  }

  async createPlan(
    userId: string,
    isGuest: boolean | undefined,
    dto: CreateHarvestPlanDto,
  ): Promise<HarvestPlanWithItems> {
    if (isGuest) {
      throw new ForbiddenException(
        'Create or claim your account before starting a harvest plan.',
      );
    }
    if (!dto.acceptsStopRule) {
      throw new BadRequestException(
        'The stop rule must be accepted before a harvest plan can start.',
      );
    }
    if (!dto.attestsAgeAccuracy) {
      throw new BadRequestException(
        'Age eligibility must be explicitly attested before a harvest plan can start.',
      );
    }
    if (!dto.reviewedOfferEligibility) {
      throw new BadRequestException(
        'Review the current operators and mark any offers you have already used before a harvest plan can start.',
      );
    }
    if (!dto.attestsLegalParticipation) {
      throw new ForbiddenException(
        'Aureus cannot create a gambling-promotion plan without an explicit attestation that the member is legally permitted to participate and is not currently self-excluded.',
      );
    }

    const existing = await this.repo.findPlanForUser(userId, dto.taxYear);
    if (
      existing &&
      existing.status !== HarvestPlanStatus.COMPLETED &&
      existing.status !== HarvestPlanStatus.STOPPED &&
      existing.status !== HarvestPlanStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Close the current harvest plan before building a fresh plan for this tax year.',
      );
    }

    const state = dto.jurisdictionState.toUpperCase();
    const country = (dto.jurisdictionCountry ?? 'US').toUpperCase();
    const baseItemized = dto.itemizedDeductionsBeforeGamblingCents ?? 0;

    this.taxes.estimate({
      taxYear: dto.taxYear,
      jurisdictionState: state,
      filingStatus: dto.filingStatus,
      otherTaxableIncomeCents: dto.otherTaxableIncomeCents,
      itemizedDeductionsBeforeGamblingCents: baseItemized,
      gamblingWinningsCents: 0,
      deductibleGamblingLossesCents: 0,
    });

    const blockReasons: string[] = [];
    if (dto.benefitImpactStatus === HarvestBenefitImpactStatus.UNKNOWN) {
      blockReasons.push(
        'Means-tested benefit impact is unresolved. Resolve it before any gambling promotion is started.',
      );
    }
    if (dto.requiresTaxProfessionalReview) {
      blockReasons.push(
        'The member marked the tax situation as requiring professional review.',
      );
    }

    const now = new Date();
    const verifiedAfter = new Date(now.getTime() - TERMS_MAX_AGE_MS);
    const opportunityVerifiedAfter = new Date(
      now.getTime() - OPPORTUNITY_MAX_VERIFICATION_AGE_MS,
    );
    const profiles =
      blockReasons.length === 0
        ? await this.repo.listEligibleProfiles(
            state,
            country,
            verifiedAfter,
            opportunityVerifiedAfter,
            now,
          )
        : [];
    const excludedOfferProfileIds = new Set(
      dto.excludedOfferProfileIds ?? [],
    );
    const ageAndEligibilityFiltered = profiles.filter(
      (profile) =>
        dto.memberAgeYears >= profile.minAge &&
        !excludedOfferProfileIds.has(profile.id),
    );

    const remaining = [...ageAndEligibilityFiltered];

    const selected: Array<{
      profile: HarvestProfileWithOpportunity;
      federalTaxCents: number;
      stateTaxCents: number;
      taxReserveCents: number;
      netAfterTaxCents: number;
    }> = [];

    let gamblingWinningsCents = 0;
    let deductibleLossesCents = 0;
    let projectedCashInCents = 0;
    let projectedCashOutCents = 0;
    let projectedMinutes = 0;
    let maxBankrollRequiredCents = 0;
    let previousFederalTaxCents = 0;
    let previousStateTaxCents = 0;

    while (remaining.length > 0) {
      let best:
        | {
            index: number;
            profile: HarvestProfileWithOpportunity;
            nextWinnings: number;
            nextLosses: number;
            federalTaxCents: number;
            stateTaxCents: number;
            marginalFederalTaxCents: number;
            marginalStateTaxCents: number;
            netAfterTaxCents: number;
            score: number;
          }
        | null = null;

      for (let index = 0; index < remaining.length; index += 1) {
        const profile = remaining[index];

        if (profile.bankrollRequiredCents > dto.bankrollLimitCents) continue;
        if (
          projectedCashOutCents + profile.projectedCashOutCents >
          dto.projectedLossLimitCents
        ) {
          continue;
        }
        if (
          projectedMinutes + profile.estimatedMinutes >
          dto.timeLimitMinutes
        ) {
          continue;
        }

        const nextWinnings =
          gamblingWinningsCents + profile.projectedTaxableWinningsCents;
        const nextLosses =
          deductibleLossesCents + profile.projectedDeductibleLossesCents;
        const taxEstimate = this.taxes.estimate({
          taxYear: dto.taxYear,
          jurisdictionState: state,
          filingStatus: dto.filingStatus,
          otherTaxableIncomeCents: dto.otherTaxableIncomeCents,
          itemizedDeductionsBeforeGamblingCents: baseItemized,
          gamblingWinningsCents: nextWinnings,
          deductibleGamblingLossesCents: nextLosses,
        });

        const marginalFederalTaxCents = Math.max(
          0,
          taxEstimate.federalTaxCents - previousFederalTaxCents,
        );
        const marginalStateTaxCents = Math.max(
          0,
          taxEstimate.stateTaxCents - previousStateTaxCents,
        );
        const economicValueCents =
          profile.projectedCashInCents - profile.projectedCashOutCents;
        const netAfterTaxCents =
          economicValueCents -
          marginalFederalTaxCents -
          marginalStateTaxCents;

        if (netAfterTaxCents <= 0) continue;

        const score =
          netAfterTaxCents / Math.max(1, profile.estimatedMinutes);

        if (
          best === null ||
          score > best.score ||
          (score === best.score &&
            netAfterTaxCents > best.netAfterTaxCents)
        ) {
          best = {
            index,
            profile,
            nextWinnings,
            nextLosses,
            federalTaxCents: taxEstimate.federalTaxCents,
            stateTaxCents: taxEstimate.stateTaxCents,
            marginalFederalTaxCents,
            marginalStateTaxCents,
            netAfterTaxCents,
            score,
          };
        }
      }

      if (best === null) break;

      remaining.splice(best.index, 1);
      selected.push({
        profile: best.profile,
        federalTaxCents: best.marginalFederalTaxCents,
        stateTaxCents: best.marginalStateTaxCents,
        taxReserveCents: Math.ceil(
          (best.marginalFederalTaxCents +
            best.marginalStateTaxCents) *
            1.1,
        ),
        netAfterTaxCents: best.netAfterTaxCents,
      });

      gamblingWinningsCents = best.nextWinnings;
      deductibleLossesCents = best.nextLosses;
      projectedCashInCents += best.profile.projectedCashInCents;
      projectedCashOutCents += best.profile.projectedCashOutCents;
      projectedMinutes += best.profile.estimatedMinutes;
      maxBankrollRequiredCents = Math.max(
        maxBankrollRequiredCents,
        best.profile.bankrollRequiredCents,
      );
      previousFederalTaxCents = best.federalTaxCents;
      previousStateTaxCents = best.stateTaxCents;

      const currentNet =
        projectedCashInCents -
        projectedCashOutCents -
        previousFederalTaxCents -
        previousStateTaxCents;

      if (dto.targetNetCents && currentNet >= dto.targetNetCents) break;
    }

    const finalTax = this.taxes.estimate({
      taxYear: dto.taxYear,
      jurisdictionState: state,
      filingStatus: dto.filingStatus,
      otherTaxableIncomeCents: dto.otherTaxableIncomeCents,
      itemizedDeductionsBeforeGamblingCents: baseItemized,
      gamblingWinningsCents,
      deductibleGamblingLossesCents: deductibleLossesCents,
    });

    if (blockReasons.length === 0 && selected.length === 0) {
      blockReasons.push(
        'No freshly reviewed offer currently remains positive after taxes and the member limits.',
      );
    }

    const status =
      blockReasons.length > 0
        ? HarvestPlanStatus.REVIEW_REQUIRED
        : HarvestPlanStatus.READY;

    const plan = await this.repo.createPlan({
      plan: {
        userId,
        taxYear: dto.taxYear,
        jurisdictionCountry: country,
        jurisdictionState: state,
        filingStatus: dto.filingStatus,
        otherTaxableIncomeCents: dto.otherTaxableIncomeCents,
        itemizedDeductionsBeforeGamblingCents: baseItemized,
        benefitImpactStatus: dto.benefitImpactStatus,
        requiresTaxProfessionalReview:
          dto.requiresTaxProfessionalReview ?? false,
        memberAgeYears: dto.memberAgeYears,
        ageEligibilityAttestedAt: now,
        eligibilityReviewAttestedAt: now,
        legalParticipationAttestedAt: now,
        bankrollLimitCents: dto.bankrollLimitCents,
        projectedLossLimitCents: dto.projectedLossLimitCents,
        timeLimitMinutes: dto.timeLimitMinutes,
        targetNetCents: dto.targetNetCents ?? null,
        stopRuleAcceptedAt: now,
        status,
        blockReasons,
        projectedCashInCents,
        projectedCashOutCents,
        projectedFederalTaxCents: finalTax.federalTaxCents,
        projectedStateTaxCents: finalTax.stateTaxCents,
        recommendedTaxReserveCents: finalTax.recommendedReserveCents,
        projectedNetValueCents:
          projectedCashInCents -
          projectedCashOutCents -
          finalTax.federalTaxCents -
          finalTax.stateTaxCents,
        projectedGamblingWinningsCents: gamblingWinningsCents,
        projectedDeductibleLossesCents: deductibleLossesCents,
        maxBankrollRequiredCents,
        projectedMinutes,
      },
      items: selected.map(
        (
          {
            profile,
            federalTaxCents,
            stateTaxCents,
            taxReserveCents,
            netAfterTaxCents,
          },
          index,
        ) => ({
          offerProfileId: profile.id,
          position: index + 1,
          status: HarvestItemStatus.QUEUED,
          projectedCashInCents: profile.projectedCashInCents,
          projectedCashOutCents: profile.projectedCashOutCents,
          projectedTaxableWinningsCents:
            profile.projectedTaxableWinningsCents,
          projectedDeductibleLossesCents:
            profile.projectedDeductibleLossesCents,
          projectedFederalTaxCents: federalTaxCents,
          projectedStateTaxCents: stateTaxCents,
          recommendedTaxReserveCents: taxReserveCents,
          projectedNetAfterTaxCents: netAfterTaxCents,
          bankrollRequiredCents: profile.bankrollRequiredCents,
          projectedMinutes: profile.estimatedMinutes,
          playthroughRequiredCents: profile.playthroughRequiredCents,
          sourceSnapshot: this.sourceSnapshot(profile, now),
        }),
      ),
    });

    await this.repo.appendEvent(
      plan.id,
      HarvestEventType.PLAN_CREATED,
      null,
      {
        status,
        blockReasons,
        selectedItems: selected.length,
        memberAgeYears: dto.memberAgeYears,
        excludedOfferProfileCount: excludedOfferProfileIds.size,
        taxRuleVerifiedAt: finalTax.sourceVerifiedAt,
      },
    );

    return plan;
  }

  async listProfileReviewQueue() {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - TERMS_MAX_AGE_MS);
    const opportunityStaleBefore = new Date(
      now.getTime() - OPPORTUNITY_MAX_VERIFICATION_AGE_MS,
    );
    const profiles = await this.repo.listProfilesForReview(
      staleBefore,
      opportunityStaleBefore,
      now,
    );

    return profiles.map((profile) => {
      const reasons: string[] = [];
      if (profile.legalStatus !== HarvestLegalStatus.VERIFIED_REGULATED) {
        reasons.push(`legal status: ${profile.legalStatus}`);
      }
      if (profile.termsVerifiedAt.getTime() < staleBefore.getTime()) {
        reasons.push('promotion terms older than 14 days');
      }
      if (profile.expiresAt && profile.expiresAt.getTime() < now.getTime()) {
        reasons.push('promotion expired');
      }
      if (profile.opportunity.status !== OpportunityStatus.ACTIVE) {
        reasons.push(`opportunity status: ${profile.opportunity.status}`);
      }
      if (
        profile.opportunity.verificationStatus !==
        VerificationStatus.VERIFIED
      ) {
        reasons.push(
          `opportunity verification: ${profile.opportunity.verificationStatus}`,
        );
      }
      if (profile.opportunity.deletedAt) {
        reasons.push('opportunity deleted');
      }
      if (!profile.opportunity.dateLastVerified) {
        reasons.push('opportunity has no verification timestamp');
      } else if (
        profile.opportunity.dateLastVerified.getTime() <
        opportunityStaleBefore.getTime()
      ) {
        reasons.push('opportunity verification older than 365 days');
      }
      if (
        profile.opportunity.deadline &&
        profile.opportunity.deadline.getTime() < now.getTime()
      ) {
        reasons.push('opportunity deadline passed');
      }

      return {
        offerProfileId: profile.id,
        opportunityId: profile.opportunity.id,
        opportunityRef: profile.opportunity.opportunityRef,
        title: profile.opportunity.title,
        provider: profile.opportunity.provider,
        legalStatus: profile.legalStatus,
        termsSourceUrl: profile.termsSourceUrl,
        termsVerifiedAt: profile.termsVerifiedAt,
        expiresAt: profile.expiresAt,
        profileVersion: profile.profileVersion,
        reasons,
      };
    });
  }

  async listCandidates(
    isGuest: boolean | undefined,
    state: string,
    country = 'US',
  ) {
    if (isGuest) {
      throw new ForbiddenException(
        'Claim your account before reviewing annual harvest candidates.',
      );
    }
    const now = new Date();
    const verifiedAfter = new Date(now.getTime() - TERMS_MAX_AGE_MS);
    const opportunityVerifiedAfter = new Date(
      now.getTime() - OPPORTUNITY_MAX_VERIFICATION_AGE_MS,
    );
    const profiles = await this.repo.listEligibleProfiles(
      state.toUpperCase(),
      country.toUpperCase(),
      verifiedAfter,
      opportunityVerifiedAfter,
      now,
    );
    return profiles.map((profile) => ({
      offerProfileId: profile.id,
      opportunityId: profile.opportunity.id,
      opportunityRef: profile.opportunity.opportunityRef,
      title: profile.opportunity.title,
      provider: profile.opportunity.provider,
      kind: profile.kind,
      minAge: profile.minAge,
      newCustomerOnly: profile.newCustomerOnly,
      advertisedValueCents: profile.advertisedValueCents,
      bankrollRequiredCents: profile.bankrollRequiredCents,
      estimatedMinutes: profile.estimatedMinutes,
      termsSourceUrl: profile.termsSourceUrl,
      termsVerifiedAt: profile.termsVerifiedAt,
      licenseAuthority: profile.licenseAuthority,
      licenseSourceUrl: profile.licenseSourceUrl,
      riskNotes: profile.riskNotes,
    }));
  }

  getPlan(userId: string, taxYear: number) {
    return this.repo.findPlanForUser(userId, taxYear);
  }

  async startItem(userId: string, planId: string, itemId: string) {
    const { plan, item } = await this.item(userId, planId, itemId);
    this.assertPlanRunnable(plan);
    this.assertOfferStillRunnable(plan, item);

    if (item.status !== HarvestItemStatus.QUEUED) {
      throw new ConflictException('Only a queued offer can be started.');
    }

    const priorItems = plan.items.filter(
      (candidate) => candidate.position < item.position,
    );
    if (
      priorItems.some(
        (candidate) =>
          candidate.status !== HarvestItemStatus.WITHDRAWN &&
          candidate.status !== HarvestItemStatus.SKIPPED,
      )
    ) {
      throw new ConflictException(
        'Finish or skip the earlier offer before starting this one.',
      );
    }

    await this.repo.updateItem(itemId, {
      status: HarvestItemStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    if (plan.status === HarvestPlanStatus.READY) {
      await this.repo.updatePlan(planId, {
        status: HarvestPlanStatus.ACTIVE,
      });
    }

    await this.repo.appendEvent(
      planId,
      HarvestEventType.ITEM_STARTED,
      itemId,
      { position: item.position },
    );

    return this.requirePlan(userId, planId);
  }

  async reportProgress(
    userId: string,
    planId: string,
    itemId: string,
    dto: ReportHarvestProgressDto,
  ) {
    const { plan, item } = await this.item(userId, planId, itemId);
    this.assertPlanRunnable(plan);

    if (item.status !== HarvestItemStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Progress can only be recorded for the active offer.',
      );
    }

    const estimatedRemainingMinutes = this.estimateRemainingMinutes(
      item.offerProfile.defaultUnitWagerCents,
      item.offerProfile.estimatedActionsPerMinute,
      dto.operatorReportedRemainingCents,
    );

    await this.repo.updateItem(itemId, {
      operatorReportedRemainingCents: dto.operatorReportedRemainingCents,
      progressEvidenceReference: dto.progressEvidenceReference ?? null,
      progressUpdatedAt: new Date(),
    });

    await this.repo.appendEvent(
      planId,
      HarvestEventType.PROGRESS_REPORTED,
      itemId,
      {
        operatorReportedRemainingCents:
          dto.operatorReportedRemainingCents,
        estimatedRemainingMinutes,
        evidenceReference: dto.progressEvidenceReference ?? null,
      },
    );

    return this.requirePlan(userId, planId);
  }

  async confirmRequirement(
    userId: string,
    planId: string,
    itemId: string,
    dto: ConfirmHarvestRequirementDto,
  ) {
    const { plan, item } = await this.item(userId, planId, itemId);
    this.assertPlanRunnable(plan);

    if (item.status !== HarvestItemStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Only an active offer can be marked complete.',
      );
    }
    if (!dto.operatorConfirmedComplete) {
      throw new BadRequestException(
        'Use the operator progress meter to confirm the requirement is complete.',
      );
    }
    if (item.operatorReportedRemainingCents !== 0) {
      throw new ConflictException(
        'Record operator-reported progress at zero before confirming the requirement complete.',
      );
    }

    await this.repo.updateItem(itemId, {
      status: HarvestItemStatus.REQUIREMENT_MET,
      requirementConfirmedAt: new Date(),
      operatorReportedRemainingCents: 0,
    });

    await this.repo.appendEvent(
      planId,
      HarvestEventType.REQUIREMENT_CONFIRMED,
      itemId,
      { operatorConfirmedComplete: true },
    );

    return this.requirePlan(userId, planId);
  }

  async requestWithdrawal(
    userId: string,
    planId: string,
    itemId: string,
    dto: HarvestAmountDto,
  ) {
    const { plan, item } = await this.item(userId, planId, itemId);
    this.assertSettlementAllowed(plan);

    if (item.status !== HarvestItemStatus.REQUIREMENT_MET) {
      throw new ConflictException(
        'Withdrawal is the next step only after the requirement is confirmed complete.',
      );
    }

    await this.repo.updateItem(itemId, {
      status: HarvestItemStatus.WITHDRAWAL_REQUESTED,
      withdrawalRequestedCents: dto.amountCents,
      withdrawalRequestedAt: new Date(),
    });

    await this.repo.appendEvent(
      planId,
      HarvestEventType.WITHDRAWAL_REQUESTED,
      itemId,
      { amountCents: dto.amountCents },
    );

    return this.requirePlan(userId, planId);
  }

  async confirmWithdrawal(
    userId: string,
    planId: string,
    itemId: string,
    dto: HarvestAmountDto,
  ) {
    const { plan, item } = await this.item(userId, planId, itemId);
    this.assertSettlementAllowed(plan);

    if (item.status !== HarvestItemStatus.WITHDRAWAL_REQUESTED) {
      throw new ConflictException(
        'Confirm withdrawal only after it has been requested.',
      );
    }
    if (
      item.withdrawalRequestedCents === null ||
      dto.amountCents > item.withdrawalRequestedCents
    ) {
      throw new ConflictException(
        'Confirmed receipt cannot exceed the withdrawal amount Aureus recorded as requested.',
      );
    }

    await this.repo.updateItem(itemId, {
      status: HarvestItemStatus.WITHDRAWN,
      withdrawalConfirmedCents: dto.amountCents,
      withdrawnAt: new Date(),
    });
    await this.repo.updatePlan(planId, {
      withdrawnValueCents: { increment: dto.amountCents },
    });

    await this.repo.appendEvent(
      planId,
      HarvestEventType.WITHDRAWAL_CONFIRMED,
      itemId,
      { amountCents: dto.amountCents },
    );

    if (plan.status !== HarvestPlanStatus.STOPPED) {
      await this.completeIfResolved(planId);
    }
    return this.requirePlan(userId, planId);
  }

  async skipItem(
    userId: string,
    planId: string,
    itemId: string,
    dto: SkipHarvestItemDto,
  ) {
    const { plan, item } = await this.item(userId, planId, itemId);
    this.assertPlanRunnable(plan);

    if (
      item.status !== HarvestItemStatus.QUEUED &&
      item.status !== HarvestItemStatus.IN_PROGRESS
    ) {
      throw new ConflictException('This offer can no longer be skipped.');
    }

    await this.repo.updateItem(itemId, {
      status: HarvestItemStatus.SKIPPED,
      skippedAt: new Date(),
      skipReason: dto.reason,
    });

    await this.repo.appendEvent(
      planId,
      HarvestEventType.ITEM_SKIPPED,
      itemId,
      { reason: dto.reason },
    );

    await this.completeIfResolved(planId);
    return this.requirePlan(userId, planId);
  }

  async stopPlan(
    userId: string,
    planId: string,
    dto: StopHarvestPlanDto,
  ) {
    const plan = await this.requirePlan(userId, planId);
    if (
      plan.status === HarvestPlanStatus.COMPLETED ||
      plan.status === HarvestPlanStatus.STOPPED ||
      plan.status === HarvestPlanStatus.CANCELLED
    ) {
      throw new ConflictException('This plan is already closed.');
    }

    const now = new Date();
    await this.repo.stopOpenItems(planId);
    await this.repo.updatePlan(planId, {
      status: HarvestPlanStatus.STOPPED,
      stoppedAt: now,
      stopReason: dto.reason,
    });
    await this.repo.appendEvent(
      planId,
      HarvestEventType.STOP_ENFORCED,
      null,
      { reason: dto.reason },
    );

    return this.requirePlan(userId, planId);
  }

  private sourceSnapshot(
    profile: HarvestProfileWithOpportunity,
    plannedAt: Date,
  ): Prisma.InputJsonValue {
    return {
      opportunityId: profile.opportunity.id,
      opportunityRef: profile.opportunity.opportunityRef,
      title: profile.opportunity.title,
      provider: profile.opportunity.provider,
      officialSourceUrl: profile.opportunity.officialSourceUrl,
      applicationUrl: profile.opportunity.applicationUrl,
      termsSourceUrl: profile.termsSourceUrl,
      termsVerifiedAt: profile.termsVerifiedAt.toISOString(),
      licenseAuthority: profile.licenseAuthority,
      licenseSourceUrl: profile.licenseSourceUrl,
      legalStatus: profile.legalStatus,
      profileVersion: profile.profileVersion,
      executionInstructions: profile.executionInstructions,
      riskNotes: profile.riskNotes,
      plannedAt: plannedAt.toISOString(),
    };
  }

  private estimateRemainingMinutes(
    unitWagerCents: number | null,
    actionsPerMinute: number | null,
    remainingCents: number,
  ): number | null {
    if (remainingCents === 0) return 0;
    if (!unitWagerCents || !actionsPerMinute) return null;

    return Math.ceil(
      remainingCents / (unitWagerCents * actionsPerMinute),
    );
  }

  private isPennsylvaniaGamingControlBoardUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === 'https:' &&
        parsed.hostname === 'gamingcontrolboard.pa.gov'
      );
    } catch {
      return false;
    }
  }

  private assertOfferStillRunnable(
    plan: HarvestPlanWithItems,
    item: HarvestPlanItemWithProfile,
  ) {
    const now = Date.now();
    const profile = item.offerProfile;
    const opportunity = profile.opportunity;
    const snapshot =
      item.sourceSnapshot &&
      typeof item.sourceSnapshot === 'object' &&
      !Array.isArray(item.sourceSnapshot)
        ? (item.sourceSnapshot as Record<string, unknown>)
        : null;

    if (plan.memberAgeYears < profile.minAge) {
      throw new ConflictException(
        'The member does not meet the current minimum age for this offer.',
      );
    }
    if (
      !snapshot ||
      snapshot.profileVersion !== profile.profileVersion
    ) {
      throw new ConflictException(
        'This promotion changed after the plan was built and must be reviewed in a new plan before starting.',
      );
    }

    if (profile.legalStatus !== HarvestLegalStatus.VERIFIED_REGULATED) {
      throw new ConflictException(
        'This offer is no longer approved for harvest execution.',
      );
    }
    if (
      now - profile.termsVerifiedAt.getTime() >= TERMS_MAX_AGE_MS ||
      (profile.expiresAt && profile.expiresAt.getTime() < now)
    ) {
      throw new ConflictException(
        'This offer must be re-reviewed because its terms are stale or expired.',
      );
    }
    if (
      opportunity.status !== OpportunityStatus.ACTIVE ||
      opportunity.verificationStatus !== VerificationStatus.VERIFIED ||
      opportunity.deletedAt !== null ||
      !opportunity.dateLastVerified ||
      now - opportunity.dateLastVerified.getTime() >=
        OPPORTUNITY_MAX_VERIFICATION_AGE_MS ||
      (opportunity.deadline && opportunity.deadline.getTime() < now)
    ) {
      throw new ConflictException(
        'The underlying opportunity is no longer current enough to start.',
      );
    }
  }

  private assertSettlementAllowed(plan: HarvestPlanWithItems) {
    if (
      plan.status !== HarvestPlanStatus.READY &&
      plan.status !== HarvestPlanStatus.ACTIVE &&
      plan.status !== HarvestPlanStatus.STOPPED
    ) {
      throw new ConflictException(
        'This harvest plan cannot accept withdrawal settlement in its current state.',
      );
    }
  }

  private assertPlanRunnable(plan: HarvestPlanWithItems) {
    if (
      plan.status !== HarvestPlanStatus.READY &&
      plan.status !== HarvestPlanStatus.ACTIVE
    ) {
      throw new ConflictException(
        'This harvest plan is not runnable. Stop means stop; resolve review gates or start a future plan instead.',
      );
    }
  }

  private async completeIfResolved(planId: string) {
    const open = await this.repo.countOpenItems(planId);
    if (open === 0) {
      await this.repo.updatePlan(planId, {
        status: HarvestPlanStatus.COMPLETED,
      });
      await this.repo.appendEvent(
        planId,
        HarvestEventType.PLAN_COMPLETED,
        null,
        { reason: 'all_items_resolved' },
      );
    }
  }

  private async requirePlan(userId: string, planId: string) {
    const plan = await this.repo.findPlanByIdForUser(planId, userId);
    if (!plan) throw new NotFoundException('Harvest plan not found.');
    return plan;
  }

  private async item(userId: string, planId: string, itemId: string) {
    const plan = await this.requirePlan(userId, planId);
    const item = plan.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException('Harvest plan item not found.');
    return { plan, item };
  }
}
