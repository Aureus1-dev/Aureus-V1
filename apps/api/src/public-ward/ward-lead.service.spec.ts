import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationStatus,
  OrganizationType,
  UserRole,
  VerificationStatus,
  WardConversationStatus,
  WardLeadContactMethod,
  WardLeadDesiredTiming,
  WardLeadStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { NotificationsService } from '../communication/notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import {
  WARD_LEAD_CONSENT_DATA_CLASSES,
  WARD_LEAD_CONSENT_VERSION,
  wardLeadConsentText,
} from './ward-lead-consent';
import { WardLeadService } from './ward-lead.service';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const CONVERSATION_ID = '22222222-2222-4222-8222-222222222222';
const LEAD_ID = '33333333-3333-4333-8333-333333333333';
const ASSIGNEE_ID = '44444444-4444-4444-8444-444444444444';
const CALLER_ID = '55555555-5555-4555-8555-555555555555';
const TOKEN = 'private-token-'.padEnd(50, 'x');
const NOW = new Date('2026-08-14T12:00:00.000Z');
const CONSENT_TEXT = wardLeadConsentText('Example Kitchens');
const CONSENT_TEXT_SHA256 = createHash('sha256').update(CONSENT_TEXT).digest('hex');

const tenant = {
  id: TENANT_ID,
  name: 'Example Kitchens',
  organizationType: OrganizationType.BUSINESS,
  status: OrganizationStatus.ACTIVE,
  verificationStatus: VerificationStatus.VERIFIED,
  businessProfile: {
    publicSlug: 'example-kitchens',
    escalationTarget: { email: 'owner@example.com' },
  },
};

