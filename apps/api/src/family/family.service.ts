import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ParentChildRelationshipStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  GuardianChildRelationshipResponseDto,
  GuardianChildSummaryDto,
} from './dto/guardian-child-relationship-response.dto';

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async proposeRelationship(
    childUserId: string,
    caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto> {
    if (childUserId === caller.id) {
      throw new BadRequestException('A guardian-child relationship requires two different members');
    }

    const child = await this.prisma.db.user.findFirst({
      where: { id: childUserId, status: UserStatus.ACTIVE, deletedAt: null },
      select: { id: true },
    });
    if (!child) throw new NotFoundException('Child member not found');

    const existing = await this.findOpenPair(caller.id, childUserId);
    if (existing) return GuardianChildRelationshipResponseDto.fromEntity(existing);

    try {
      const created = await this.prisma.db.guardianChildRelationship.create({
        data: {
          guardianUserId: caller.id,
          childUserId,
          status: ParentChildRelationshipStatus.PENDING,
          guardianAttestedAt: new Date(),
        },
      });
      return GuardianChildRelationshipResponseDto.fromEntity(created);
    } catch (error) {
      // The database owns the one-open-pair invariant through a partial unique
      // index that intentionally is not represented as a Prisma @@unique.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.findOpenPair(caller.id, childUserId);
        if (winner) return GuardianChildRelationshipResponseDto.fromEntity(winner);
      }
      throw error;
    }
  }

  async listPendingForChild(
    caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto[]> {
    const pending = await this.prisma.db.guardianChildRelationship.findMany({
      where: {
        childUserId: caller.id,
        status: ParentChildRelationshipStatus.PENDING,
        childAssentedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
    return pending.map(GuardianChildRelationshipResponseDto.fromEntity);
  }

  async assentRelationship(
    relationshipId: string,
    caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto> {
    const current = await this.prisma.db.guardianChildRelationship.findUnique({
      where: { id: relationshipId },
    });
    if (!current || current.childUserId !== caller.id) {
      throw new NotFoundException('Guardian-child relationship not found');
    }
    if (current.status === ParentChildRelationshipStatus.REVOKED) {
      throw new ConflictException('A revoked relationship cannot be assented');
    }
    if (current.status === ParentChildRelationshipStatus.ACTIVE) {
      return GuardianChildRelationshipResponseDto.fromEntity(current);
    }

    await this.prisma.db.guardianChildRelationship.updateMany({
      where: {
        id: relationshipId,
        childUserId: caller.id,
        status: ParentChildRelationshipStatus.PENDING,
      },
      data: {
        status: ParentChildRelationshipStatus.ACTIVE,
        childAssentedAt: new Date(),
      },
    });

    const active = await this.prisma.db.guardianChildRelationship.findUniqueOrThrow({
      where: { id: relationshipId },
    });
    return GuardianChildRelationshipResponseDto.fromEntity(active);
  }

  async revokeRelationship(
    relationshipId: string,
    caller: AuthenticatedUser,
  ): Promise<GuardianChildRelationshipResponseDto> {
    const current = await this.prisma.db.guardianChildRelationship.findUnique({
      where: { id: relationshipId },
    });
    if (
      !current ||
      (current.guardianUserId !== caller.id && current.childUserId !== caller.id)
    ) {
      throw new NotFoundException('Guardian-child relationship not found');
    }
    if (current.status === ParentChildRelationshipStatus.REVOKED) {
      return GuardianChildRelationshipResponseDto.fromEntity(current);
    }

    await this.prisma.db.guardianChildRelationship.updateMany({
      where: {
        id: relationshipId,
        status: { not: ParentChildRelationshipStatus.REVOKED },
      },
      data: {
        status: ParentChildRelationshipStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    const revoked = await this.prisma.db.guardianChildRelationship.findUniqueOrThrow({
      where: { id: relationshipId },
    });
    return GuardianChildRelationshipResponseDto.fromEntity(revoked);
  }

  async listChildren(caller: AuthenticatedUser): Promise<GuardianChildSummaryDto[]> {
    const relationships = await this.prisma.db.guardianChildRelationship.findMany({
      where: {
        guardianUserId: caller.id,
        status: ParentChildRelationshipStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
    const childIds = relationships.map((relationship) => relationship.childUserId);
    if (childIds.length === 0) return [];

    const children = await this.prisma.db.user.findMany({
      where: { id: { in: childIds }, status: UserStatus.ACTIVE, deletedAt: null },
      select: { id: true, profile: { select: { displayName: true } } },
    });
    const byId = new Map(children.map((child) => [child.id, child.profile?.displayName ?? null]));

    return relationships
      .filter((relationship) => byId.has(relationship.childUserId))
      .map((relationship) => ({
        relationshipId: relationship.id,
        childUserId: relationship.childUserId,
        displayName: byId.get(relationship.childUserId) ?? null,
      }));
  }

  async requireActiveRelationship(guardianUserId: string, childUserId: string) {
    const relationship = await this.prisma.db.guardianChildRelationship.findFirst({
      where: {
        guardianUserId,
        childUserId,
        status: ParentChildRelationshipStatus.ACTIVE,
        childAssentedAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!relationship) {
      throw new NotFoundException('Active guardian-child relationship not found');
    }
    return relationship;
  }

  private findOpenPair(guardianUserId: string, childUserId: string) {
    return this.prisma.db.guardianChildRelationship.findFirst({
      where: {
        guardianUserId,
        childUserId,
        status: {
          in: [
            ParentChildRelationshipStatus.PENDING,
            ParentChildRelationshipStatus.ACTIVE,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
