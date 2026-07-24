import { apiRequest } from './http';

/** Mirrors `apps/api/src/needs/dto/stated-need-response.dto.ts` exactly. */
export interface StatedNeedDto {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
}

/** Mirrors `apps/api/src/needs/dto/matched-resource.dto.ts` exactly (Gate C — C4/C5). */
export interface MatchedResourceDto {
  id: string;
  citySheetRef: string | null;
  organizationName: string;
  category: string;
  description: string;
  address: string | null;
  serviceArea: string;
  phone: string | null;
  website: string | null;
  hours: string;
  eligibilityRequirements: string | null;
  languagesSupported: string[];
  accessibilityNotes: string | null;
  cost: string | null;
  requiredDocuments: string[];
  referralRequired: boolean;
  isEmergencyService: boolean;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  isTestFixture: boolean;
}

export type ResourceOfferResponseValue = 'PENDING' | 'ACCEPTED' | 'DECLINED';

/** Mirrors `apps/api/src/needs/dto/resource-offer-response.dto.ts` exactly (Gate C — C5). */
export interface ResourceOfferDto {
  id: string;
  statedNeedId: string;
  citySheetEntryId: string;
  response: ResourceOfferResponseValue;
  offeredAt: string;
  respondedAt: string | null;
}

export function getMyNeeds(accessToken: string): Promise<StatedNeedDto[]> {
  return apiRequest<StatedNeedDto[]>('/needs', { accessToken });
}

export function getMatchingResources(accessToken: string, needId: string): Promise<MatchedResourceDto[]> {
  return apiRequest<MatchedResourceDto[]>(`/needs/${needId}/resources`, { accessToken });
}

export function offerResource(accessToken: string, needId: string, citySheetEntryId: string): Promise<ResourceOfferDto> {
  return apiRequest<ResourceOfferDto>(`/needs/${needId}/resources/${citySheetEntryId}/offer`, {
    method: 'POST',
    accessToken,
  });
}

export function respondToOffer(
  accessToken: string, needId: string, citySheetEntryId: string, accepted: boolean,
): Promise<ResourceOfferDto> {
  return apiRequest<ResourceOfferDto>(`/needs/${needId}/resources/${citySheetEntryId}/respond`, {
    method: 'POST',
    accessToken,
    body: { accepted },
  });
}

export function getOffers(accessToken: string, needId: string): Promise<ResourceOfferDto[]> {
  return apiRequest<ResourceOfferDto[]>(`/needs/${needId}/offers`, { accessToken });
}
