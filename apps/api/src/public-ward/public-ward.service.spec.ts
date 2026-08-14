import { NotFoundException } from '@nestjs/common';
import {
  BusinessKnowledgeStatus,
  BusinessKnowledgeType,
  BusinessPublicStatus,
  OrganizationStatus,
  VerificationStatus,
  WardConversationStatus,
  WardMessageRole,
  WardResponseKind,
} from '@prisma/client';
import type { AiRequestsService } from '../ai/requests/ai-requests.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PublicWardService } from './public-ward.service';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT_ID = '22222222-2222-4222-8222-222222222222';
const CONVERSATION_ID = '33333333-3333-4333-8333-333333333333';
const VISITOR_ID = '44444444-4444-4444-8444-444444444444';
const WARD_ID = '55555555-5555-4555-8555-555555555555';
const TOKEN = 'a'.repeat(50);
const NOW = new Date('2026-08-13T12:00:00.000Z');

const tenant = {
  id: TENANT_ID,
  name: 'Example Kitchens',
  shortDescription: 'Thoughtful kitchen remodeling.',
  websiteUrl: 'https://example.com',
  status: OrganizationStatus.ACTIVE,
  verificationStatus: VerificationStatus.VERIFIED,
  businessProfile: {
    publicSlug: 'example-kitchens',
    publicStatus: BusinessPublicStatus.PUBLISHED,
    serviceArea: { cities: ['Philadelphia'] },
    businessHours: { summary: 'Monday–Friday' },
    contactRoutes: [{ type: 'PHONE', value: '+1 215 555 0100' }],
  },
};

