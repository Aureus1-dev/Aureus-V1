import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/resources/dto/*` exactly (FPB-009 §8).
 * Members only ever read — creation/verification is role-gated to
 * Steward/Organization/Business/Admin on the backend.
 */
export type ResourceCategory =
  | 'GOVERNMENT_AGENCY' | 'NONPROFIT_ORGANIZATION' | 'COMMUNITY_ORGANIZATION' | 'EDUCATIONAL_INSTITUTION'
  | 'HEALTHCARE_PROVIDER' | 'FINANCIAL_SERVICES' | 'LEGAL_SERVICES' | 'HOUSING_RESOURCES'
  | 'EMPLOYMENT_SERVICES' | 'BUSINESS_SUPPORT' | 'TECHNOLOGY_TOOLS' | 'MENTAL_HEALTH_WELLNESS' | 'OTHER';

export type ResourceType = 'ORGANIZATION' | 'PROGRAM' | 'SERVICE' | 'PROFESSIONAL' | 'TOOL' | 'COMMUNITY_RESOURCE' | 'OTHER';
export type ResourceStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type VerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ARCHIVED';
export type SourceType = 'ADMIN_ENTRY' | 'ORGANIZATION_SUBMISSION' | 'BUSINESS_SUBMISSION' | 'EXTERNAL_SOURCE';

export interface ResourceDto {
  id: string;
  resourceRef: string | null;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: ResourceCategory;
  resourceType: ResourceType;
  tags: string[];
  organizationName: string;
  officialSourceUrl: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  isRemote: boolean;
  eligibilityNotes: string | null;
  status: ResourceStatus;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  confidenceScore: number;
  freshnessScore: number;
  datePublished: string | null;
  dateLastVerified: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceType: SourceType;
  ownerId: string;
  submittedById: string;
  createdById: string;
  lastUpdatedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedResourcesDto {
  data: ResourceDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListResourcesParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: ResourceCategory;
  resourceType?: ResourceType;
  location?: string;
  isRemote?: boolean;
  tags?: string[];
  sortBy?: 'newest' | 'confidence' | 'freshness' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

export function listResources(accessToken: string, params: ListResourcesParams = {}): Promise<PaginatedResourcesDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.q) query.set('q', params.q);
  if (params.category) query.set('category', params.category);
  if (params.resourceType) query.set('resourceType', params.resourceType);
  if (params.location) query.set('location', params.location);
  if (params.isRemote !== undefined) query.set('isRemote', String(params.isRemote));
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedResourcesDto>(`/resources${suffix}`, { accessToken });
}

export function getResource(accessToken: string, id: string): Promise<ResourceDto> {
  return apiRequest<ResourceDto>(`/resources/${id}`, { accessToken });
}
