import {
  StewardshipRelationship,
  StewardshipRelationshipOrigin,
  StewardshipRelationshipStatus,
  StewardshipEndReason,
} from '@prisma/client';

export const STEWARDSHIP_RELATIONSHIP_REPOSITORY = 'STEWARDSHIP_RELATIONSHIP_REPOSITORY';

export interface CreateRelationshipInput {
  memberId: string;
  stewardId?: string;
  origin: StewardshipRelationshipOrigin;
  status: StewardshipRelationshipStatus;
  requestedById?: string;
  assignedById?: string;
  assignedByOrganizationId?: string;
  recommendedById?: string;
  activatedAt?: Date;
}

export interface UpdateRelationshipInput {
  stewardId?: string;
  status?: StewardshipRelationshipStatus;
  assignedById?: string;
  assignedByOrganizationId?: string;
  activatedAt?: Date;
  endReason?: StewardshipEndReason;
  endedById?: string;
  endedAt?: Date;
}

export interface RelationshipQueryParams {
  page: number;
  limit: number;
  memberId?: string;
  stewardId?: string;
  status?: StewardshipRelationshipStatus;
}

export interface PaginatedRelationships {
  data: StewardshipRelationship[];
  total: number;
  page: number;
  limit: number;
}

export interface IStewardshipRelationshipRepository {
  create(data: CreateRelationshipInput): Promise<StewardshipRelationship>;
  findById(id: string): Promise<StewardshipRelationship | null>;
  findAll(params: RelationshipQueryParams): Promise<PaginatedRelationships>;
  countActiveByStewardId(stewardId: string): Promise<number>;
  update(id: string, data: UpdateRelationshipInput): Promise<StewardshipRelationship>;
}