const conversation = {
  id: CONVERSATION_ID,
  organizationId: TENANT_ID,
  accessTokenHash: 'a'.repeat(64),
  status: WardConversationStatus.OPEN,
  turnCount: 2,
  tokenExpiresAt: new Date(Date.now() + 60_000),
  expiresAt: new Date(Date.now() + 120_000),
  lastActivityAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const lead = {
  id: LEAD_ID,
  organizationId: TENANT_ID,
  conversationId: CONVERSATION_ID,
  displayName: 'Jordan',
  contactMethod: WardLeadContactMethod.EMAIL,
  contactValue: 'jordan@example.com',
  projectSummary: 'Plan a complete kitchen remodel.',
  projectLocation: 'Philadelphia',
  desiredTiming: WardLeadDesiredTiming.ONE_TO_THREE_MONTHS,
  consentPurpose: 'lead_handoff',
  consentVersion: WARD_LEAD_CONSENT_VERSION,
  consentText: 'consent text',
  consentTextSha256: 'b'.repeat(64),
  consentDataClasses: [...WARD_LEAD_CONSENT_DATA_CLASSES],
  consentGrantedAt: NOW,
  consentExpiresAt: new Date('2026-11-12T12:00:00.000Z'),
  submissionFingerprint: 'c'.repeat(64),
  qualificationSignals: [],
  assignedToId: ASSIGNEE_ID,
  status: WardLeadStatus.SUBMITTED,
  acceptedAt: null,
  contactedAt: null,
  closedAt: null,
  outcomeReason: null,
  notificationAttemptedAt: null,
  assignmentNotifiedAt: null,
  lastStateChangedAt: NOW,
  retentionExpiresAt: new Date('2026-11-12T12:00:00.000Z'),
  submittedAt: NOW,
  updatedAt: NOW,
};

const dto = {
  displayName: 'Jordan',
  contactMethod: WardLeadContactMethod.EMAIL,
  contactValue: 'JORDAN@example.com',
  projectSummary: 'Plan a complete kitchen remodel.',
  projectLocation: 'Philadelphia',
  desiredTiming: WardLeadDesiredTiming.ONE_TO_THREE_MONTHS,
  consentVersion: WARD_LEAD_CONSENT_VERSION,
  consentTextSha256: CONSENT_TEXT_SHA256,
  consentGranted: true as const,
};

describe('WardLeadService', () => {
  const db = {
    organization: { findFirst: jest.fn() },
    organizationMember: { findMany: jest.fn(), findFirst: jest.fn() },
    wardConversation: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    wardLead: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    wardLeadEvent: { create: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const notifications = { notify: jest.fn() };
  let service: WardLeadService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.organization.findFirst.mockResolvedValue(tenant);
    db.wardConversation.findFirst.mockResolvedValue(conversation);
    db.organizationMember.findMany.mockResolvedValue([
      {
        userId: ASSIGNEE_ID,
        role: OrganizationMemberRole.OWNER,
        user: { email: 'owner@example.com' },
      },
    ]);
    db.wardLead.findUnique.mockResolvedValue(null);
    db.wardLead.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...lead,
      ...data,
      id: LEAD_ID,
      submittedAt: NOW,
    }));
    db.wardLeadEvent.createMany.mockResolvedValue({ count: 2 });
    db.wardConversation.update.mockResolvedValue(conversation);
    db.wardLead.updateMany.mockResolvedValue({ count: 1 });
    db.$transaction.mockImplementation(async (work: (tx: typeof db) => unknown) => work(db));
    notifications.notify.mockResolvedValue({ id: 'notification-1' });
    service = new WardLeadService(
      { db } as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  it('persists only an explicit server-owned consent contract and transparent signals', async () => {
    const result = await service.submitPublicHandoff(
      'example-kitchens',
      CONVERSATION_ID,
      TOKEN,
      dto,
    );

    const createData = db.wardLead.create.mock.calls[0][0].data;
    expect(createData).toMatchObject({
      organizationId: TENANT_ID,
      conversationId: CONVERSATION_ID,
      assignedToId: ASSIGNEE_ID,
      contactValue: 'jordan@example.com',
      consentPurpose: 'lead_handoff',
      consentVersion: WARD_LEAD_CONSENT_VERSION,
      consentTextSha256: CONSENT_TEXT_SHA256,
      consentDataClasses: WARD_LEAD_CONSENT_DATA_CLASSES,
    });
    expect(createData.consentText).toContain('This is not consent to unrelated marketing');
    expect(createData.consentTextSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(createData.submissionFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(createData.qualificationSignals)).not.toMatch(/score|ranking|fit/i);
    expect(db.wardConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: WardConversationStatus.ESCALATED }),
      }),
    );
    expect(result.confirmation).toContain('shared with Example Kitchens');
  });

  it('rejects missing consent in the service boundary before reading tenant data', async () => {
    await expect(
      service.submitPublicHandoff('example-kitchens', CONVERSATION_ID, TOKEN, {
        ...dto,
        consentGranted: false as never,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(db.organization.findFirst).not.toHaveBeenCalled();
    expect(db.wardLead.create).not.toHaveBeenCalled();
  });

  it('rejects a stale consent digest instead of storing copy the visitor did not see', async () => {
    await expect(
      service.submitPublicHandoff('example-kitchens', CONVERSATION_ID, TOKEN, {
        ...dto,
        consentTextSha256: 'd'.repeat(64),
      }),
    ).rejects.toThrow(ConflictException);
    expect(db.wardLead.create).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('notifies the real tenant assignee without putting visitor PII in the notification', async () => {
    await service.submitPublicHandoff('example-kitchens', CONVERSATION_ID, TOKEN, dto);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: ASSIGNEE_ID,
        data: { organizationId: TENANT_ID, leadId: LEAD_ID },
      }),
    );
    const message = JSON.stringify(notifications.notify.mock.calls[0][0]);
    expect(message).not.toContain('jordan@example.com');
    expect(message).not.toContain('Jordan');
    expect(message).not.toContain('kitchen remodel');
  });

  it('keeps a successfully queued handoff successful when notification infrastructure fails', async () => {
    notifications.notify.mockRejectedValue(new Error('notification store unavailable'));
    db.wardLead.updateMany.mockRejectedValue(new Error('evidence update unavailable'));

    await expect(
      service.submitPublicHandoff('example-kitchens', CONVERSATION_ID, TOKEN, dto),
    ).resolves.toMatchObject({ handoffId: LEAD_ID, status: WardLeadStatus.SUBMITTED });
    expect(db.wardLead.create).toHaveBeenCalledTimes(1);
  });

  it('returns the original handoff for an identical retry without duplicating or renotifying it', async () => {
    const first = await service.submitPublicHandoff(
      'example-kitchens',
      CONVERSATION_ID,
      TOKEN,
      dto,
    );
    const created = db.wardLead.create.mock.results[0].value;
    db.wardLead.findUnique.mockResolvedValue(await created);

    const retry = await service.submitPublicHandoff(
      'example-kitchens',
      CONVERSATION_ID,
      TOKEN,
      dto,
    );

    expect(retry.handoffId).toBe(first.handoffId);
    expect(db.wardLead.create).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('does not create a handoff before a substantive Ward exchange', async () => {
    db.wardConversation.findFirst.mockResolvedValue({ ...conversation, turnCount: 0 });
    await expect(
      service.submitPublicHandoff('example-kitchens', CONVERSATION_ID, TOKEN, dto),
    ).rejects.toThrow(ConflictException);
    expect(db.wardLead.create).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('conceals a tenant lead queue from a caller who is not a member', async () => {
    db.organization.findFirst.mockResolvedValue({ ...tenant, members: [] });
    const caller: AuthenticatedUser = {
      id: CALLER_ID,
      email: 'outsider@example.com',
      roles: [UserRole.MEMBER],
    };
    await expect(service.listBusinessLeads(TENANT_ID, {}, caller)).rejects.toThrow(
      NotFoundException,
    );
    expect(db.wardLead.findMany).not.toHaveBeenCalled();
  });

  it('conceals a Ready Project from a caller outside the tenant', async () => {
    db.organization.findFirst.mockResolvedValue({ ...tenant, members: [] });
    const caller: AuthenticatedUser = {
      id: CALLER_ID,
      email: 'outsider@example.com',
      roles: [UserRole.MEMBER],
    };

    await expect(
      service.getBusinessLead(TENANT_ID, LEAD_ID, caller),
    ).rejects.toThrow(NotFoundException);

    expect(db.wardLead.findFirst).not.toHaveBeenCalled();
  });

  it('returns a distilled Ready Project to an authorized tenant before raw conversation evidence', async () => {
    db.organization.findFirst.mockResolvedValue({
      ...tenant,
      members: [{ role: OrganizationMemberRole.MANAGER, userId: CALLER_ID }],
    });
    db.wardLead.findFirst.mockResolvedValue({
      ...lead,
      qualificationSignals: [
        { key: 'vertical', value: 'KITCHEN_BATH', basis: 'Approved tenant pack' },
        { key: 'project_type', value: 'KITCHEN', basis: 'Visitor supplied' },
        { key: 'rooms', value: ['kitchen'], basis: 'Visitor supplied' },
        {
          key: 'scope',
          value: 'Plan a complete kitchen remodel.',
          basis: 'Visitor supplied',
        },
        {
          key: 'priorities',
          value: ['FUNCTION_AND_LAYOUT'],
          basis: 'Visitor supplied; optional; no scoring',
        },
        {
          key: 'kitchen_bath_intake_hash',
          value: 'd'.repeat(64),
          basis: 'System SHA-256',
        },
        { key: 'conversation_turns', value: '2', basis: 'System count' },
      ],
      assignee: {
        role: OrganizationMemberRole.OWNER,
        user: {
          id: ASSIGNEE_ID,
          email: 'owner@example.com',
          profile: { displayName: 'Owner' },
        },
      },
      events: [],
      conversation: {
        id: CONVERSATION_ID,
        status: WardConversationStatus.ESCALATED,
        turnCount: 2,
        createdAt: NOW,
        messages: [
          {
            id: '77777777-7777-4777-8777-777777777777',
            role: 'VISITOR',
            content: 'I want a better kitchen layout.',
            responseKind: null,
            createdAt: NOW,
            sources: [],
          },
        ],
      },
    });
    const caller: AuthenticatedUser = {
      id: CALLER_ID,
      email: 'manager@example.com',
      roles: [UserRole.MEMBER],
    };

    const result = await service.getBusinessLead(TENANT_ID, LEAD_ID, caller);

    expect(result.readyProject).toMatchObject({
      readinessStatus: 'READY_FOR_EXPERT_REVIEW',
      customerIntent: {
        projectType: 'KITCHEN',
        priorities: ['FUNCTION_AND_LAYOUT'],
      },
      source: { modelInferencesIncluded: false },
    });
    expect(result).not.toHaveProperty('submissionFingerprint');
    expect(result.conversation?.messages).toHaveLength(1);
  });

  it('requires a factual reason for a terminal human outcome', async () => {
    db.organization.findFirst.mockResolvedValue({
      ...tenant,
      members: [{ role: OrganizationMemberRole.MANAGER, userId: CALLER_ID }],
    });
    db.wardLead.findFirst.mockResolvedValue({
      ...lead,
      status: WardLeadStatus.CONTACTED,
      acceptedAt: NOW,
      contactedAt: NOW,
    });
    const caller: AuthenticatedUser = {
      id: CALLER_ID,
      email: 'manager@example.com',
      roles: [UserRole.MEMBER],
    };

    await expect(
      service.transitionBusinessLead(TENANT_ID, LEAD_ID, { status: WardLeadStatus.CLOSED }, caller),
    ).rejects.toThrow(BadRequestException);
    expect(db.wardLead.updateMany).not.toHaveBeenCalled();
  });

  it('rejects skipped or fabricated state transitions', async () => {
    db.organization.findFirst.mockResolvedValue({
      ...tenant,
      members: [{ role: OrganizationMemberRole.MANAGER, userId: CALLER_ID }],
    });
    db.wardLead.findFirst.mockResolvedValue(lead);
    const caller: AuthenticatedUser = {
      id: CALLER_ID,
      email: 'manager@example.com',
      roles: [UserRole.MEMBER],
    };

    await expect(
      service.transitionBusinessLead(
        TENANT_ID,
        LEAD_ID,
        { status: WardLeadStatus.CONTACTED },
        caller,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects assignment to a user who is not an eligible member of the same tenant', async () => {
    db.organization.findFirst.mockResolvedValue({
      ...tenant,
      members: [{ role: OrganizationMemberRole.MANAGER, userId: CALLER_ID }],
    });
    db.wardLead.findFirst.mockResolvedValue(lead);
    db.organizationMember.findFirst.mockResolvedValue(null);
    const caller: AuthenticatedUser = {
      id: CALLER_ID,
      email: 'manager@example.com',
      roles: [UserRole.MEMBER],
    };

    await expect(
      service.assignBusinessLead(
        TENANT_ID,
        LEAD_ID,
        { assignedToId: '66666666-6666-4666-8666-666666666666' },
        caller,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(db.wardLead.update).not.toHaveBeenCalled();
  });

  it('deletes the attributed conversation so every handoff record cascades away', async () => {
    db.wardLead.findFirst.mockResolvedValue({ conversationId: CONVERSATION_ID });
    db.wardConversation.delete.mockResolvedValue(conversation);
    await expect(
      service.deletePublicHandoff('example-kitchens', CONVERSATION_ID, TOKEN),
    ).resolves.toEqual({ deleted: true });
    expect(db.wardLead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: CONVERSATION_ID,
          conversation: { accessTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
        }),
      }),
    );
    expect(db.wardConversation.delete).toHaveBeenCalledWith({ where: { id: CONVERSATION_ID } });
  });
});
import { createHash } from 'node:crypto';
