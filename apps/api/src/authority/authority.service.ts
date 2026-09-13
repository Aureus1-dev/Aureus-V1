import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityCapability,
  AuthorityCapabilityStatus,
  AuthorityContextType,
  AuthorityDecisionResult,
  AuthorityEventType,
  AuthorityGrantStatus,
  AuthorityRequest,
  AuthorityRequestSource,
  AuthorityRequestStatus,
  AuthorityResourceClass,
  OrganizationMemberRole,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthorityCapabilityControlDto,
  AuthorityEvaluationDto,
  AuthorityReasonDto,
  CreateAuthorityRequestDto,
} from './dto/authority.dto';

const POLICY_VERSION = 'step2-v1';
const ALWAYS_PERSON_CONTROLLED = new Set<AuthorityResourceClass>([
  AuthorityResourceClass.MICROPHONE,
  AuthorityResourceClass.SCREEN,
  AuthorityResourceClass.CONVERSATION,
  AuthorityResourceClass.CONNECTED_ACCOUNT,
]);
const SECRET_PATTERNS = [
  /password\s*[:=]\s*\S+/i,
  /api[_ -]?key\s*[:=]\s*\S+/i,
  /bearer\s+[A-Za-z0-9._~-]+/i,
  /sk-[A-Za-z0-9_-]{16,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

@Injectable()
export class AuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(dto: CreateAuthorityRequestDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.purpose, dto.resourceRef);
    await this.validateScope(dto, caller, true);

    if (dto.expiresAt && new Date(dto.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException('Permission expiry must be in the future');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const request = await tx.authorityRequest.create({
        data: {
          contextType: dto.contextType,
          subjectUserId: dto.subjectUserId ?? null,
          organizationId: dto.organizationId ?? null,
          capability: dto.capability,
          resourceClass: dto.resourceClass,
          resourceRef: dto.resourceRef ?? null,
          purpose: dto.purpose.trim(),
          source: dto.source ?? AuthorityRequestSource.USER,
          requestedByUserId: caller.id,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          policyVersion: POLICY_VERSION,
        },
      });

      await tx.authorityEvent.create({
        data: this.eventData(AuthorityEventType.REQUEST_CREATED, caller.id, request),
      });
      return request;
    });
  }

  async approve(requestId: string, caller: AuthenticatedUser) {
    const request = await this.requestForController(requestId, caller);
    if (request.status !== AuthorityRequestStatus.PENDING) {
      throw new BadRequestException('This permission request is no longer pending');
    }
    if (request.expiresAt && request.expiresAt <= new Date()) {
      throw new BadRequestException('This permission request has expired');
    }

    return this.prisma.db.$transaction(async (tx) => {
      // Authority must still belong to this approver at the exact moment the
      // grant is created. Organization-owned approvals serialize on the same
      // Organization row Step 1 ownership transfer locks, then re-read the
      // current OWNER so stale authority can never cross an ownership change.
      if (request.contextType === AuthorityContextType.PERSONAL) {
        if (request.subjectUserId !== caller.id) throw new NotFoundException('Permission request not found');
      } else if (ALWAYS_PERSON_CONTROLLED.has(request.resourceClass)) {
        if (!request.subjectUserId || request.subjectUserId !== caller.id) {
          throw new NotFoundException('Permission request not found');
        }
        const membership = await tx.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: request.organizationId!, userId: caller.id } },
          select: { id: true },
        });
        if (!membership) throw new NotFoundException('Permission request not found');
      } else {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = CAST(${request.organizationId} AS uuid) FOR UPDATE`,
        );
        const membership = await tx.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: request.organizationId!, userId: caller.id } },
          select: { role: true },
        });
        if (membership?.role !== OrganizationMemberRole.OWNER) {
          throw new NotFoundException('Permission request not found');
        }
      }

      const claimed = await tx.authorityRequest.updateMany({
        where: { id: request.id, status: AuthorityRequestStatus.PENDING },
        data: {
          status: AuthorityRequestStatus.APPROVED,
          approvedByUserId: caller.id,
          decidedAt: new Date(),
        },
      });
      if (claimed.count !== 1) throw new BadRequestException('This permission request is no longer pending');

      const grant = await tx.authorityGrant.create({
        data: {
          requestId: request.id,
          contextType: request.contextType,
          subjectUserId: request.subjectUserId,
          organizationId: request.organizationId,
          capability: request.capability,
          resourceClass: request.resourceClass,
          resourceRef: request.resourceRef,
          purpose: request.purpose,
          policyVersion: request.policyVersion,
          expiresAt: request.expiresAt,
        },
      });
      await tx.authorityEvent.createMany({
        data: [
          this.eventData(AuthorityEventType.REQUEST_APPROVED, caller.id, request),
          { ...this.eventData(AuthorityEventType.GRANT_CREATED, caller.id, request), grantId: grant.id },
        ],
      });
      return grant;
    });
  }

  async deny(requestId: string, dto: AuthorityReasonDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.reason);
    const request = await this.requestForController(requestId, caller);
    if (request.status !== AuthorityRequestStatus.PENDING) {
      throw new BadRequestException('This permission request is no longer pending');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const claimed = await tx.authorityRequest.updateMany({
        where: { id: request.id, status: AuthorityRequestStatus.PENDING },
        data: { status: AuthorityRequestStatus.DENIED, deniedByUserId: caller.id, decidedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('This permission request is no longer pending');
      await tx.authorityEvent.create({
        data: { ...this.eventData(AuthorityEventType.REQUEST_DENIED, caller.id, request), reason: dto.reason ?? 'Denied by approver' },
      });
      return { id: request.id, status: AuthorityRequestStatus.DENIED };
    });
  }

  async revoke(grantId: string, dto: AuthorityReasonDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.reason);
    const selected = await this.prisma.db.authorityGrant.findUnique({ where: { id: grantId } });
    if (!selected || !(await this.canControl(selected, caller.id))) throw new NotFoundException('Permission not found');

    return this.prisma.db.$transaction(async (tx) => {
      const exact = {
        contextType: selected.contextType,
        subjectUserId: selected.subjectUserId,
        organizationId: selected.organizationId,
        capability: selected.capability,
        resourceClass: selected.resourceClass,
        resourceRef: selected.resourceRef,
        purpose: selected.purpose,
      };
      // A member is revoking the permission, not one database row. If the
      // same exact authority was granted twice, every active duplicate must
      // fall together or the UI would falsely claim the permission was gone.
      const active = await tx.authorityGrant.findMany({
        where: { ...exact, status: AuthorityGrantStatus.ACTIVE },
        select: { id: true },
      });
      if (active.length > 0) {
        const now = new Date();
        await tx.authorityGrant.updateMany({
          where: { id: { in: active.map((grant) => grant.id) } },
          data: { status: AuthorityGrantStatus.REVOKED, revokedAt: now, revokedByUserId: caller.id },
        });
        await tx.authorityEvent.createMany({
          data: active.map((grant) => ({
            eventType: AuthorityEventType.GRANT_REVOKED,
            actorUserId: caller.id,
            grantId: grant.id,
            contextType: selected.contextType,
            subjectUserId: selected.subjectUserId,
            organizationId: selected.organizationId,
            capability: selected.capability,
            resourceClass: selected.resourceClass,
            resourceRef: selected.resourceRef,
            reason: dto.reason ?? 'Permission revoked',
          })),
        });
      }
      return tx.authorityGrant.findUniqueOrThrow({ where: { id: selected.id } });
    });
  }

  async suspend(dto: AuthorityCapabilityControlDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.reason);
    await this.assertScopeController(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);
    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);

    return this.prisma.db.$transaction(async (tx) => {
      const state = await tx.authorityCapabilityState.upsert({
        where: { scopeKey_capability: { scopeKey, capability: dto.capability } },
        create: {
          scopeKey,
          contextType: dto.contextType,
          subjectUserId: dto.subjectUserId ?? null,
          organizationId: dto.organizationId ?? null,
          capability: dto.capability,
          status: AuthorityCapabilityStatus.SUSPENDED,
          suspendedReason: dto.reason ?? 'Member suspended this capability',
          suspendedAt: new Date(),
          suspendedByUserId: caller.id,
        },
        update: {
          status: AuthorityCapabilityStatus.SUSPENDED,
          suspendedReason: dto.reason ?? 'Member suspended this capability',
          suspendedAt: new Date(),
          suspendedByUserId: caller.id,
          resumedAt: null,
          resumedByUserId: null,
        },
      });
      await tx.authorityEvent.create({
        data: {
          eventType: AuthorityEventType.CAPABILITY_SUSPENDED,
          actorUserId: caller.id,
          contextType: dto.contextType,
          subjectUserId: dto.subjectUserId ?? null,
          organizationId: dto.organizationId ?? null,
          capability: dto.capability,
          reason: state.suspendedReason,
        },
      });
      return state;
    });
  }

  async resume(dto: AuthorityCapabilityControlDto, caller: AuthenticatedUser) {
    await this.assertScopeController(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);
    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);

    return this.prisma.db.$transaction(async (tx) => {
      // Restoring an organization-wide capability can increase effective
      // authority, so current ownership is revalidated under the same row lock
      // used by Step 1 ownership transfer and Step 2 approval.
      if (dto.contextType === AuthorityContextType.BUSINESS_TENANT && !dto.subjectUserId) {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = CAST(${dto.organizationId} AS uuid) FOR UPDATE`,
        );
        const membership = await tx.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: dto.organizationId!, userId: caller.id } },
          select: { role: true },
        });
        if (membership?.role !== OrganizationMemberRole.OWNER) {
          throw new NotFoundException('Authority scope not found');
        }
      }

      const state = await tx.authorityCapabilityState.upsert({
        where: { scopeKey_capability: { scopeKey, capability: dto.capability } },
        create: {
          scopeKey,
          contextType: dto.contextType,
          subjectUserId: dto.subjectUserId ?? null,
          organizationId: dto.organizationId ?? null,
          capability: dto.capability,
          status: AuthorityCapabilityStatus.ACTIVE,
          resumedAt: new Date(),
          resumedByUserId: caller.id,
        },
        update: {
          status: AuthorityCapabilityStatus.ACTIVE,
          resumedAt: new Date(),
          resumedByUserId: caller.id,
        },
      });
      await tx.authorityEvent.create({
        data: {
          eventType: AuthorityEventType.CAPABILITY_RESUMED,
          actorUserId: caller.id,
          contextType: dto.contextType,
          subjectUserId: dto.subjectUserId ?? null,
          organizationId: dto.organizationId ?? null,
          capability: dto.capability,
          reason: 'Capability restored; existing grants are still evaluated normally',
        },
      });
      return state;
    });
  }

  async evaluateForCaller(dto: AuthorityEvaluationDto, caller: AuthenticatedUser) {
    await this.assertCanInspect(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);
    return this.evaluate(dto, caller.id);
  }

  /** Non-model policy gateway for future executors. No cache: every call reads current grant/suspension state. */
  async evaluate(dto: AuthorityEvaluationDto, actorUserId?: string) {
    // Evaluation itself writes an audit decision, so secret-like metadata must
    // be rejected before any decision row can persist it.
    this.assertNoSecrets(dto.purpose, dto.resourceRef);

    const shapeError = await this.scopeError(dto.contextType, dto.subjectUserId, dto.organizationId);
    if (shapeError) return this.recordDecision(dto, AuthorityDecisionResult.DENY, shapeError, null, actorUserId);

    if (dto.contextType === AuthorityContextType.BUSINESS_TENANT) {
      if (ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && !dto.subjectUserId) {
        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Human/private business authority requires the affected person', null, actorUserId);
      }
      if (!ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && dto.subjectUserId) {
        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Organization-owned authority may not be reclassified as employee-owned', null, actorUserId);
      }
    }

    if ((dto.resourceClass === AuthorityResourceClass.CONVERSATION || dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT) && !dto.resourceRef) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, `${dto.resourceClass} authority requires an exact resource reference`, null, actorUserId);
    }
    if (dto.resourceClass === AuthorityResourceClass.CONVERSATION) {
      const conversation = await this.prisma.db.aiConversation.findFirst({
        where: { id: dto.resourceRef!, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!conversation) {
        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Private conversation does not belong to this authority subject', null, actorUserId);
      }
    }
    if (dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT) {
      const account = await this.prisma.db.connectedAccount.findFirst({
        where: { id: dto.resourceRef!, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!account) {
        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Connected account does not belong to this authority subject', null, actorUserId);
      }
    }

    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);
    const capabilityState = await this.prisma.db.authorityCapabilityState.findUnique({
      where: { scopeKey_capability: { scopeKey, capability: dto.capability } },
    });
    if (capabilityState?.status === AuthorityCapabilityStatus.SUSPENDED) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Capability is suspended for this scope', null, actorUserId);
    }

    const exact = this.exactGrantWhere(dto);
    const now = new Date();
    const grant = await this.prisma.db.authorityGrant.findFirst({
      where: {
        ...exact,
        status: AuthorityGrantStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (grant) {
      return this.recordDecision(dto, AuthorityDecisionResult.PERMIT, 'Exact active permission exists for this purpose', grant.id, actorUserId);
    }

    const revoked = await this.prisma.db.authorityGrant.findFirst({
      where: { ...exact, status: AuthorityGrantStatus.REVOKED },
      orderBy: { revokedAt: 'desc' },
    });
    if (revoked) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Permission was revoked', null, actorUserId);
    }

    return this.recordDecision(dto, AuthorityDecisionResult.NEEDS_APPROVAL, 'No sufficient active permission exists for this purpose', null, actorUserId);
  }

  async trustSnapshot(caller: AuthenticatedUser) {
    const ownerOrgIds = await this.ownerOrganizationIds(caller.id);
    // Organization ownership exposes organization-owned authority only.
    // A person's microphone/screen/private-conversation permission metadata
    // stays person-controlled even when it is scoped to their employer.
    const visible = {
      OR: [
        { subjectUserId: caller.id },
        { organizationId: { in: ownerOrgIds }, subjectUserId: null },
      ],
    };
    const [requests, grants, states, events, decisions] = await Promise.all([
      this.prisma.db.authorityRequest.findMany({
        where: { OR: [
          { subjectUserId: caller.id },
          { requestedByUserId: caller.id },
          { organizationId: { in: ownerOrgIds }, subjectUserId: null },
        ] },
        orderBy: { createdAt: 'desc' }, take: 50,
      }),
      this.prisma.db.authorityGrant.findMany({ where: visible, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.db.authorityCapabilityState.findMany({ where: visible, orderBy: { updatedAt: 'desc' }, take: 50 }),
      this.prisma.db.authorityEvent.findMany({
        where: { OR: [
          { actorUserId: caller.id },
          { subjectUserId: caller.id },
          { organizationId: { in: ownerOrgIds }, subjectUserId: null },
        ] },
        orderBy: { occurredAt: 'desc' }, take: 50,
      }),
      this.prisma.db.authorityDecision.findMany({ where: visible, orderBy: { createdAt: 'desc' }, take: 25 }),
    ]);

    return {
      policyVersion: POLICY_VERSION,
      requests: await Promise.all(requests.map(async (request) => ({
        ...request,
        canApprove: request.status === AuthorityRequestStatus.PENDING && (await this.canControl(request, caller.id)),
        canDeny: request.status === AuthorityRequestStatus.PENDING && (await this.canControl(request, caller.id)),
      }))),
      grants: await Promise.all(grants.map(async (grant) => ({
        ...grant,
        canRevoke: grant.status === AuthorityGrantStatus.ACTIVE && (await this.canControl(grant, caller.id)),
      }))),
      states,
      events,
      decisions,
    };
  }

  private async validateScope(dto: CreateAuthorityRequestDto, caller: AuthenticatedUser, creation: boolean) {
    const error = await this.scopeError(dto.contextType, dto.subjectUserId, dto.organizationId);
    if (error) throw new BadRequestException(error);

    if (dto.contextType === AuthorityContextType.PERSONAL) {
      if (dto.subjectUserId !== caller.id) throw new ForbiddenException('Personal authority can only be requested for yourself');
    } else {
      if (!(await this.isOrganizationMember(dto.organizationId!, caller.id))) {
        throw new NotFoundException('Business context not found');
      }
      if (dto.subjectUserId && !(await this.isOrganizationMember(dto.organizationId!, dto.subjectUserId))) {
        throw new NotFoundException('Business subject not found');
      }
    }

    if (dto.contextType === AuthorityContextType.BUSINESS_TENANT) {
      if (ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && !dto.subjectUserId) {
        throw new BadRequestException(`${dto.resourceClass} authority must name the affected person`);
      }
      if (!ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && dto.subjectUserId) {
        throw new BadRequestException('Organization-owned authority cannot be converted into personal authority by naming an employee');
      }
    }

    if (dto.resourceClass === AuthorityResourceClass.CONVERSATION) {
      if (!dto.resourceRef) throw new BadRequestException('Conversation authority requires an exact conversation reference');
      const conversation = await this.prisma.db.aiConversation.findFirst({
        where: { id: dto.resourceRef, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!conversation) throw new NotFoundException('Private conversation not found');
    }

    if (dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT) {
      if (!dto.resourceRef) throw new BadRequestException('Connected-account authority requires an exact account reference');
      const account = await this.prisma.db.connectedAccount.findFirst({
        where: { id: dto.resourceRef, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!account) throw new NotFoundException('Connected account not found');
    }

    if (creation && dto.capability === AuthorityCapability.SHARE && dto.resourceClass === AuthorityResourceClass.CONVERSATION && !dto.subjectUserId) {
      throw new BadRequestException('Private conversation sharing requires the person who owns the conversation');
    }
  }

  private async scopeError(contextType: AuthorityContextType, subjectUserId?: string, organizationId?: string) {
    if (contextType === AuthorityContextType.PERSONAL) {
      if (!subjectUserId || organizationId) return 'Personal authority requires one person and no organization';
      return null;
    }
    if (!organizationId) return 'Business authority requires an organization';
    const organization = await this.prisma.db.organization.findUnique({
      where: { id: organizationId }, select: { id: true },
    });
    if (!organization) return 'Business organization does not exist';
    if (subjectUserId && !(await this.isOrganizationMember(organizationId, subjectUserId))) return 'Business subject is not an active member of this organization';
    return null;
  }

  private async requestForController(requestId: string, caller: AuthenticatedUser) {
    const request = await this.prisma.db.authorityRequest.findUnique({ where: { id: requestId } });
    if (!request || !(await this.canControl(request, caller.id))) throw new NotFoundException('Permission request not found');
    return request;
  }

  private async canControl(record: {
    contextType: AuthorityContextType;
    subjectUserId: string | null;
    organizationId: string | null;
    resourceClass: AuthorityResourceClass;
  }, userId: string) {
    if (record.contextType === AuthorityContextType.PERSONAL) {
      return record.subjectUserId === userId;
    }

    if (ALWAYS_PERSON_CONTROLLED.has(record.resourceClass)) {
      return Boolean(record.subjectUserId) && record.subjectUserId === userId;
    }
    if (!record.organizationId) return false;
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: record.organizationId, userId } },
      select: { role: true },
    });
    return membership?.role === OrganizationMemberRole.OWNER;
  }

  private async assertScopeController(contextType: AuthorityContextType, subjectUserId: string | undefined, organizationId: string | undefined, userId: string) {
    const error = await this.scopeError(contextType, subjectUserId, organizationId);
    if (error) throw new BadRequestException(error);

    // Capability suspension is deliberately simpler than a grant: a person
    // controls their own person-scoped kill switch, while the business OWNER
    // controls the organization-wide kill switch.
    if (contextType === AuthorityContextType.PERSONAL || subjectUserId) {
      if (subjectUserId !== userId) throw new NotFoundException('Authority scope not found');
      return;
    }
    if (!organizationId) throw new NotFoundException('Authority scope not found');
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { role: true },
    });
    if (membership?.role !== OrganizationMemberRole.OWNER) {
      throw new NotFoundException('Authority scope not found');
    }
  }

  private async assertCanInspect(contextType: AuthorityContextType, subjectUserId: string | undefined, organizationId: string | undefined, userId: string) {
    const error = await this.scopeError(contextType, subjectUserId, organizationId);
    if (error) throw new BadRequestException(error);
    if (subjectUserId) {
      if (subjectUserId !== userId) throw new NotFoundException('Authority scope not found');
      return;
    }
    if (!organizationId || !(await this.isOrganizationMember(organizationId, userId))) throw new NotFoundException('Authority scope not found');
  }

  private async isOrganizationMember(organizationId: string, userId: string) {
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } }, select: { id: true },
    });
    return Boolean(membership);
  }

  private async ownerOrganizationIds(userId: string) {
    const rows = await this.prisma.db.organizationMember.findMany({
      where: { userId, role: OrganizationMemberRole.OWNER }, select: { organizationId: true },
    });
    return rows.map((row) => row.organizationId);
  }

  private scopeKey(contextType: AuthorityContextType, subjectUserId?: string | null, organizationId?: string | null) {
    return contextType === AuthorityContextType.PERSONAL
      ? `PERSONAL:${subjectUserId}`
      : subjectUserId
        ? `BUSINESS:${organizationId}:USER:${subjectUserId}`
        : `BUSINESS:${organizationId}:ORG`;
  }

  private exactGrantWhere(dto: AuthorityEvaluationDto) {
    return {
      contextType: dto.contextType,
      subjectUserId: dto.subjectUserId ?? null,
      organizationId: dto.organizationId ?? null,
      capability: dto.capability,
      resourceClass: dto.resourceClass,
      resourceRef: dto.resourceRef ?? null,
      purpose: dto.purpose.trim(),
    };
  }

  private async recordDecision(dto: AuthorityEvaluationDto, result: AuthorityDecisionResult, reason: string, grantId: string | null, actorUserId?: string) {
    const decision = await this.prisma.db.authorityDecision.create({
      data: {
        actorUserId: actorUserId ?? null,
        contextType: dto.contextType,
        subjectUserId: dto.subjectUserId ?? null,
        organizationId: dto.organizationId ?? null,
        capability: dto.capability,
        resourceClass: dto.resourceClass,
        resourceRef: dto.resourceRef ?? null,
        result,
        reason,
        grantId,
        policyVersion: POLICY_VERSION,
      },
    });
    return { result, reason, grantId, policyVersion: decision.policyVersion, decidedAt: decision.createdAt };
  }

  private eventData(eventType: AuthorityEventType, actorUserId: string, request: AuthorityRequest) {
    return {
      eventType,
      actorUserId,
      requestId: request.id,
      contextType: request.contextType,
      subjectUserId: request.subjectUserId,
      organizationId: request.organizationId,
      capability: request.capability,
      resourceClass: request.resourceClass,
      resourceRef: request.resourceRef,
    };
  }

  private assertNoSecrets(...values: Array<string | undefined>) {
    for (const value of values) {
      if (value && SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
        throw new BadRequestException('Do not put passwords, tokens, API keys, or other secret material in permission records');
      }
    }
  }
}
