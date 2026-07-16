import { PodMemberRole, PodMembership, PodMembershipOrigin, PodMembershipStatus } from '@prisma/client';

export const POD_MEMBERSHIP_REPOSITORY = 'POD_MEMBERSHIP_REPOSITORY';

export interface CreateMembershipInput {
  podId: string;
  userId: string;
  role?: PodMemberRole;
  status?: PodMembershipStatus;
  origin: PodMembershipOrigin;
  invitedById?: string;
  joinedAt?: Date;
}

export interface UpdateMembershipInput {
  role?: PodMemberRole;
  status?: PodMembershipStatus;
  joinedAt?: Date | null;
  endedAt?: Date | null;
  endReason?: string | null;
}

export interface MembershipQueryParams {
  page: number;
  limit: number;
  podId?: string;
  userId?: string;
  status?: PodMembershipStatus;
  role?: PodMemberRole;
}

export interface PaginatedMemberships {
  data: PodMembership[];
  total: number;
  page: number;
  limit: number;
}

export interface IPodMembershipRepository {
  create(data: CreateMembershipInput): Promise<PodMembership>;
  findById(id: string): Promise<PodMembership | null>;
  findAll(params: MembershipQueryParams): Promise<PaginatedMemberships>;
  findActiveForPodAndUser(podId: string, userId: string): Promise<PodMembership | null>;
  findPendingForPodAndUser(podId: string, userId: string): Promise<PodMembership | null>;
  findActiveStewardsForPod(podId: string): Promise<PodMembership[]>;
  isActiveMember(podId: string, userId: string): Promise<boolean>;
  isActiveSteward(podId: string, userId: string): Promise<boolean>;
  countActiveForPod(podId: string): Promise<number>;
  update(id: string, data: UpdateMembershipInput): Promise<PodMembership>;
}
