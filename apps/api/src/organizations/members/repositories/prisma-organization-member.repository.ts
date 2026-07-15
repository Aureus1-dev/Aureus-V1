import { Injectable } from '@nestjs/common';
import { OrganizationMember, OrganizationMemberRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddMemberInput, IOrganizationMemberRepository } from './organization-member.repository.interface';

@Injectable()
export class PrismaOrganizationMemberRepository implements IOrganizationMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(data: AddMemberInput): Promise<OrganizationMember> {
    return this.prisma.db.organizationMember.create({ data });
  }

  async findByOrgAndUser(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
  }

  async findByOrganization(organizationId: string): Promise<OrganizationMember[]> {
    return this.prisma.db.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countAdmins(organizationId: string): Promise<number> {
    return this.prisma.db.organizationMember.count({
      where: { organizationId, role: OrganizationMemberRole.ADMIN },
    });
  }

  async updateRole(
    organizationId: string, userId: string, role: OrganizationMemberRole,
  ): Promise<OrganizationMember> {
    return this.prisma.db.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId } },
      data: { role },
    });
  }

  async remove(organizationId: string, userId: string): Promise<void> {
    await this.prisma.db.organizationMember.delete({
      where: { organizationId_userId: { organizationId, userId } },
    });
  }
}
