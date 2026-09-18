import {
  StewardshipEndReason,
  StewardshipRelationship,
  StewardshipRelationshipOrigin,
} from '@prisma/client';

export const STEWARDSHIP_OWNERSHIP_REPOSITORY = 'STEWARDSHIP_OWNERSHIP_REPOSITORY';

export type StewardshipOwnershipMode = 'ASSIGN' | 'REASSIGN' | 'ACTIVATE';

export interface StewardshipOwnershipMutationInput {
  mode: StewardshipOwnershipMode;
  memberId: string;
  targetStewardId: string;
  maxActiveMembers: number;
  assignedById: string;
  assignedByOrganizationId?: string;
  origin?: StewardshipRelationshipOrigin;
  expectedCurrentRelationshipId?: string;
  endReason?: StewardshipEndReason;
  pendingRelationshipId?: string;
}

export type StewardshipOwnershipFailureReason =
  | 'TARGET_NOT_FOUND'
  | 'OWNERSHIP_CONFLICT'
  | 'OWNERSHIP_CHANGED'
  | 'CAPACITY_EXCEEDED'
  | 'PENDING_RELATIONSHIP_INVALID';

export type StewardshipOwnershipMutationResult =
  | {
      ok: true;
      relationship: StewardshipRelationship;
      reason?: never;
      activeCount?: never;
      maxActiveMembers?: never;
    }
  | {
      ok: false;
      reason: StewardshipOwnershipFailureReason;
      activeCount?: number;
      maxActiveMembers?: number;
    };

export interface IStewardshipOwnershipRepository {
  mutateActiveOwnership(
    input: StewardshipOwnershipMutationInput,
  ): Promise<StewardshipOwnershipMutationResult>;
}
