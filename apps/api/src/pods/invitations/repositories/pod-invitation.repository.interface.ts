import { PodInvitation, PodInvitationStatus } from '@prisma/client';

export const POD_INVITATION_REPOSITORY = 'POD_INVITATION_REPOSITORY';

export interface CreateInvitationInput {
  podId: string;
  invitedUserId: string;
  invitedById: string;
  message?: string;
}

export interface IPodInvitationRepository {
  create(data: CreateInvitationInput): Promise<PodInvitation>;
  findById(id: string): Promise<PodInvitation | null>;
  findForInvitee(userId: string): Promise<PodInvitation[]>;
  findPendingForPodAndUser(podId: string, invitedUserId: string): Promise<PodInvitation | null>;
  update(id: string, data: { status: PodInvitationStatus; respondedAt?: Date }): Promise<PodInvitation>;
}
