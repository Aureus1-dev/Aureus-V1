import { Injectable } from '@nestjs/common';
import {
  HarvestEventType,
  HarvestItemStatus,
  HarvestLegalStatus,
  HarvestOfferProfile,
  HarvestPlan,
  HarvestPlanItem,
  OpportunityStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  HarvestPlanCreate,
  HarvestPlanWithItems,
  HarvestProfileWithOpportunity,
  HarvestProfileWrite,
  IHarvestRepository,
} from './harvest.repository.interface';

const planInclude = {
  items: {
    orderBy: { position: 'asc' as const },
    include: { offerProfile: { include: { opportunity: true } } },
  },
} satisfies Prisma.HarvestPlanInclude;

@Injectable()
export class PrismaHarvestRepository implements IHarvestRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertProfile(
    opportunityId: string,
    data: HarvestProfileWrite,
  ): Promise<HarvestOfferProfile> {
    const { createdById, ...updates } = data;
    return this.prisma.db.harvestOfferProfile.upsert({
      where: { opportunityId },
      create: { opportunityId, ...data },
      update: { ...updates, profileVersion: { increment: 1 } },
    });
  }

  listEligibleProfiles(
    state: string,
    country: string,
    verifiedAfter: Date,
    now: Date,
  ): Promise<HarvestProfileWithOpportunity[]> {
    return this.prisma.db.harvestOfferProfile.findMany({
      where: {
        jurisdictionState: state,
        jurisdictionCountry: country,
        legalStatus: HarvestLegalStatus.VERIFIED_REGULATED,
        termsVerifiedAt: { gte: verifiedAfter },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          {
            opportunity: {
              status: OpportunityStatus.ACTIVE,
              verificationStatus: VerificationStatus.VERIFIED,
              deletedAt: null,
              OR: [{ deadline: null }, { deadline: { gte: now } }],
            },
          },
        ],
      },
      include: { opportunity: true },
    });
  }

  listProfilesForReview(
    staleBefore: Date,
    opportunityStaleBefore: Date,
    now: Date,
  ): Promise<HarvestProfileWithOpportunity[]> {
    return this.prisma.db.harvestOfferProfile.findMany({
      where: {
        OR: [
          { legalStatus: { not: HarvestLegalStatus.VERIFIED_REGULATED } },
          { termsVerifiedAt: { lt: staleBefore } },
          { expiresAt: { lt: now } },
          {
            opportunity: {
              OR: [
                { status: { not: OpportunityStatus.ACTIVE } },
                { verificationStatus: { not: VerificationStatus.VERIFIED } },
                { deletedAt: { not: null } },
                { dateLastVerified: null },
                { dateLastVerified: { lt: opportunityStaleBefore } },
                { deadline: { lt: now } },
              ],
            },
          },
        ],
      },
      include: { opportunity: true },
      orderBy: { updatedAt: 'asc' },
    });
  }

  createPlan(data: HarvestPlanCreate): Promise<HarvestPlanWithItems> {
    return this.prisma.db.harvestPlan.create({
      data: {
        ...data.plan,
        items: { create: data.items },
      },
      include: planInclude,
    });
  }

  findPlanForUser(
    userId: string,
    taxYear: number,
  ): Promise<HarvestPlanWithItems | null> {
    return this.prisma.db.harvestPlan.findUnique({
      where: { userId_taxYear: { userId, taxYear } },
      include: planInclude,
    });
  }

  findPlanByIdForUser(
    planId: string,
    userId: string,
  ): Promise<HarvestPlanWithItems | null> {
    return this.prisma.db.harvestPlan.findFirst({
      where: { id: planId, userId },
      include: planInclude,
    });
  }

  updatePlan(
    planId: string,
    data: Prisma.HarvestPlanUncheckedUpdateInput,
  ): Promise<HarvestPlan> {
    return this.prisma.db.harvestPlan.update({ where: { id: planId }, data });
  }

  updateItem(
    itemId: string,
    data: Prisma.HarvestPlanItemUncheckedUpdateInput,
  ): Promise<HarvestPlanItem> {
    return this.prisma.db.harvestPlanItem.update({
      where: { id: itemId },
      data,
    });
  }

  async appendEvent(
    planId: string,
    type: HarvestEventType,
    itemId: string | null,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.db.harvestEvent.create({
      data: { planId, type, itemId, metadata },
    });
  }

  async stopOpenItems(planId: string): Promise<void> {
    await this.prisma.db.harvestPlanItem.updateMany({
      where: {
        planId,
        status: {
          in: [HarvestItemStatus.QUEUED, HarvestItemStatus.IN_PROGRESS],
        },
      },
      data: { status: HarvestItemStatus.STOPPED },
    });
  }

  countOpenItems(planId: string): Promise<number> {
    return this.prisma.db.harvestPlanItem.count({
      where: {
        planId,
        status: {
          notIn: [
            HarvestItemStatus.WITHDRAWN,
            HarvestItemStatus.SKIPPED,
            HarvestItemStatus.STOPPED,
          ],
        },
      },
    });
  }
}
