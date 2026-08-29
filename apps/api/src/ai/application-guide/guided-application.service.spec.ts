import { ConflictException } from '@nestjs/common';
import {
  GuidedApplicationSessionStatus,
  OpportunityStatus,
  VerificationStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { OpportunityLinkRegistryService } from '../../opportunities/opportunity-link-registry.service';
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

const opportunityLinks = {
  toRegistryEntry: jest.fn(),
} as unknown as jest.Mocked<OpportunityLinkRegistryService>;

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
  screenCaptureConsentGrantedAt: new Date(),
  screenCaptureConsentRevokedAt: null,
  lastFrameAnalyzedAt: null,
  endedAt: null,
  createdAt: new Date('2026-08-29T20:00:00.000Z'),
  updatedAt: new Date('2026-08-29T20:00:00.000Z'),
};

const JPEG_FRAME = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]).toString('base64');
const PNG_FRAME = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]).toString('base64');
const WEBP_FRAME = Buffer.from('RIFFxxxxWEBPscreen', 'ascii').toString('base64');

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
    service = new GuidedApplicationService(
      prisma,
      opportunities,
      opportunityLinks,
      aiRequests,
    );
    conversationFindFirst.mockResolvedValue({
      id: activeSession.conversationId,
      userId: USER.id,
    });
    opportunities.findById.mockResolvedValue(verifiedOpportunity as never);
    opportunityLinks.toRegistryEntry.mockImplementation((opportunity) => ({
      opportunityId: opportunity.id,
      opportunityRef: opportunity.opportunityRef,
      title: opportunity.title,
      provider: opportunity.provider,
      url: opportunity.applicationUrl ?? opportunity.officialSourceUrl,
      canonicalUrl: opportunity.applicationUrl ?? opportunity.officialSourceUrl,
      referralUrl: null,
      affiliateDisclosure: null,
      eligibility: opportunity.eligibilityRules,
      geography: null,
      payoutNotes: null,
      timeToCashNotes: null,
      status:
        opportunity.status === OpportunityStatus.ACTIVE &&
        opportunity.verificationStatus === VerificationStatus.VERIFIED
          ? 'verified'
          : 'disabled',
      lastVerifiedAt: opportunity.dateLastVerified,
      sourceName: opportunity.sourceName,
      sourceUrl: opportunity.sourceUrl,
      sourceType: opportunity.sourceType,
    }));
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

  it('rotates an active session when the canonical application URL changed', async () => {
    sessionFindFirst.mockResolvedValue(activeSession);
    opportunities.findById.mockResolvedValue({
      ...verifiedOpportunity,
      applicationUrl: 'https://benefits.example.gov/new-application',
    } as never);
    sessionUpdate.mockResolvedValue({
      ...activeSession,
      status: GuidedApplicationSessionStatus.ENDED,
    });
    sessionCreate.mockResolvedValue({
      ...activeSession,
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      applicationUrl: 'https://benefits.example.gov/new-application',
    });

    const result = await service.startSession(
      {
        conversationId: activeSession.conversationId,
        opportunityId: activeSession.opportunityId,
      },
      USER,
    );

    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { id: activeSession.id },
      data: expect.objectContaining({
        status: GuidedApplicationSessionStatus.ENDED,
      }),
    });
    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationUrl: 'https://benefits.example.gov/new-application',
      }),
    });
    expect(result.applicationUrl).toBe(
      'https://benefits.example.gov/new-application',
    );
  });

  it('restoring an active session fails closed if the opportunity is no longer verified', async () => {
    sessionFindFirst.mockResolvedValue({
      ...activeSession,
      opportunity: {
        ...verifiedOpportunity,
        verificationStatus: VerificationStatus.PENDING_REVIEW,
      },
    });
    sessionUpdate.mockResolvedValue({
      ...activeSession,
      status: GuidedApplicationSessionStatus.ENDED,
    });

    await expect(
      service.findActive(activeSession.conversationId, USER),
    ).resolves.toBeNull();

    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { id: activeSession.id },
      data: expect.objectContaining({
        status: GuidedApplicationSessionStatus.ENDED,
        screenCaptureConsentRevokedAt: expect.any(Date),
      }),
    });
  });

  it('refuses to start guidance when registry freshness marks the stored link stale', async () => {
    opportunityLinks.toRegistryEntry.mockReturnValue({
      opportunityId: verifiedOpportunity.id,
      opportunityRef: null,
      title: verifiedOpportunity.title,
      provider: verifiedOpportunity.provider,
      url: verifiedOpportunity.applicationUrl,
      canonicalUrl: verifiedOpportunity.applicationUrl,
      referralUrl: null,
      affiliateDisclosure: null,
      eligibility: 'Open',
      geography: null,
      payoutNotes: null,
      timeToCashNotes: null,
      status: 'stale',
      lastVerifiedAt: null,
      sourceName: 'Official source',
      sourceUrl: null,
      sourceType: 'ADMIN_ENTRY',
    } as never);

    await expect(
      service.startSession(
        {
          conversationId: activeSession.conversationId,
          opportunityId: activeSession.opportunityId,
        },
        USER,
      ),
    ).rejects.toThrow(/currently verified application destination/i);

    expect(sessionCreate).not.toHaveBeenCalled();
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

  it('rejects base64 bytes that do not match the declared image type', async () => {
    sessionFindFirst.mockResolvedValue(activeSession);

    await expect(
      service.analyzeFrame(
        activeSession.id,
        {
          mediaType: 'image/png',
          imageBase64: JPEG_FRAME,
        },
        USER,
      ),
    ).rejects.toThrow(/do not match the declared image type/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
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
          imageBase64: PNG_FRAME,
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
          imageBase64: PNG_FRAME,
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
          imageBase64: PNG_FRAME,
        },
        USER,
      ),
    ).rejects.toThrow(/destination changed/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('sends the image only to the audited AI request path and never persists image bytes', async () => {
    const imageBase64 = PNG_FRAME;
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
        imageBase64: JPEG_FRAME,
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
        imageBase64: WEBP_FRAME,
      },
      USER,
    );

    expect(result.fields).toEqual([]);
    expect(result.nextStep).toMatch(/share this screen again/i);
  });
});
