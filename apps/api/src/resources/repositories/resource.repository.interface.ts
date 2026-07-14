import {
  Resource,
  ResourceCategory,
  ResourceStatus,
  ResourceType,
  SourceType,
  VerificationStatus,
} from '@prisma/client';

export const RESOURCE_REPOSITORY = 'RESOURCE_REPOSITORY';

export interface CreateResourceInput {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: ResourceCategory;
  resourceType: ResourceType;
  tags?: string[];
  organizationName: string;
  officialSourceUrl: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  isRemote?: boolean;
  eligibilityNotes?: string;
  sourceName: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  ownerId: string;
  submittedById: string;
  createdById: string;
  lastUpdatedById: string;
  confidenceScore?: number;
  freshnessScore?: number;
}

export interface UpdateResourceInput {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  category?: ResourceCategory;
  resourceType?: ResourceType;
  tags?: string[];
  organizationName?: string;
  officialSourceUrl?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  isRemote?: boolean;
  eligibilityNotes?: string | null;
  status?: ResourceStatus;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string | null;
  confidenceScore?: number;
  freshnessScore?: number;
  datePublished?: Date;
  dateLastVerified?: Date;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  lastUpdatedById?: string;
}

export type SortField = 'newest' | 'confidence' | 'freshness' | 'alphabetical';

export interface ResourceQueryParams {
  page: number;
  limit: number;
  q?: string;
  category?: ResourceCategory;
  resourceType?: ResourceType;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  isRemote?: boolean;
  tags?: string[];
  status?: ResourceStatus;
  verificationStatus?: VerificationStatus;
  ownerId?: string;
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResources {
  data: Resource[];
  total: number;
  page: number;
  limit: number;
}

export interface IResourceRepository {
  create(data: CreateResourceInput): Promise<Resource>;
  setRef(id: string, resourceRef: string): Promise<Resource>;
  findById(id: string): Promise<Resource | null>;
  findByRef(resourceRef: string): Promise<Resource | null>;
  findAll(params: ResourceQueryParams): Promise<PaginatedResources>;
  update(id: string, data: UpdateResourceInput): Promise<Resource>;
  softDelete(id: string): Promise<Resource>;
}
