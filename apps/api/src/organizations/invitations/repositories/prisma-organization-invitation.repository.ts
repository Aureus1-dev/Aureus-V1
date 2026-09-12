import { Injectable } from '@nestjs/common';
import { OrganizationInvitation, OrganizationInvitationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateInvitationInput, IOrganizationInvitationRepository } from './organization-invitation.repository.interface';

@Injectable()
export class PrismaOrganizationInvitationRepository implements IOrganizationInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvitationInput): Promise<OrganizationInvitation> {
    return this.prisma.db.organizationInvitation.create({ data });
  }

  async findById(id: string): Promise<OrganizationInvitation | null> {
    return this.prisma.db.organizationInvitation.findUnique({ where: { id } });
  }

  async findByOrganization(organizationId: string): Promise<OrganizationInvitation[]> {
    return this.prisma.db.organizationInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByOrgAndEmail(organizationId: string, email: string): Promise<OrganizationInvitation | null> {
    return this.prisma.db.organizationInvitation.findFirst({
      where: {
        organizationId,
        status: OrganizationInvitationStatus.PENDING,
        invitedEmail: { equals: email, mode: 'insensitive' },
      },
    });
  }

  async findPendingByEmail(email: string): Promise<OrganizationInvitation[]> {
    return this.prisma.db.organizationInvitation.findMany({
      where: {
        status: OrganizationInvitationStatus.PENDING,
        invitedEmail: { equals: email, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAccepted(id: string, acceptedByUserId: string): Promise<OrganizationInvitation> {
    return this.prisma.db.organizationInvitation.update({
      where: { id },
      data: { status: OrganizationInvitationStatus.ACCEPTED, acceptedAt: new Date(), acceptedByUserId },
    });
  }

  async markDeclined(id: string): Promise<OrganizationInvitation> {
    return this.prisma.db.organizationInvitation.update({
      where: { id },
      data: { status: OrganizationInvitationStatus.DECLINED, declinedAt: new Date() },
    });
  }

  async markRevoked(id: string, revokedById: string): Promise<OrganizationInvitation> {
    return this.prisma.db.organizationInvitation.update({
      where: { id },
      data: { status: OrganizationInvitationStatus.REVOKED, revokedAt: new Date(), revokedById },
    });
  }

  async markExpired(id: string): Promise<OrganizationInvitation> {
    return this.prisma.db.organizationInvitation.update({
      where: { id },
      data: { status: OrganizationInvitationStatus.EXPIRED },
    });
  }
}
