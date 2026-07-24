import { Injectable } from '@nestjs/common';
import { ResourceOffer, ResourceOfferResponse } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResourceOfferInput, IResourceOfferRepository } from './resource-offer.repository.interface';

@Injectable()
export class PrismaResourceOfferRepository implements IResourceOfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateResourceOfferInput): Promise<ResourceOffer> {
    return this.prisma.db.resourceOffer.create({ data });
  }

  async findMostRecentPending(statedNeedId: string, citySheetEntryId: string): Promise<ResourceOffer | null> {
    return this.prisma.db.resourceOffer.findFirst({
      where: { statedNeedId, citySheetEntryId, response: ResourceOfferResponse.PENDING },
      orderBy: { offeredAt: 'desc' },
    });
  }

  async respond(id: string, accepted: boolean): Promise<ResourceOffer> {
    return this.prisma.db.resourceOffer.update({
      where: { id },
      data: {
        response: accepted ? ResourceOfferResponse.ACCEPTED : ResourceOfferResponse.DECLINED,
        respondedAt: new Date(),
      },
    });
  }

  async findAllByStatedNeed(statedNeedId: string): Promise<ResourceOffer[]> {
    return this.prisma.db.resourceOffer.findMany({
      where: { statedNeedId },
      orderBy: { offeredAt: 'desc' },
    });
  }
}
