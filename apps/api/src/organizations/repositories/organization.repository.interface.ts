import {
  Organization,
  OrganizationStatus,
  OrganizationType,
  VerificationStatus,
} from '@prisma/client';

export const ORGANIZATION_REPOSITORY = 'ORGANIZATION_REPOSITORY';

export interface CreateOrganizationInput {
  name: string;
  shortDescription: string;
  fullDescription: string;
  organizationType: OrganizationType;
  websiteUrl: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  createdById: string;
  lastUpdatedById: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  shortDescription?: string;
  fullDescription?: string;
  organizationType?: OrganizationType;
  websiteUrl?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  status?: OrganizationStatus;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string | null;
  datePublished?: Date;
  dateLastVerified?: Date;
  lastUpdatedById?: string;
}

export type SortField = 'newest' | 'alphabetical';

export interface OrganizationQueryParams {
  page: number;
  limit: number;
  q?: string;
  organizationType?: OrganizationType;
  country?: string;
  state?: string;
  city?: string;
  status?: OrganizationStatus;
  verificationStatus?: VerificationStatus;
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedOrganizations {
  data: Organization[];
  total: number;
  page: number;
  limit: number;
}

export interface IOrganizationRepository {
  create(data: CreateOrganizationInput): Promise<Organization>;
  setRef(id: string, organizationRef: string): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findByRef(organizationRef: string): Promise<Organization | null>;
  findAll(params: OrganizationQueryParams): Promise<PaginatedOrganizations>;
  update(id: string, data: UpdateOrganizationInput): Promise<Organization>;
  softDelete(id: string): Promise<Organization>;
}
