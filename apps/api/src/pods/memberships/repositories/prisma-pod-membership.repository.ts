import { Injectable } from '@nestjs/common';
import { PodMemberRole, PodMembership, PodMembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateMembershipInput,
  IPodMembershipRepository,
  MembershipQueryParams,
  PaginatedMemberships,
  UpdateMembershipInput,
} from './pod-membership.repository.interface';

@Injectable()
export class PrismaPodMembershipRepository implements IPodMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMembershipInput): Promise<PodMembership> {
    return this.prisma.db.podMembership.create({ data });
  }

  async findById(id: string): Promise<PodMembership | null> {
    return this.prisma.db.podMembership.findUnique({ where: { id } });
  }

  async findAll(params: MembershipQueryParams): Promise<PaginatedMemberships> {
    const { page, limit, podId, userId, status, role } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.PodMembershipWhereInput = {
      ...(podId && { podId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(role && { role }),
    };
    const [data, total] = await Promise.all([
      this.prisma.db.podMembership.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.podMembership.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findActiveForPodAndUser(podId: string, userId: string): Promise<PodMembership | null> {
    return this.prisma.db.podMembership.findFirst({ where: { podId, userId, status: PodMembershipStatus.ACTIVE } });
  }

  async findPendingForPodAndUser(podId: string, userId: string): Promise<PodMembership | null> {
    return this.prisma.db.podMembership.findFirst({ where: { podId, userId, status: PodMembershipStatus.PENDING } });
  }

  async findActiveStewardsForPod(podId: string): Promise<PodMembership[]> {
    return this.prisma.db.podMembership.findMany({
      where: { podId, status: PodMembershipStatus.ACTIVE, role: PodMemberRole.STEWARD },
    });
  }

  async isActiveMember(podId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.db.podMembership.count({ where: { podId, userId, status: PodMembershipStatus.ACTIVE } });
    return count > 0;
  }

  async isActiveSteward(podId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.db.podMembership.count({
      where: { podId, userId, status: PodMembershipStatus.ACTIVE, role: PodMemberRole.STEWARD },
    });
    return count > 0;
  }

  async countActiveForPod(podId: string): Promise<number> {
    return this.prisma.db.podMembership.count({ where: { podId, status: PodMembershipStatus.ACTIVE } });
  }

  async update(id: string, data: UpdateMembershipInput): Promise<PodMembership> {
    return this.prisma.db.podMembership.update({ where: { id }, data });
  }
}
