import {
  BenefitType,
  Opportunity,
  OpportunityCategory,
  OpportunityStatus,
  SourceType,
  VerificationStatus,
} from '@prisma/client';

export const OPPORTUNITY_REPOSITORY = 'OPPORTUNITY_REPOSITORY';

export interface CreateOpportunityInput {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: OpportunityCategory;
  tags?: string[];
  provider: string;
  officialSourceUrl: string;
  applicationUrl?: string;
  location?: string;
  country?: string;
  state?: string;
  eligibilityRules: string;
  benefitType: BenefitType;
  benefitAmount?: string;
  deadline?: Date;
  sourceName: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  submittedById: string;
  createdById: string;
  lastUpdatedById: string;
  confidenceScore?: number;
  freshnessScore?: number;
}

export interface UpdateOpportunityInput {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  category?: OpportunityCategory;
  tags?: string[];
  provider?: string;
  officialSourceUrl?: string;
  applicationUrl?: string;
  location?: string;
  country?: string;
  state?: string;
  eligibilityRules?: string;
  benefitType?: BenefitType;
  benefitAmount?: string;
  deadline?: Date;
  status?: OpportunityStatus;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string;
  confidenceScore?: number;
  freshnessScore?: number;
  datePublished?: Date;
  dateLastVerified?: Date;
  lastUpdatedById?: string;
}

export type SortField = 'newest' | 'deadline' | 'confidence' | 'freshness';

export interface OpportunityQueryParams {
  page: number;
  limit: number;
  q?: string;
  category?: OpportunityCategory;
  benefitType?: BenefitType;
  location?: string;
  country?: string;
  state?: string;
  tags?: string[];
  status?: OpportunityStatus;
  verificationStatus?: VerificationStatus;
  deadlineFilter?: 'afterNow' | 'within7days' | 'within30days';
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedOpportunities {
  data: Opportunity[];
  total: number;
  page: number;
  limit: number;
}

export interface IOpportunityRepository {
  create(data: CreateOpportunityInput): Promise<Opportunity>;
  setRef(id: string, opportunityRef: string): Promise<Opportunity>;
  findById(id: string): Promise<Opportunity | null>;
  findByRef(opportunityRef: string): Promise<Opportunity | null>;
  findAll(params: OpportunityQueryParams): Promise<PaginatedOpportunities>;
  update(id: string, data: UpdateOpportunityInput): Promise<Opportunity>;
  softDelete(id: string): Promise<Opportunity>;
}
