import { Injectable } from '@nestjs/common';
import { PodInvitation, PodInvitationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateInvitationInput, IPodInvitationRepository } from './pod-invitation.repository.interface';

@Injectable()
export class PrismaPodInvitationRepository implements IPodInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvitationInput): Promise<PodInvitation> {
    return this.prisma.db.podInvitation.create({ data });
  }

  async findById(id: string): Promise<PodInvitation | null> {
    return this.prisma.db.podInvitation.findUnique({ where: { id } });
  }

  async findForInvitee(userId: string): Promise<PodInvitation[]> {
    return this.prisma.db.podInvitation.findMany({ where: { invitedUserId: userId }, orderBy: { createdAt: 'desc' } });
  }

  async findPendingForPodAndUser(podId: string, invitedUserId: string): Promise<PodInvitation | null> {
    return this.prisma.db.podInvitation.findFirst({ where: { podId, invitedUserId, status: PodInvitationStatus.PENDING } });
  }

  async update(id: string, data: { status: PodInvitationStatus; respondedAt?: Date }): Promise<PodInvitation> {
    return this.prisma.db.podInvitation.update({ where: { id }, data });
  }
}
