import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BusinessPublicStatus,
  NotificationCategory,
  OrganizationMemberRole,
  OrganizationStatus,
  OrganizationType,
  Prisma,
  UserRole,
  UserStatus,
  VerificationStatus,
  WardConversationStatus,
  WardLead,
  WardLeadContactMethod,
  WardLeadEventType,
  WardLeadStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { sanitizePlainText } from '../common/utils/sanitize-text';
import { NotificationsService } from '../communication/notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignWardLeadDto } from './dto/assign-ward-lead.dto';
import { CreateWardLeadDto } from './dto/create-ward-lead.dto';
import { ListWardLeadsQueryDto } from './dto/list-ward-leads-query.dto';
import { TransitionWardLeadDto } from './dto/transition-ward-lead.dto';
import { buildKitchenBathReadyProject } from './kitchen-bath-ready-project';
import {
  WARD_LEAD_CONSENT_DATA_CLASSES,
  WARD_LEAD_CONSENT_PURPOSE,
  WARD_LEAD_CONSENT_VERSION,
  WARD_LEAD_RETENTION_DAYS,
  wardLeadConsentText,
} from './ward-lead-consent';

const RETENTION_MS = WARD_LEAD_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const ELIGIBLE_ASSIGNEE_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
  OrganizationMemberRole.OPERATOR,
];

const MANAGE_ROLES = ELIGIBLE_ASSIGNEE_ROLES;

const PRIVILEGED_ROLES: UserRole[] = [
  UserRole.STEWARD,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];

const STATUS_TRANSITIONS: Record<WardLeadStatus, WardLeadStatus[]> = {
  [WardLeadStatus.SUBMITTED]: [WardLeadStatus.ACCEPTED],
  [WardLeadStatus.ACCEPTED]: [WardLeadStatus.CONTACTED, WardLeadStatus.LOST],
  [WardLeadStatus.CONTACTED]: [WardLeadStatus.CLOSED, WardLeadStatus.LOST],
  [WardLeadStatus.CLOSED]: [],
  [WardLeadStatus.LOST]: [],
};

interface PublishedLeadTenant {
  id: string;
  name: string;
  businessProfile: {
    publicSlug: string | null;
    escalationTarget: Prisma.JsonValue | null;
  };
}

interface CleanLeadInput {
  displayName: string;
  contactMethod: WardLeadContactMethod;
  contactValue: string;
  projectSummary: string;
  projectLocation?: string;
  desiredTiming?: CreateWardLeadDto['desiredTiming'];
}

interface ServerHandoffContext {
  qualificationSignals?: Prisma.InputJsonObject[];
  fingerprintContext?: string;
}

