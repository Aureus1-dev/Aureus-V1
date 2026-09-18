import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StewardshipRelationshipOrigin,
  StewardshipRelationshipStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IStewardshipOwnershipRepository,
  StewardshipOwnershipMutationInput,
  StewardshipOwnershipMutationResult,
} from './stewardship-ownership.repository.interface';

@Injectable()
export class PrismaStewardshipOwnershipRepository implements IStewardshipOwnershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async mutateActiveOwnership(
    input: StewardshipOwnershipMutationInput,
  ): Promise<StewardshipOwnershipMutationResult> {
    return this.prisma.db.$transaction(async (tx) => {
      // Every ACTIVE ownership mutation locks the same member + target-steward
      // User rows, so legacy relationship endpoints and People Step 4 serialize
      // against each other instead of creating contradictory owners/caseload.
      const locked = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT "id" FROM "User" WHERE "id" IN (${input.memberId}::uuid, ${input.targetStewardId}::uuid) ORDER BY "id" FOR UPDATE`,
      );
      if (!locked.some((row) => row.id === input.targetStewardId)) {
        return { ok: false, reason: 'TARGET_NOT_FOUND' };
      }

      const activeRelationships = await tx.stewardshipRelationship.findMany({
        where: {
          memberId: input.memberId,
          status: StewardshipRelationshipStatus.ACTIVE,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (activeRelationships.length > 1) {
        return { ok: false, reason: 'OWNERSHIP_CONFLICT' };
      }

      const current = activeRelationships[0] ?? null;
      if (input.mode === 'ASSIGN' && current) {
        return { ok: false, reason: 'OWNERSHIP_CONFLICT' };
      }
      if (input.mode === 'REASSIGN') {
        if (!current || current.id !== input.expectedCurrentRelationshipId) {
          return { ok: false, reason: 'OWNERSHIP_CHANGED' };
        }
      }
      if (input.mode === 'ACTIVATE' && current) {
        return { ok: false, reason: 'OWNERSHIP_CONFLICT' };
      }

      const activeCount = await tx.stewardshipRelationship.count({
        where: {
          stewardId: input.targetStewardId,
          status: StewardshipRelationshipStatus.ACTIVE,
        },
      });
      if (activeCount >= input.maxActiveMembers) {
        return {
          ok: false,
          reason: 'CAPACITY_EXCEEDED',
          activeCount,
          maxActiveMembers: input.maxActiveMembers,
        };
      }

      const now = new Date();

      if (input.mode === 'REASSIGN') {
        if (!input.endReason || !current || !input.origin) {
          return { ok: false, reason: 'OWNERSHIP_CHANGED' };
        }
        await tx.stewardshipRelationship.update({
          where: { id: current.id },
          data: {
            status: StewardshipRelationshipStatus.ENDED,
            endReason: input.endReason,
            endedById: input.assignedById,
            endedAt: now,
          },
        });
      }

      if (input.mode === 'ACTIVATE') {
        if (!input.pendingRelationshipId) {
          return { ok: false, reason: 'PENDING_RELATIONSHIP_INVALID' };
        }
        const pending = await tx.stewardshipRelationship.findUnique({
          where: { id: input.pendingRelationshipId },
        });
        if (
          !pending ||
          pending.memberId !== input.memberId ||
          pending.status !== StewardshipRelationshipStatus.PENDING
        ) {
          return { ok: false, reason: 'PENDING_RELATIONSHIP_INVALID' };
        }
        const relationship = await tx.stewardshipRelationship.update({
          where: { id: pending.id },
          data: {
            stewardId: input.targetStewardId,
            status: StewardshipRelationshipStatus.ACTIVE,
            assignedById: input.assignedById,
            assignedByOrganizationId: input.assignedByOrganizationId,
            activatedAt: now,
          },
        });
        return { ok: true, relationship };
      }

      if (!input.origin) {
        return { ok: false, reason: 'OWNERSHIP_CHANGED' };
      }
      const relationship = await tx.stewardshipRelationship.create({
        data: {
          memberId: input.memberId,
          stewardId: input.targetStewardId,
          origin: input.origin ?? StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
          status: StewardshipRelationshipStatus.ACTIVE,
          assignedById: input.assignedById,
          assignedByOrganizationId: input.assignedByOrganizationId,
          activatedAt: now,
        },
      });
      return { ok: true, relationship };
    });
  }
}
