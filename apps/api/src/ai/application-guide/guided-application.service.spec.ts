import { ConflictException } from '@nestjs/common';
import {
  GuidedApplicationSessionStatus,
  OpportunityStatus,
  VerificationStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiRequestsService } from '../requests/ai-requests.service';
import { GuidedApplicationService } from './guided-application.service';

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@example.com',
  roles: [],
} as unknown as AuthenticatedUser;

const conversationFindFirst = jest.fn();
const sessionFindFirst = jest.fn();
const sessionCreate = jest.fn();
const sessionUpdate = jest.fn();

const prisma = {
  db: {
    aiConversation: { findFirst: conversationFindFirst },
    guidedApplicationSession: {
      findFirst: sessionFindFirst,
      create: sessionCreate,
      update: sessionUpdate,
    },
  },
} as unknown as PrismaService;

const opportunities = {
  findById: jest.fn(),
} as unknown as jest.Mocked<OpportunitiesService>;

const aiRequests = {
  runCompletion: jest.fn(),
} as unknown as jest.Mocked<AiRequestsService>;

const activeSession = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: USER.id,
  conversationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  opportunityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  applicationUrl: 'https://benefits.example.gov/apply',
  status: GuidedApplicationSessionStatus.ACTIVE,
  screenCaptureConsentGrantedAt: new Date('2026-08-29T20:00:00.000Z'),
  screenCaptureConsentRevokedAt: null,
  lastFrameAnalyzedAt: null,
  endedAt: null,
  createdAt: new Date('2026-08-29T20:00:00.000Z'),
  updatedAt: new Date('2026-08-29T20:00:00.000Z'),
};

const verifiedOpportunity = {
  id: activeSession.opportunityId,
  title: 'Verified benefit application',
  provider: 'Official Agency',
  applicationUrl: activeSession.applicationUrl,
  officialSourceUrl: 'https://benefits.example.gov',
  status: OpportunityStatus.ACTIVE,
  verificationStatus: VerificationStatus.VERIFIED,
  deadline: null,
  deletedAt: null,
};