@Injectable()
export class WardLeadService {
  private readonly logger = new Logger(WardLeadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async submitPublicHandoff(
    slug: string,
    conversationId: string,
    token: string | undefined,
    dto: CreateWardLeadDto,
    serverContext?: ServerHandoffContext,
  ) {
    if (dto.consentGranted !== true || dto.consentVersion !== WARD_LEAD_CONSENT_VERSION) {
      throw new BadRequestException('The current handoff consent must be affirmatively granted');
    }
    const tenant = await this.findPublishedTenant(slug);
    const conversation = await this.requireActiveConversation(tenant.id, conversationId, token);
    if (conversation.turnCount < 1) {
      throw new ConflictException('Ask the Ward at least one question before requesting a handoff');
    }

    const input = this.cleanAndValidate(dto);
    const consentText = wardLeadConsentText(tenant.name);
    const consentTextSha256 = this.hash(consentText);
    if (dto.consentTextSha256 !== consentTextSha256) {
      throw new ConflictException('The handoff consent changed. Reload it before deciding.');
    }
    const fingerprint = this.fingerprint(
      input,
      consentTextSha256,
      serverContext?.fingerprintContext,
    );
    const existing = await this.prisma.db.wardLead.findUnique({
      where: { conversationId },
    });
    if (existing) {
      if (existing.organizationId !== tenant.id || existing.submissionFingerprint !== fingerprint) {
        throw new ConflictException('This conversation already has a different handoff request');
      }
      return this.toPublicHandoff(existing, tenant.name);
    }

    const assignee = await this.chooseAssignee(tenant);
    if (!assignee) {
      throw new ConflictException(
        'This business is not accepting Ward handoffs right now. Please use its direct contact route.',
      );
    }

    const now = new Date();
    const retentionExpiresAt = new Date(now.getTime() + RETENTION_MS);
    const signals = [
      ...this.buildQualificationSignals(input, conversation.turnCount),
      ...(serverContext?.qualificationSignals ?? []),
    ];

    let lead: WardLead;
    try {
      lead = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.wardLead.create({
          data: {
            organizationId: tenant.id,
            conversationId,
            ...input,
            consentPurpose: WARD_LEAD_CONSENT_PURPOSE,
            consentVersion: WARD_LEAD_CONSENT_VERSION,
            consentText,
            consentTextSha256,
            consentDataClasses: [...WARD_LEAD_CONSENT_DATA_CLASSES],
            consentGrantedAt: now,
            consentExpiresAt: retentionExpiresAt,
            submissionFingerprint: fingerprint,
            qualificationSignals: signals as Prisma.InputJsonValue,
            assignedToId: assignee.userId,
            retentionExpiresAt,
          },
        });

        await tx.wardLeadEvent.createMany({
          data: [
            {
              organizationId: tenant.id,
              leadId: created.id,
              type: WardLeadEventType.SUBMITTED,
              toStatus: WardLeadStatus.SUBMITTED,
            },
            {
              organizationId: tenant.id,
              leadId: created.id,
              type: WardLeadEventType.ASSIGNED,
              reason: 'Automatic tenant-safe routing',
            },
          ],
        });

        await tx.wardConversation.update({
          where: { id: conversationId },
          data: {
            status: WardConversationStatus.ESCALATED,
            expiresAt: retentionExpiresAt,
            lastActivityAt: now,
          },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrent = await this.prisma.db.wardLead.findUnique({ where: { conversationId } });
        if (
          concurrent?.organizationId === tenant.id &&
          concurrent.submissionFingerprint === fingerprint
        ) {
          return this.toPublicHandoff(concurrent, tenant.name);
        }
        throw new ConflictException('This conversation already has a different handoff request');
      }
      throw error;
    }

    await this.notifyAssignment(lead.id, tenant.id, assignee.userId, `submitted:${lead.id}`);
    return this.toPublicHandoff(lead, tenant.name);
  }

  async deletePublicHandoff(
    slug: string,
    conversationId: string,
    token: string | undefined,
  ): Promise<{ deleted: true }> {
    if (!token || token.length < 40 || token.length > 100) {
      throw new NotFoundException('Handoff not found');
    }

    const lead = await this.prisma.db.wardLead.findFirst({
      where: {
        conversationId,
        retentionExpiresAt: { gt: new Date() },
        organization: {
          deletedAt: null,
          businessProfile: { is: { publicSlug: slug.toLowerCase().trim() } },
        },
        conversation: { accessTokenHash: this.hash(token) },
      },
      select: { conversationId: true },
    });
    if (!lead) throw new NotFoundException('Handoff not found');

    // Deleting the attributed conversation cascades to the lead, its event
    // history, messages, citations, and provider ledger rows in one action.
    await this.prisma.db.wardConversation.delete({ where: { id: lead.conversationId } });
    return { deleted: true };
  }

  async listBusinessLeads(
    organizationId: string,
    query: ListWardLeadsQueryDto,
    caller: AuthenticatedUser,
  ) {
    await this.requireTenantAccess(organizationId, caller);
    return this.prisma.db.wardLead.findMany({
      where: {
        organizationId,
        retentionExpiresAt: { gt: new Date() },
        ...(query.status && { status: query.status }),
      },
      select: {
        id: true,
        displayName: true,
        contactMethod: true,
        contactValue: true,
        projectSummary: true,
        projectLocation: true,
        desiredTiming: true,
        qualificationSignals: true,
        status: true,
        assignedToId: true,
        submittedAt: true,
        lastStateChangedAt: true,
        retentionExpiresAt: true,
        assignmentNotifiedAt: true,
        assignee: {
          select: {
            user: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          },
        },
      },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }

  async getBusinessLead(organizationId: string, leadId: string, caller: AuthenticatedUser) {
    await this.requireTenantAccess(organizationId, caller);
    const lead = await this.prisma.db.wardLead.findFirst({
      where: { id: leadId, organizationId, retentionExpiresAt: { gt: new Date() } },
      include: {
        assignee: {
          select: {
            role: true,
            user: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          },
        },
        events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] },
        conversation: {
          select: {
            id: true,
            status: true,
            turnCount: true,
            createdAt: true,
            messages: {
              include: { sources: { orderBy: { createdAt: 'asc' } } },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            },
          },
        },
      },
    });
    if (!lead) throw new NotFoundException(`Lead '${leadId}' not found`);
    const readyProject = buildKitchenBathReadyProject(lead);
    const safeLead: Partial<typeof lead> = { ...lead };
    delete safeLead.submissionFingerprint;
    return { ...safeLead, readyProject };
  }

  async assignBusinessLead(
    organizationId: string,
    leadId: string,
    dto: AssignWardLeadDto,
    caller: AuthenticatedUser,
  ) {
    const access = await this.requireTenantAccess(organizationId, caller);
    this.requireCanManage(access.membership?.role, caller);

    const [lead, assignee] = await Promise.all([
      this.findScopedLead(organizationId, leadId),
      this.findEligibleAssignee(organizationId, dto.assignedToId),
    ]);
    if (!assignee)
      throw new BadRequestException('Assignee must be an active eligible member of this tenant');
    if (lead.status === WardLeadStatus.CLOSED || lead.status === WardLeadStatus.LOST) {
      throw new ConflictException('A terminal lead cannot be reassigned');
    }
    if (lead.assignedToId === dto.assignedToId)
      return this.getBusinessLead(organizationId, leadId, caller);

    const event = await this.prisma.db.$transaction(async (tx) => {
      await tx.wardLead.update({
        where: { id: lead.id },
        data: { assignedToId: dto.assignedToId },
      });
      return tx.wardLeadEvent.create({
        data: {
          organizationId,
          leadId,
          type: WardLeadEventType.REASSIGNED,
          actorId: caller.id,
          reason: 'Reassigned by an authorized tenant steward',
        },
      });
    });

    await this.notifyAssignment(leadId, organizationId, dto.assignedToId, `reassigned:${event.id}`);
    return this.getBusinessLead(organizationId, leadId, caller);
  }

  async transitionBusinessLead(
    organizationId: string,
    leadId: string,
    dto: TransitionWardLeadDto,
    caller: AuthenticatedUser,
  ) {
    const access = await this.requireTenantAccess(organizationId, caller);
    this.requireCanManage(access.membership?.role, caller);
    const lead = await this.findScopedLead(organizationId, leadId);
    if (!STATUS_TRANSITIONS[lead.status].includes(dto.status)) {
      throw new ConflictException(`Lead cannot move from ${lead.status} to ${dto.status}`);
    }

    const reason = dto.reason ? sanitizePlainText(dto.reason).slice(0, 500) : undefined;
    const terminal = dto.status === WardLeadStatus.CLOSED || dto.status === WardLeadStatus.LOST;
    if (terminal && !reason) {
      throw new BadRequestException('A factual outcome reason is required to close or lose a lead');
    }
    const now = new Date();
    const update: Prisma.WardLeadUpdateManyMutationInput = {
      status: dto.status,
      lastStateChangedAt: now,
      ...(dto.status === WardLeadStatus.ACCEPTED && { acceptedAt: now }),
      ...(dto.status === WardLeadStatus.CONTACTED && { contactedAt: now }),
      ...(terminal && {
        closedAt: now,
        outcomeReason: reason,
      }),
    };

    await this.prisma.db.$transaction(async (tx) => {
      const changed = await tx.wardLead.updateMany({
        where: { id: leadId, organizationId, status: lead.status },
        data: update,
      });
      if (changed.count !== 1)
        throw new ConflictException('Lead changed; refresh before trying again');
      await tx.wardLeadEvent.create({
        data: {
          organizationId,
          leadId,
          type: WardLeadEventType.STATUS_CHANGED,
          actorId: caller.id,
          fromStatus: lead.status,
          toStatus: dto.status,
          ...(reason && { reason }),
        },
      });
    });

    return this.getBusinessLead(organizationId, leadId, caller);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredLeads(): Promise<void> {
    await this.prisma.db.wardConversation.deleteMany({
      where: { lead: { is: { retentionExpiresAt: { lte: new Date() } } } },
    });
  }

  private cleanAndValidate(dto: CreateWardLeadDto): CleanLeadInput {
    const input: CleanLeadInput = {
      displayName: sanitizePlainText(dto.displayName).slice(0, 120),
      contactMethod: dto.contactMethod,
      contactValue: sanitizePlainText(dto.contactValue).slice(0, 320),
      projectSummary: sanitizePlainText(dto.projectSummary).slice(0, 2000),
      ...(dto.projectLocation && {
        projectLocation: sanitizePlainText(dto.projectLocation).slice(0, 200),
      }),
      ...(dto.desiredTiming && { desiredTiming: dto.desiredTiming }),
    };

    if (!input.displayName || input.projectSummary.length < 10) {
      throw new BadRequestException(
        'Name and a project summary of at least 10 characters are required',
      );
    }
    if (input.contactMethod === WardLeadContactMethod.EMAIL) {
      input.contactValue = input.contactValue.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactValue)) {
        throw new BadRequestException('Enter a valid email address');
      }
    } else if (!/^(?=.*\d)[+()\d\s.-]{7,40}$/.test(input.contactValue)) {
      throw new BadRequestException('Enter a valid phone number');
    }
    return input;
  }

  private buildQualificationSignals(input: CleanLeadInput, conversationTurns: number) {
    return [
      {
        key: 'contact_method',
        label: 'Preferred contact',
        value: input.contactMethod,
        basis: 'Visitor supplied',
      },
      ...(input.desiredTiming
        ? [
            {
              key: 'desired_timing',
              label: 'Desired timing',
              value: input.desiredTiming,
              basis: 'Visitor supplied',
            },
          ]
        : []),
      ...(input.projectLocation
        ? [
            {
              key: 'project_location',
              label: 'Project location',
              value: input.projectLocation,
              basis: 'Visitor supplied',
            },
          ]
        : []),
      {
        key: 'conversation_turns',
        label: 'Ward questions before handoff',
        value: String(conversationTurns),
        basis: 'System count',
      },
    ];
  }

  private async findPublishedTenant(slug: string): Promise<PublishedLeadTenant> {
    const tenant = await this.prisma.db.organization.findFirst({
      where: {
        deletedAt: null,
        organizationType: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        businessProfile: {
          is: {
            publicSlug: slug.toLowerCase().trim(),
            publicStatus: BusinessPublicStatus.PUBLISHED,
            onboardingCompletedAt: { not: null },
          },
        },
      },
      select: {
        id: true,
        name: true,
        businessProfile: { select: { publicSlug: true, escalationTarget: true } },
      },
    });
    if (!tenant?.businessProfile) throw new NotFoundException('Ward not found');
    return tenant as PublishedLeadTenant;
  }

  private async requireActiveConversation(
    organizationId: string,
    conversationId: string,
    token: string | undefined,
  ) {
    if (!token || token.length < 40 || token.length > 100) {
      throw new NotFoundException('Conversation not found');
    }
    const conversation = await this.prisma.db.wardConversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
        accessTokenHash: this.hash(token),
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const now = new Date();
    if (conversation.expiresAt <= now || conversation.tokenExpiresAt <= now) {
      throw new GoneException(
        'This private conversation link has expired. Start a new conversation.',
      );
    }
    return conversation;
  }

  private async chooseAssignee(tenant: PublishedLeadTenant) {
    const members = await this.prisma.db.organizationMember.findMany({
      where: {
        organizationId: tenant.id,
        role: { in: ELIGIBLE_ASSIGNEE_ROLES },
        user: { status: UserStatus.ACTIVE, deletedAt: null },
      },
      select: { userId: true, role: true, user: { select: { email: true } } },
    });
    const escalationEmail = this.escalationEmail(tenant.businessProfile.escalationTarget);
    const exact = escalationEmail
      ? members.find((member) => member.user.email.toLowerCase() === escalationEmail)
      : undefined;
    if (exact) return exact;
    const priority = new Map(ELIGIBLE_ASSIGNEE_ROLES.map((role, index) => [role, index]));
    return (
      members.sort(
        (a, b) =>
          (priority.get(a.role) ?? 99) - (priority.get(b.role) ?? 99) ||
          a.user.email.localeCompare(b.user.email) ||
          a.userId.localeCompare(b.userId),
      )[0] ?? null
    );
  }

  private escalationEmail(value: Prisma.JsonValue | null): string | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null;
    const email = (value as Record<string, Prisma.JsonValue>).email;
    return typeof email === 'string' ? email.trim().toLowerCase() : null;
  }

