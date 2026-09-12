import { OrganizationInvitation, OrganizationMemberRole } from '@prisma/client';

export const ORGANIZATION_INVITATION_REPOSITORY = 'ORGANIZATION_INVITATION_REPOSITORY';

export interface CreateInvitationInput {
  organizationId: string;
  invitedEmail: string;
  role: OrganizationMemberRole;
  invitedById: string;
  expiresAt: Date;
}

export interface IOrganizationInvitationRepository {
  create(data: CreateInvitationInput): Promise<OrganizationInvitation>;
  findById(id: string): Promise<OrganizationInvitation | null>;
  findByOrganization(organizationId: string): Promise<OrganizationInvitation[]>;
  /** Case-insensitive match on invitedEmail, scoped to one organization. */
  findPendingByOrgAndEmail(organizationId: string, email: string): Promise<OrganizationInvitation | null>;
  /** Every invitation currently addressed to this email, across organizations. */
  findPendingByEmail(email: string): Promise<OrganizationInvitation[]>;
  markAccepted(id: string, acceptedByUserId: string): Promise<OrganizationInvitation>;
  markDeclined(id: string): Promise<OrganizationInvitation>;
  markRevoked(id: string, revokedById: string): Promise<OrganizationInvitation>;
  markExpired(id: string): Promise<OrganizationInvitation>;
}