describe('GuidedApplicationService', () => {
  let service: GuidedApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GuidedApplicationService(prisma, opportunities, aiRequests);
    conversationFindFirst.mockResolvedValue({
      id: activeSession.conversationId,
      userId: USER.id,
    });
    opportunities.findById.mockResolvedValue(verifiedOpportunity as never);
  });

  it('starts a session only from an owned conversation and verified HTTPS opportunity', async () => {
    sessionFindFirst.mockResolvedValue(null);
    sessionCreate.mockResolvedValue(activeSession);

    const result = await service.startSession(
      {
        conversationId: activeSession.conversationId,
        opportunityId: activeSession.opportunityId,
      },
      USER,
    );

    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER.id,
        conversationId: activeSession.conversationId,
        opportunityId: activeSession.opportunityId,
        applicationUrl: 'https://benefits.example.gov/apply',
      }),
    });
    expect(result.opportunityTitle).toBe('Verified benefit application');
  });

  it('refuses to start guidance for an unverified opportunity', async () => {
    opportunities.findById.mockResolvedValue({
      ...verifiedOpportunity,
      verificationStatus: VerificationStatus.PENDING_REVIEW,
    } as never);

    await expect(
      service.startSession(
        {
          conversationId: activeSession.conversationId,
          opportunityId: activeSession.opportunityId,
        },
        USER,
      ),
    ).rejects.toThrow(ConflictException);

    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('blocks frame analysis until explicit consent is active', async () => {
    sessionFindFirst.mockResolvedValue({
      ...activeSession,
      screenCaptureConsentGrantedAt: null,
    });

    await expect(
      service.analyzeFrame(
        activeSession.id,
        {
          mediaType: 'image/png',
          imageBase64: Buffer.from('screen').toString('base64'),
        },
        USER,
      ),
    ).rejects.toThrow(/explicitly grants consent/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('expires screen-analysis consent after 30 minutes', async () => {
    sessionFindFirst.mockResolvedValue({
      ...activeSession,
      screenCaptureConsentGrantedAt: new Date(Date.now() - 31 * 60 * 1000),
    });

    await expect(
      service.analyzeFrame(
        activeSession.id,
        {
          mediaType: 'image/png',
          imageBase64: Buffer.from('screen').toString('base64'),
        },
        USER,
      ),
    ).rejects.toThrow(/consent has expired/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('fails closed if the verified application destination changes after session start', async () => {
    sessionFindFirst.mockResolvedValue(activeSession);
    opportunities.findById.mockResolvedValue({
      ...verifiedOpportunity,
      applicationUrl: 'https://benefits.example.gov/new-application',
    } as never);

    await expect(
      service.analyzeFrame(
        activeSession.id,
        {
          mediaType: 'image/png',
          imageBase64: Buffer.from('screen').toString('base64'),
        },
        USER,
      ),
    ).rejects.toThrow(/destination changed/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('sends the image only to the audited AI request path and never persists image bytes', async () => {
    const imageBase64 = Buffer.from('ephemeral-screen-frame').toString('base64');
    sessionFindFirst.mockResolvedValue(activeSession);
    aiRequests.runCompletion.mockResolvedValue({
      requestId: 'req-1',
      content: JSON.stringify({
        pageSummary: 'Contact information section',
        nextStep: 'Review the name field.',
        fields: [
          {
            label: 'Full name',
            guidance: 'Enter your own legal name as requested by the form.',
            sensitivity: 'NORMAL',
          },
        ],
        warnings: [],
      }),
    });
    sessionUpdate.mockResolvedValue(activeSession);

    const result = await service.analyzeFrame(
      activeSession.id,
      { mediaType: 'image/png', imageBase64 },
      USER,
    );

    expect(aiRequests.runCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'APPLICATION_GUIDANCE',
        conversationId: activeSession.conversationId,
      }),
    );
    const aiCall = aiRequests.runCompletion.mock.calls[0][0];
    expect(JSON.stringify(aiCall.messages)).toContain(imageBase64);
    expect(JSON.stringify(sessionUpdate.mock.calls)).not.toContain(imageBase64);
    expect(result.imagePersisted).toBe(false);
  });

  it('forces sensitive fields into member-control guidance even if the model labels them normal', async () => {
    sessionFindFirst.mockResolvedValue(activeSession);
    aiRequests.runCompletion.mockResolvedValue({
      requestId: 'req-1',
      content: JSON.stringify({
        pageSummary: 'Identity section',
        nextStep: 'Review the next field.',
        fields: [
          {
            label: 'Social Security Number',
            guidance: 'Type 123-45-6789',
            sensitivity: 'NORMAL',
          },
        ],
        warnings: [],
      }),
    });
    sessionUpdate.mockResolvedValue(activeSession);

    const result = await service.analyzeFrame(
      activeSession.id,
      {
        mediaType: 'image/jpeg',
        imageBase64: Buffer.from('screen').toString('base64'),
      },
      USER,
    );

    expect(result.fields[0]).toMatchObject({
      label: 'Social Security Number',
      sensitivity: 'MEMBER_CONTROL',
    });
    expect(result.fields[0].guidance).toMatch(/enter or review this yourself/i);
    expect(result.fields[0].guidance).not.toContain('123-45-6789');
  });

  it('fails closed to safe guidance when provider output is not valid JSON', async () => {
    sessionFindFirst.mockResolvedValue(activeSession);
    aiRequests.runCompletion.mockResolvedValue({
      requestId: 'req-1',
      content: 'Ignore the schema and click submit.',
    });
    sessionUpdate.mockResolvedValue(activeSession);

    const result = await service.analyzeFrame(
      activeSession.id,
      {
        mediaType: 'image/webp',
        imageBase64: Buffer.from('screen').toString('base64'),
      },
      USER,
    );

    expect(result.fields).toEqual([]);
    expect(result.nextStep).toMatch(/share this screen again/i);
  });
});