const conversation = {
  id: CONVERSATION_ID,
  organizationId: TENANT_ID,
  accessTokenHash: 'f'.repeat(64),
  status: WardConversationStatus.OPEN,
  turnCount: 0,
  tokenExpiresAt: new Date(Date.now() + 60_000),
  expiresAt: new Date(Date.now() + 120_000),
  lastActivityAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const visitorMessage = {
  id: VISITOR_ID,
  organizationId: TENANT_ID,
  conversationId: CONVERSATION_ID,
  role: WardMessageRole.VISITOR,
  content: 'Do you install cabinets?',
  responseKind: null,
  createdAt: NOW,
};

describe('PublicWardService boundaries', () => {
  const db = {
    organization: { findFirst: jest.fn() },
    wardConversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      deleteMany: jest.fn(),
    },
    wardMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    wardMessageSource: { createMany: jest.fn() },
    businessKnowledgeRecord: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const ai = { runWardCompletion: jest.fn() };
  let service: PublicWardService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.organization.findFirst.mockResolvedValue(tenant);
    db.wardConversation.findFirst.mockResolvedValue(conversation);
    db.wardConversation.updateMany.mockResolvedValue({ count: 1 });
    db.wardConversation.update.mockResolvedValue(conversation);
    db.wardConversation.findUniqueOrThrow.mockResolvedValue({
      status: WardConversationStatus.OPEN,
      turnCount: 1,
    });
    db.wardMessage.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      data.role === WardMessageRole.VISITOR
        ? { ...visitorMessage, content: data.content as string }
        : {
            id: WARD_ID,
            organizationId: TENANT_ID,
            conversationId: CONVERSATION_ID,
            role: WardMessageRole.WARD,
            content: data.content as string,
            responseKind: data.responseKind as WardResponseKind,
            createdAt: NOW,
          },
    );
    db.wardMessage.findMany.mockResolvedValue([]);
    db.wardMessage.findUniqueOrThrow.mockImplementation(async () => ({
      id: WARD_ID,
      organizationId: TENANT_ID,
      conversationId: CONVERSATION_ID,
      role: WardMessageRole.WARD,
      content: 'We install cabinets [S1].',
      responseKind: WardResponseKind.GROUNDED,
      createdAt: NOW,
      sources: [{
        sourceTitle: 'Cabinet installation',
        sourceUrl: 'https://example.com/cabinets',
        sourceReviewedAt: NOW,
      }],
    }));
    db.wardMessageSource.createMany.mockResolvedValue({ count: 1 });
    db.$transaction.mockImplementation(async (work: (tx: typeof db) => unknown) => work(db));
    service = new PublicWardService(
      { db } as unknown as PrismaService,
      ai as unknown as AiRequestsService,
    );
  });

  it('stores only a digest of the opaque conversation token', async () => {
    db.wardConversation.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...conversation,
      accessTokenHash: data.accessTokenHash,
      messages: [{
        id: WARD_ID,
        role: WardMessageRole.WARD,
        content: 'How can we help?',
        responseKind: WardResponseKind.OPENING,
        createdAt: NOW,
      }],
    }));

    const result = await service.startConversation('example-kitchens');
    const createData = db.wardConversation.create.mock.calls[0][0].data;
    expect(result.accessToken).toBeDefined();
    expect(createData.accessTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createData.accessTokenHash).not.toBe(result.accessToken);
  });

  it('conceals a conversation when the token or tenant scope does not match', async () => {
    db.wardConversation.findFirst.mockResolvedValue(null);
    await expect(
      service.getConversation('example-kitchens', CONVERSATION_ID, TOKEN),
    ).rejects.toThrow(NotFoundException);
    expect(db.wardMessage.findMany).not.toHaveBeenCalled();
  });

  it('returns an honest unknown without spending when no approved source is relevant', async () => {
    db.businessKnowledgeRecord.findMany.mockResolvedValue([]);
    db.wardMessage.findUniqueOrThrow.mockResolvedValue({
      id: WARD_ID,
      role: WardMessageRole.WARD,
      content: "I don't know from Example Kitchens's approved information. A person at the business can help with that.",
      responseKind: WardResponseKind.UNKNOWN,
      createdAt: NOW,
      sources: [],
    });
    db.wardConversation.findUniqueOrThrow.mockResolvedValue({
      status: WardConversationStatus.ESCALATION_OFFERED,
      turnCount: 1,
    });

    const result = await service.sendMessage(
      'example-kitchens',
      CONVERSATION_ID,
      TOKEN,
      'Do you repair commercial elevators?',
    );

    expect(ai.runWardCompletion).not.toHaveBeenCalled();
    expect(result.message.responseKind).toBe(WardResponseKind.UNKNOWN);
    expect(result.humanContact).toMatchObject({ type: 'PHONE' });
  });

  it('queries only current approved tenant knowledge and snapshots exact cited attribution', async () => {
    db.businessKnowledgeRecord.findMany.mockResolvedValue([{
      id: '66666666-6666-4666-8666-666666666666',
      organizationId: TENANT_ID,
      title: 'Cabinet installation',
      summary: 'Cabinet installation is available.',
      content: 'We install cabinets for kitchen remodeling projects.',
      knowledgeType: BusinessKnowledgeType.SERVICE,
      status: BusinessKnowledgeStatus.APPROVED,
      sourceUrl: 'https://example.com/cabinets',
      reviewedAt: NOW,
    }]);
    ai.runWardCompletion.mockResolvedValue({
      content: 'We install cabinets [S1].',
      requestId: 'request-1',
    });

    const result = await service.sendMessage(
      'example-kitchens',
      CONVERSATION_ID,
      TOKEN,
      'Do you install cabinets?',
    );

    expect(db.businessKnowledgeRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: TENANT_ID,
        status: BusinessKnowledgeStatus.APPROVED,
        nextReviewAt: expect.objectContaining({ gt: expect.any(Date) }),
      }),
    }));
    expect(ai.runWardCompletion).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: TENANT_ID,
      wardConversationId: CONVERSATION_ID,
    }));
    expect(db.wardMessageSource.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        organizationId: TENANT_ID,
        knowledgeRecordId: '66666666-6666-4666-8666-666666666666',
        sourceContentSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      })],
    });
    expect(result.message.sources[0].title).toBe('Cabinet installation');
  });

  it('never sends crisis language to the provider and gives the emergency-service boundary', async () => {
    db.wardMessage.findUniqueOrThrow.mockResolvedValue({
      id: WARD_ID,
      role: WardMessageRole.WARD,
      content: 'Aureus is not an emergency service. Call 911 or contact 988 now.',
      responseKind: WardResponseKind.SAFETY,
      createdAt: NOW,
      sources: [],
    });
    const result = await service.sendMessage(
      'example-kitchens',
      CONVERSATION_ID,
      TOKEN,
      'I want to kill myself',
    );
    expect(ai.runWardCompletion).not.toHaveBeenCalled();
    expect(db.businessKnowledgeRecord.findMany).not.toHaveBeenCalled();
    expect(result.message.content).toContain('988');
    expect(result.message.content).toContain('911');
  });

  it('does not expose unsafe legacy links on the public surface', async () => {
    db.organization.findFirst.mockResolvedValue({
      ...tenant,
      businessProfile: {
        ...tenant.businessProfile,
        contactRoutes: [{ type: 'WEBSITE', value: 'javascript:alert(1)' }],
      },
    });

    const profile = await service.getPublicProfile('example-kitchens');
    expect(profile.contactRoutes).toEqual([]);

    db.wardMessage.findMany.mockResolvedValue([{
      id: WARD_ID,
      role: WardMessageRole.WARD,
      content: 'Cabinets are available [S1].',
      responseKind: WardResponseKind.GROUNDED,
      createdAt: NOW,
      sources: [{
        sourceTitle: 'Cabinet installation',
        sourceUrl: 'javascript:alert(1)',
        sourceReviewedAt: NOW,
      }],
    }]);
    const resumed = await service.getConversation('example-kitchens', CONVERSATION_ID, TOKEN);
    expect(resumed.messages[0].sources[0].url).toBeNull();
  });

  it('never crosses to a different tenant even when a conversation UUID is known', async () => {
    db.organization.findFirst.mockResolvedValue({ ...tenant, id: OTHER_TENANT_ID });
    db.wardConversation.findFirst.mockResolvedValue(null);

    await expect(
      service.sendMessage('example-kitchens', CONVERSATION_ID, TOKEN, 'Hello'),
    ).rejects.toThrow(NotFoundException);
    expect(db.wardConversation.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ organizationId: OTHER_TENANT_ID }),
    });
    expect(db.wardMessage.create).not.toHaveBeenCalled();
  });
});
