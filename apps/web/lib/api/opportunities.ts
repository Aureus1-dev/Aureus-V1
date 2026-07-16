import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/opportunities/dto/*` exactly
 * (FPB-009 §8). Members only ever read — creation/verification is
 * role-gated to Steward/Organization/Business/Admin on the backend.
 */
export type OpportunityCategory =
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'SCHOLARSHIP'
  | 'GRANT'
  | 'GOVERNMENT_BENEFIT'
  | 'HOUSING'
  | 'FINANCIAL_ASSISTANCE'
  | 'BANKING_INCENTIVE'
  | 'CREDIT_BUILDING'
  | 'BUSINESS'
  | 'VOLUNTEER'
  | 'COMMUNITY_PROGRAM'
  | 'HEALTH_WELLNESS'
  | 'OTHER';

export type BenefitType =
  | 'JOB'
  | 'GRANT'
  | 'SCHOLARSHIP'
  | 'LOAN'
  | 'BENEFIT'
  | 'HOUSING'
  | 'CREDIT'
  | 'TRAINING'
  | 'VOLUNTEER'
  | 'COMMUNITY'
  | 'HEALTH'
  | 'OTHER';

export type OpportunityStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
export type VerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ARCHIVED';
export type SourceType = 'ADMIN_ENTRY' | 'ORGANIZATION_SUBMISSION' | 'BUSINESS_SUBMISSION' | 'EXTERNAL_SOURCE';

export interface OpportunityDto {
  id: string;
  opportunityRef: string | null;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: OpportunityCategory;
  tags: string[];
  provider: string;
  officialSourceUrl: string;
  applicationUrl: string | null;
  location: string | null;
  country: string | null;
  state: string | null;
  eligibilityRules: string;
  benefitType: BenefitType;
  benefitAmount: string | null;
  deadline: string | null;
  status: OpportunityStatus;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  confidenceScore: number;
  freshnessScore: number;
  datePublished: string | null;
  dateLastVerified: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceType: SourceType;
  submittedById: string;
  createdById: string;
  lastUpdatedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedOpportunitiesDto {
  data: OpportunityDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListOpportunitiesParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: OpportunityCategory;
  benefitType?: BenefitType;
  location?: string;
  tags?: string[];
  deadlineFilter?: 'afterNow' | 'within7days' | 'within30days';
  sortBy?: 'newest' | 'deadline' | 'confidence' | 'freshness';
  sortOrder?: 'asc' | 'desc';
}

export function listOpportunities(
  accessToken: string,
  params: ListOpportunitiesParams = {},
): Promise<PaginatedOpportunitiesDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.q) query.set('q', params.q);
  if (params.category) query.set('category', params.category);
  if (params.benefitType) query.set('benefitType', params.benefitType);
  if (params.location) query.set('location', params.location);
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  if (params.deadlineFilter) query.set('deadlineFilter', params.deadlineFilter);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedOpportunitiesDto>(`/opportunities${suffix}`, { accessToken });
}

export function getOpportunity(accessToken: string, id: string): Promise<OpportunityDto> {
  return apiRequest<OpportunityDto>(`/opportunities/${id}`, { accessToken });
}