  private async findEligibleAssignee(organizationId: string, userId: string) {
    return this.prisma.db.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: { in: ELIGIBLE_ASSIGNEE_ROLES },
        user: { status: UserStatus.ACTIVE, deletedAt: null },
      },
    });
  }

  private async requireTenantAccess(organizationId: string, caller: AuthenticatedUser) {
    const organization = await this.prisma.db.organization.findFirst({
      where: { id: organizationId, organizationType: OrganizationType.BUSINESS, deletedAt: null },
      include: { members: { where: { userId: caller.id }, take: 1 } },
    });
    if (!organization) throw new NotFoundException(`Organization '${organizationId}' not found`);
    const membership = organization.members[0] ?? null;
    if (!membership && !hasRole(caller, PRIVILEGED_ROLES)) {
      throw new NotFoundException(`Organization '${organizationId}' not found`);
    }
    return { organization, membership };
  }

  private requireCanManage(
    role: OrganizationMemberRole | undefined,
    caller: AuthenticatedUser,
  ): void {
    if (hasRole(caller, PRIVILEGED_ROLES)) return;
    if (!role || !MANAGE_ROLES.includes(role)) {
      throw new ForbiddenException("You do not have permission to manage this tenant's leads");
    }
  }

  private async findScopedLead(organizationId: string, leadId: string) {
    const lead = await this.prisma.db.wardLead.findFirst({
      where: { id: leadId, organizationId, retentionExpiresAt: { gt: new Date() } },
    });
    if (!lead) throw new NotFoundException(`Lead '${leadId}' not found`);
    return lead;
  }

  private async notifyAssignment(
    leadId: string,
    organizationId: string,
    recipientId: string,
    dedupeSuffix: string,
  ): Promise<void> {
    const attemptedAt = new Date();
    let assignmentNotifiedAt: Date | undefined;
    try {
      const notification = await this.notifications.notify({
        recipientId,
        category: NotificationCategory.ORGANIZATION,
        type: 'WARD_LEAD_ASSIGNED',
        title: 'A Ward handoff needs a human response',
        body: 'A visitor explicitly consented to a Ward handoff. Open the tenant lead queue to review it.',
        data: { organizationId, leadId },
        dedupeKey: `ward-lead:${leadId}:${dedupeSuffix}`,
      });
      if (notification) assignmentNotifiedAt = new Date();
    } catch (error) {
      this.logger.warn(
        `Lead ${leadId} remains queued, but its assignment notification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    try {
      await this.prisma.db.wardLead.updateMany({
        where: { id: leadId, organizationId },
        data: {
          notificationAttemptedAt: attemptedAt,
          ...(assignmentNotifiedAt && { assignmentNotifiedAt }),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Lead ${leadId} remains queued, but notification evidence could not be recorded: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private toPublicHandoff(
    lead: {
      id: string;
      status: WardLeadStatus;
      contactMethod: WardLeadContactMethod;
      submittedAt: Date;
      retentionExpiresAt: Date;
    },
    businessName: string,
  ) {
    return {
      handoffId: lead.id,
      status: lead.status,
      preferredContactMethod: lead.contactMethod,
      submittedAt: lead.submittedAt,
      retentionExpiresAt: lead.retentionExpiresAt,
      confirmation: `Your request and this Ward conversation were shared with ${businessName}. A team member can now review them.`,
    };
  }

  private fingerprint(
    input: CleanLeadInput,
    consentTextSha256: string,
    fingerprintContext?: string,
  ): string {
    return this.hash(
      JSON.stringify({
        displayName: input.displayName,
        contactMethod: input.contactMethod,
        contactValue: input.contactValue,
        projectSummary: input.projectSummary,
        projectLocation: input.projectLocation ?? null,
        desiredTiming: input.desiredTiming ?? null,
        consentVersion: WARD_LEAD_CONSENT_VERSION,
        consentTextSha256,
        ...(fingerprintContext ? { fingerprintContext } : {}),
      }),
    );
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
