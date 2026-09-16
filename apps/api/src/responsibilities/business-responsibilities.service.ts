import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationMemberRole,
  Prisma,
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfirmBusinessResponsibilityCompletionDto,
  CreateBusinessResponsibilityDto,
} from './dto/business-responsibility.dto';
import type { ResponsibilityWithEvents } from './repositories/responsibility.repository.interface';
import { BusinessResponsibilityCommunicationsService } from './business-responsibility-communications.service';

const EVENT_INCLUDE = {
  events: { orderBy: { occurredAt: 'asc' as const } },
};

const WORK_ROLES = new Set<OrganizationMemberRole>([
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
  OrganizationMemberRole.OPERATOR,
]);

const MANAGE_ROLES = new Set<OrganizationMemberRole>([
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
]);

const TERMINAL = new Set<ResponsibilityStatus>([
  ResponsibilityStatus.COMPLETED,
  ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
  ResponsibilityStatus.CANCELLED,
]);

const SECRET_PATTERNS = [
  /password\s*[:=]\s*\S+/i,
  /api[_ -]?key\s*[:=]\s*\S+/i,
  /bearer\s+[A-Za-z0-9._~-]+/i,
  /sk-[A-Za-z0-9_-]{16,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

@Injectable()
export class BusinessResponsibilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communications: BusinessResponsibilityCommunicationsService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateBusinessResponsibilityDto,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityWithEvents> {
    this.assertNoSecrets(dto.objective, dto.promise, dto.criterion);
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dueAt && dueAt.getTime() <= Date.now()) {
      throw new BadRequestException('Responsibility due date must be in the future');
    }

    const responsibility = await this.prisma.db.$transaction(async (tx) => {
      const role = await this.lockCurrentMember(tx, organizationId, caller.id);
      this.assertRole(
        role,
        WORK_ROLES,
        'This organization role cannot accept work for the business',
      );

      // Serialize identical client requests without inventing another durable
      // idempotency table. The request key remains inspectable in the bounded
      // success contract, while the transaction lock prevents double promises.
      const lockKey = `${organizationId}:${dto.requestKey}`;
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
      );

      const existing = await tx.responsibility.findFirst({
        where: {
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
          successCriteria: {
            path: ['requestKey'],
            equals: dto.requestKey,
          },
        },
        include: EVENT_INCLUDE,
      });
      if (existing) return existing;

      const responsibility = await tx.responsibility.create({
        data: {
          kind: ResponsibilityKind.BUSINESS_PROMISE,
          objective: dto.objective.trim(),
          status: ResponsibilityStatus.ACTIVE,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalUserId: null,
          principalOrganizationId: organizationId,
          originConversationId: null,
          originOpportunityId: null,
          successCriteria: {
            type: 'BUSINESS_PROMISE_REPORTED_COMPLETION',
            promise: dto.promise.trim(),
            criterion: dto.criterion.trim(),
            requestKey: dto.requestKey,
            completionEvidence: 'CURRENT_MANAGER_ATTESTATION',
          },
          authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
          authorityPolicyVersion: 'business-responsibility-guidance-v1',
          privacyScope: ResponsibilityPrivacyScope.BUSINESS_PRIVATE,
          privacyPolicyVersion: 'business-private-v1',
          dueAt,
          retentionExpiresAt: null,
        },
      });

      const acceptedAt = new Date();
      const commitmentAt = new Date(acceptedAt.getTime() + 1);
      await tx.responsibilityEvent.createMany({
        data: [
          {
            responsibilityId: responsibility.id,
            type: ResponsibilityEventType.ACCEPTED,
            actorClass: ResponsibilityActorClass.MEMBER,
            actorUserId: caller.id,
            fromStatus: null,
            toStatus: ResponsibilityStatus.ACTIVE,
            occurredAt: acceptedAt,
          },
          {
            responsibilityId: responsibility.id,
            type: ResponsibilityEventType.COMMITMENT_RECORDED,
            actorClass: ResponsibilityActorClass.AUREUS,
            actorUserId: null,
            fromStatus: null,
            toStatus: null,
            occurredAt: commitmentAt,
          },
        ],
      });

      return tx.responsibility.findUniqueOrThrow({
        where: { id: responsibility.id },
        include: EVENT_INCLUDE,
      });
    });
    await this.communications.accepted(responsibility);
    return responsibility;
  }

  async list(
    organizationId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityWithEvents[]> {
    await this.requireCurrentMember(organizationId, caller.id);
    return this.prisma.db.responsibility.findMany({
      where: {
        contextType: ResponsibilityContextType.BUSINESS_TENANT,
        principalOrganizationId: organizationId,
        kind: ResponsibilityKind.BUSINESS_PROMISE,
      },
      include: EVENT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(
    organizationId: string,
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityWithEvents> {
    await this.requireCurrentMember(organizationId, caller.id);
    return this.findBusinessResponsibility(organizationId, responsibilityId);
  }

  async markNeedsYou(
    organizationId: string,
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityWithEvents> {
    const responsibility = await this.prisma.db.$transaction(async (tx) => {
      const role = await this.lockCurrentMember(tx, organizationId, caller.id);
      this.assertRole(
        role,
        WORK_ROLES,
        'This organization role cannot change responsibility state',
      );
      const current = await this.findBusinessResponsibilityTx(tx, organizationId, responsibilityId);

      if (current.status === ResponsibilityStatus.WAITING_ON_USER) return current;
      this.assertNotTerminal(current.status);
      if (current.status !== ResponsibilityStatus.ACTIVE) {
        throw new ConflictException(`Cannot request user input from ${current.status}`);
      }

      const { count } = await tx.responsibility.updateMany({
        where: {
          id: current.id,
          status: ResponsibilityStatus.ACTIVE,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
        },
        data: { status: ResponsibilityStatus.WAITING_ON_USER },
      });
      if (count !== 1)
        throw new ConflictException('Responsibility state changed; retry from the current state');

      await tx.responsibilityEvent.create({
        data: {
          responsibilityId: current.id,
          type: ResponsibilityEventType.USER_INPUT_REQUIRED,
          actorClass: ResponsibilityActorClass.AUREUS,
          actorUserId: null,
          fromStatus: ResponsibilityStatus.ACTIVE,
          toStatus: ResponsibilityStatus.WAITING_ON_USER,
        },
      });
      return tx.responsibility.findUniqueOrThrow({
        where: { id: current.id },
        include: EVENT_INCLUDE,
      });
    });
    await this.communications.needsYou(responsibility);
    return responsibility;
  }

  async resume(
    organizationId: string,
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityWithEvents> {
    return this.prisma.db.$transaction(async (tx) => {
      const role = await this.lockCurrentMember(tx, organizationId, caller.id);
      this.assertRole(
        role,
        WORK_ROLES,
        'This organization role cannot change responsibility state',
      );
      const current = await this.findBusinessResponsibilityTx(tx, organizationId, responsibilityId);

      if (current.status === ResponsibilityStatus.ACTIVE) return current;
      this.assertNotTerminal(current.status);
      if (current.status !== ResponsibilityStatus.WAITING_ON_USER) {
        throw new ConflictException(`Cannot resume responsibility from ${current.status}`);
      }

      const { count } = await tx.responsibility.updateMany({
        where: {
          id: current.id,
          status: ResponsibilityStatus.WAITING_ON_USER,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
        },
        data: { status: ResponsibilityStatus.ACTIVE },
      });
      if (count !== 1)
        throw new ConflictException('Responsibility state changed; retry from the current state');

      await tx.responsibilityEvent.create({
        data: {
          responsibilityId: current.id,
          type: ResponsibilityEventType.STATE_CHANGED,
          actorClass: ResponsibilityActorClass.MEMBER,
          actorUserId: caller.id,
          fromStatus: ResponsibilityStatus.WAITING_ON_USER,
          toStatus: ResponsibilityStatus.ACTIVE,
        },
      });
      return tx.responsibility.findUniqueOrThrow({
        where: { id: current.id },
        include: EVENT_INCLUDE,
      });
    });
  }

  async complete(
    organizationId: string,
    responsibilityId: string,
    dto: ConfirmBusinessResponsibilityCompletionDto,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityWithEvents> {
    if (!dto.confirmed)
      throw new BadRequestException('Completion requires an explicit confirmation');

    const responsibility = await this.prisma.db.$transaction(async (tx) => {
      const role = await this.lockCurrentMember(tx, organizationId, caller.id);
      this.assertRole(role, MANAGE_ROLES, 'Only a current business manager may confirm completion');
      const current = await this.findBusinessResponsibilityTx(tx, organizationId, responsibilityId);

      if (current.status === ResponsibilityStatus.COMPLETED) return current;
      this.assertNotTerminal(current.status);
      if (
        current.status !== ResponsibilityStatus.ACTIVE &&
        current.status !== ResponsibilityStatus.WAITING_ON_USER
      ) {
        throw new ConflictException(`Cannot complete responsibility from ${current.status}`);
      }

      const evidencedAt = new Date();
      const completedAt = new Date(evidencedAt.getTime() + 1);
      const { count } = await tx.responsibility.updateMany({
        where: {
          id: current.id,
          status: current.status,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
        },
        data: { status: ResponsibilityStatus.COMPLETED, completedAt },
      });
      if (count !== 1)
        throw new ConflictException('Responsibility state changed; retry from the current state');

      const evidence = {
        sourceSystem: 'AUREUS_BUSINESS',
        sourceRecordType: 'OrganizationMemberAttestation',
        sourceRecordId: caller.id,
        sourceState: 'MANAGER_CONFIRMED',
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      };
      await tx.responsibilityEvent.createMany({
        data: [
          {
            responsibilityId: current.id,
            type: ResponsibilityEventType.ACTION_EVIDENCED,
            actorClass: ResponsibilityActorClass.SYSTEM,
            actorUserId: null,
            fromStatus: null,
            toStatus: null,
            occurredAt: evidencedAt,
            ...evidence,
          },
          {
            responsibilityId: current.id,
            type: ResponsibilityEventType.COMPLETED,
            actorClass: ResponsibilityActorClass.SYSTEM,
            actorUserId: null,
            fromStatus: current.status,
            toStatus: ResponsibilityStatus.COMPLETED,
            occurredAt: completedAt,
            ...evidence,
          },
        ],
      });

      return tx.responsibility.findUniqueOrThrow({
        where: { id: current.id },
        include: EVENT_INCLUDE,
      });
    });
    await this.communications.completedReported(responsibility);
    return responsibility;
  }

  async cancel(
    organizationId: string,
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityWithEvents> {
    const responsibility = await this.prisma.db.$transaction(async (tx) => {
      const role = await this.lockCurrentMember(tx, organizationId, caller.id);
      this.assertRole(
        role,
        MANAGE_ROLES,
        'Only a current business manager may cancel a responsibility',
      );
      const current = await this.findBusinessResponsibilityTx(tx, organizationId, responsibilityId);

      if (current.status === ResponsibilityStatus.CANCELLED) return current;
      this.assertNotTerminal(current.status);

      const { count } = await tx.responsibility.updateMany({
        where: {
          id: current.id,
          status: current.status,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
        },
        data: { status: ResponsibilityStatus.CANCELLED },
      });
      if (count !== 1)
        throw new ConflictException('Responsibility state changed; retry from the current state');

      await tx.responsibilityEvent.create({
        data: {
          responsibilityId: current.id,
          type: ResponsibilityEventType.CANCELLED,
          actorClass: ResponsibilityActorClass.MEMBER,
          actorUserId: caller.id,
          fromStatus: current.status,
          toStatus: ResponsibilityStatus.CANCELLED,
        },
      });
      return tx.responsibility.findUniqueOrThrow({
        where: { id: current.id },
        include: EVENT_INCLUDE,
      });
    });
    await this.communications.cancelled(responsibility);
    return responsibility;
  }

  private async requireCurrentMember(organizationId: string, userId: string) {
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { organization: { select: { deletedAt: true } } },
    });
    if (!membership || membership.organization.deletedAt) {
      throw new NotFoundException('Business context not found');
    }
    return membership.role;
  }

  private async lockCurrentMember(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRole> {
    const org = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = CAST(${organizationId} AS uuid) AND "deletedAt" IS NULL FOR SHARE`,
    );
    if (org.length !== 1) throw new NotFoundException('Business context not found');

    const membership = await tx.$queryRaw<Array<{ role: OrganizationMemberRole }>>(
      Prisma.sql`SELECT "role" FROM "OrganizationMember" WHERE "organizationId" = CAST(${organizationId} AS uuid) AND "userId" = CAST(${userId} AS uuid) FOR SHARE`,
    );
    if (membership.length !== 1) throw new NotFoundException('Business context not found');
    return membership[0].role;
  }

  private assertRole(
    role: OrganizationMemberRole,
    allowed: Set<OrganizationMemberRole>,
    message: string,
  ) {
    if (!allowed.has(role)) throw new ForbiddenException(message);
  }

  private findBusinessResponsibility(
    organizationId: string,
    responsibilityId: string,
  ): Promise<ResponsibilityWithEvents> {
    return this.prisma.db.responsibility
      .findFirst({
        where: {
          id: responsibilityId,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
        },
        include: EVENT_INCLUDE,
      })
      .then((record) => {
        if (!record) throw new NotFoundException('Responsibility not found');
        return record;
      });
  }

  private async findBusinessResponsibilityTx(
    tx: Prisma.TransactionClient,
    organizationId: string,
    responsibilityId: string,
  ): Promise<ResponsibilityWithEvents> {
    const record = await tx.responsibility.findFirst({
      where: {
        id: responsibilityId,
        contextType: ResponsibilityContextType.BUSINESS_TENANT,
        principalOrganizationId: organizationId,
        kind: ResponsibilityKind.BUSINESS_PROMISE,
      },
      include: EVENT_INCLUDE,
    });
    if (!record) throw new NotFoundException('Responsibility not found');
    return record;
  }

  private assertNotTerminal(status: ResponsibilityStatus) {
    if (TERMINAL.has(status)) {
      throw new ConflictException(`Responsibility is terminal in state ${status}`);
    }
  }

  private assertNoSecrets(...values: string[]) {
    for (const value of values) {
      if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
        throw new BadRequestException(
          'Do not put passwords, tokens, API keys, or other secret material in responsibilities',
        );
      }
    }
  }
}
