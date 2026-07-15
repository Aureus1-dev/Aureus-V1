import { OrganizationMember, OrganizationMemberRole } from '@prisma/client';

export const ORGANIZATION_MEMBER_REPOSITORY = 'ORGANIZATION_MEMBER_REPOSITORY';

export interface AddMemberInput {
  organizationId: string;
  userId: string;
  role?: OrganizationMemberRole;
}

export interface IOrganizationMemberRepository {
  add(data: AddMemberInput): Promise<OrganizationMember>;
  findByOrgAndUser(organizationId: string, userId: string): Promise<OrganizationMember | null>;
  findByOrganization(organizationId: string): Promise<OrganizationMember[]>;
  /** All organizations a user represents — used by Communication System audience/isolation checks (ADR-012). */
  findByUser(userId: string): Promise<OrganizationMember[]>;
  countAdmins(organizationId: string): Promise<number>;
  updateRole(organizationId: string, userId: string, role: OrganizationMemberRole): Promise<OrganizationMember>;
  remove(organizationId: string, userId: string): Promise<void>;
}
