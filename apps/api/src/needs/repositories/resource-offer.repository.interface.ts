import { ResourceOffer } from '@prisma/client';

export const RESOURCE_OFFER_REPOSITORY = 'RESOURCE_OFFER_REPOSITORY';

export interface CreateResourceOfferInput {
  userId: string;
  statedNeedId: string;
  citySheetEntryId: string;
}

export interface IResourceOfferRepository {
  create(data: CreateResourceOfferInput): Promise<ResourceOffer>;
  findMostRecentPending(statedNeedId: string, citySheetEntryId: string): Promise<ResourceOffer | null>;
  respond(id: string, accepted: boolean): Promise<ResourceOffer>;
  findAllByStatedNeed(statedNeedId: string): Promise<ResourceOffer[]>;
}
