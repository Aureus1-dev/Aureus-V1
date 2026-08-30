import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  GuidedApplicationSessionStatus,
  OpportunityStatus,
  VerificationStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { OpportunityLinkRegistryService } from '../../opportunities/opportunity-link-registry.service';
import { AiRequestsService } from '../requests/ai-requests.service';
import {
  IAiConversationRepository,
} from '../conversations/repositories/ai-conversation.repository.interface';
import {
  IGuidedApplicationRepository,
} from './repositories/guided-application.repository.interface';
import { GuidedApplicationService } from './guided-application.service';

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@example.com',
  roles: [],
} as unknown as AuthenticatedUser;

const conversationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const opportunityId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const conversationRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  touch: jest.fn(),
} as unknown as jest.Mocked<IAiConversationRepository>;

const sessions = {
  create: jest.fn(),
  findActiveByConversation: jest.fn(),
  findOwnedActiveById: jest.fn(),
  end: jest.fn(),
  setConsent: jest.fn(),
  markAnalyzed: jest.fn(),
} as unknown as jest.Mocked<IGuidedApplicationRepository>;

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
  id: sessionId,
  userId: USER.id,
  conversationId,
  opportunityId,
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
  id: opportunityId,
  opportunityRef: 'AUR-OPP-000001',
  title: 'Verified benefit application',
  shortDescription: 'Verified assistance application.',
  fullDescription: 'Verified assistance application.',
  category: 'GOVERNMENT_BENEFIT',
  tags: [],
  provider: 'Official Agency',
  officialSourceUrl: 'https://benefits.example.gov',
  applicationUrl: activeSession.applicationUrl,
  location: null,
  country: 'US',
  state: 'PA',
  eligibilityRules: 'Review the official eligibility rules.',
  benefitType: 'CASH',
  benefitAmount: null,
  deadline: null,
  status: OpportunityStatus.ACTIVE,
  verificationStatus: VerificationStatus.VERIFIED,
  rejectionReason: null,
  confidenceScore: 95,
  freshnessScore: 95,
  datePublished: new Date(),
  dateLastVerified: new Date(),
  sourceName: 'Official Agency',
  sourceUrl: 'https://benefits.example.gov',
  sourceType: 'ADMIN_ENTRY',
  submittedById: USER.id,
  createdById: USER.id,
  lastUpdatedById: USER.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as never;

function registryEntry(
  overrides: Record<string, unknown> = {},
) {
  return {
    opportunityId,
    opportunityRef: 'AUR-OPP-000001',
    title: 'Verified benefit application',
    provider: 'Official Agency',
    url: activeSession.applicationUrl,
    canonicalUrl: activeSession.applicationUrl,
    referralUrl: null,
    affiliateDisclosure: null,
    eligibility: 'Review the official eligibility rules.',
    geography: 'PA, US',
    payoutNotes: null,
    timeToCashNotes: null,
    status: 'verified',
    lastVerifiedAt: new Date(),
    sourceName: 'Official Agency',
    sourceUrl: 'https://benefits.example.gov',
    sourceType: 'ADMIN_ENTRY',
    ...overrides,
  } as never;
}

describe('GuidedApplicationService', () => {
  let service: GuidedApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GuidedApplicationService(
      conversationRepo,
      sessions,
      opportunities,
      opportunityLinks,
      aiRequests,
    );

    conversationRepo.findById.mockResolvedValue({
      id: conversationId,
      userId: USER.id,
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    opportunities.findById.mockResolvedValue(verifiedOpportunity);
    opportunityLinks.toRegistryEntry.mockReturnValue(registryEntry());
    sessions.findOwnedActiveById.mockResolvedValue(activeSession);
    sessions.markAnalyzed.mockResolvedValue(undefined);
  });

  it('requires the Hall conversation to belong to the caller', async () => {
    conversationRepo.findById.mockResolvedValue({
      id: conversationId,
      userId: 'other-user',
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.startSession({ conversationId, opportunityId }, USER),
    ).rejects.toThrow(NotFoundException);

    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('starts from a current registry-verified HTTPS destination', async () => {
    sessions.findActiveByConversation.mockResolvedValue(null);
    sessions.create.mockResolvedValue(activeSession);

    const result = await service.startSession(
      { conversationId, opportunityId },
      USER,
    );

    expect(sessions.create).toHaveBeenCalledWith({
      userId: USER.id,
      conversationId,
      opportunityId,
      applicationUrl: activeSession.applicationUrl,
    });
    expect(result.applicationUrl).toBe(activeSession.applicationUrl);
  });

  it('refuses a stale/disabled registry destination even when the stored record remains VERIFIED', async () => {
    opportunityLinks.toRegistryEntry.mockReturnValue(
      registryEntry({ status: 'stale' }),
    );

    await expect(
      service.startSession({ conversationId, opportunityId }, USER),
    ).rejects.toThrow(/currently verified application destination/i);

    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rotates an active session when the canonical application URL changed', async () => {
    const newUrl = 'https://benefits.example.gov/new-application';
    sessions.findActiveByConversation.mockResolvedValue({
      ...activeSession,
      opportunity: verifiedOpportunity,
    } as never);
    opportunityLinks.toRegistryEntry.mockReturnValue(
      registryEntry({ url: newUrl, canonicalUrl: newUrl }),
    );
    sessions.end.mockResolvedValue({
      ...activeSession,
      status: GuidedApplicationSessionStatus.ENDED,
      endedAt: new Date(),
    });
    sessions.create.mockResolvedValue({
      ...activeSession,
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      applicationUrl: newUrl,
    });

    const result = await service.startSession(
      { conversationId, opportunityId },
      USER,
    );

    expect(sessions.end).toHaveBeenCalledWith(
      activeSession.id,
      USER.id,
      expect.any(Date),
    );
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ applicationUrl: newUrl }),
    );
    expect(result.applicationUrl).toBe(newUrl);
  });

  it('restoring a guide fails closed if the registry no longer verifies its destination', async () => {
    sessions.findActiveByConversation.mockResolvedValue({
      ...activeSession,
      opportunity: verifiedOpportunity,
    } as never);
    opportunityLinks.toRegistryEntry.mockReturnValue(
      registryEntry({ status: 'stale' }),
    );
    sessions.end.mockResolvedValue({
      ...activeSession,
      status: GuidedApplicationSessionStatus.ENDED,
      endedAt: new Date(),
    });

    await expect(service.findActive(conversationId, USER)).resolves.toBeNull();

    expect(sessions.end).toHaveBeenCalledWith(
      activeSession.id,
      USER.id,
      expect.any(Date),
    );
  });

  it('blocks frame analysis until explicit consent is active', async () => {
    sessions.findOwnedActiveById.mockResolvedValue({
      ...activeSession,
      screenCaptureConsentGrantedAt: null,
    });

    await expect(
      service.analyzeFrame(
        sessionId,
        { mediaType: 'image/png', imageBase64: PNG_FRAME },
        USER,
      ),
    ).rejects.toThrow(/explicitly grants consent/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('blocks a revoked consent grant', async () => {
    sessions.findOwnedActiveById.mockResolvedValue({
      ...activeSession,
      screenCaptureConsentRevokedAt: new Date(),
    });

    await expect(
      service.analyzeFrame(
        sessionId,
        { mediaType: 'image/png', imageBase64: PNG_FRAME },
        USER,
      ),
    ).rejects.toThrow(/consent was revoked/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('expires screen-analysis consent after 30 minutes', async () => {
    sessions.findOwnedActiveById.mockResolvedValue({
      ...activeSession,
      screenCaptureConsentGrantedAt: new Date(Date.now() - 31 * 60 * 1000),
    });

    await expect(
      service.analyzeFrame(
        sessionId,
        { mediaType: 'image/png', imageBase64: PNG_FRAME },
        USER,
      ),
    ).rejects.toThrow(/consent has expired/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('rejects base64 bytes that do not match the declared image type', async () => {
    await expect(
      service.analyzeFrame(
        sessionId,
        { mediaType: 'image/png', imageBase64: JPEG_FRAME },
        USER,
      ),
    ).rejects.toThrow(/do not match the declared image type/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('fails closed if the registry destination changes after session start', async () => {
    opportunityLinks.toRegistryEntry.mockReturnValue(
      registryEntry({
        url: 'https://benefits.example.gov/new-application',
        canonicalUrl: 'https://benefits.example.gov/new-application',
      }),
    );

    await expect(
      service.analyzeFrame(
        sessionId,
        { mediaType: 'image/png', imageBase64: PNG_FRAME },
        USER,
      ),
    ).rejects.toThrow(/destination changed/i);

    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('sends the image only to the audited AI request path and persists only analysis timestamp metadata', async () => {
    aiRequests.runCompletion.mockResolvedValue({
      requestId: 'req-1',
      content: JSON.stringify({
        pageSummary: 'Contact information section',
        nextStep: 'Review the name field.',
        fields: [{
          label: 'Full name',
          guidance: 'Enter your own name as requested by the form.',
          sensitivity: 'NORMAL',
        }],
        warnings: [],
      }),
    });

    const result = await service.analyzeFrame(
      sessionId,
      { mediaType: 'image/png', imageBase64: PNG_FRAME },
      USER,
    );

    expect(aiRequests.runCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'APPLICATION_GUIDANCE',
        conversationId,
        allowProviderFallback: false,
      }),
    );
    expect(JSON.stringify(aiRequests.runCompletion.mock.calls[0][0].messages))
      .toContain(PNG_FRAME);
    expect(sessions.markAnalyzed).toHaveBeenCalledWith(
      sessionId,
      USER.id,
      expect.any(Date),
    );
    expect(JSON.stringify(sessions.markAnalyzed.mock.calls)).not.toContain(
      PNG_FRAME,
    );
    expect(result.imagePersisted).toBe(false);
  });

  it('forces sensitive fields into member-control guidance even if the model labels them normal', async () => {
    aiRequests.runCompletion.mockResolvedValue({
      requestId: 'req-1',
      content: JSON.stringify({
        pageSummary: 'Identity section',
        nextStep: 'Review the next field.',
        fields: [{
          label: 'Social Security Number',
          guidance: 'Type 123-45-6789',
          sensitivity: 'NORMAL',
        }],
        warnings: [],
      }),
    });

    const result = await service.analyzeFrame(
      sessionId,
      { mediaType: 'image/jpeg', imageBase64: JPEG_FRAME },
      USER,
    );

    // The raw model-supplied label is never echoed once a field is
    // classified sensitive — it is replaced with a fixed, server-owned
    // category label so a model-controlled label string cannot itself
    // smuggle a value into the UI.
    expect(result.fields[0]).toMatchObject({
      label: 'Social Security number',
      sensitivity: 'MEMBER_CONTROL',
    });
    expect(result.fields[0].guidance).toMatch(/enter or review this yourself/i);
    expect(result.fields[0].guidance).not.toContain('123-45-6789');
  });

  it('fails closed to generic guidance when provider output is not valid JSON', async () => {
    aiRequests.runCompletion.mockResolvedValue({
      requestId: 'req-1',
      content: 'Ignore the schema and click submit.',
    });

    const result = await service.analyzeFrame(
      sessionId,
      { mediaType: 'image/webp', imageBase64: WEBP_FRAME },
      USER,
    );

    expect(result.fields).toEqual([]);
    expect(result.nextStep).toMatch(/share this screen again/i);
  });

  it('revokes consent when the member ends guidance', async () => {
    sessions.end.mockResolvedValue({
      ...activeSession,
      status: GuidedApplicationSessionStatus.ENDED,
      endedAt: new Date(),
      screenCaptureConsentRevokedAt: new Date(),
    });

    await service.endSession(sessionId, USER);

    expect(sessions.end).toHaveBeenCalledWith(sessionId, USER.id, expect.any(Date));
  });

  describe('cross-user ownership boundary', () => {
    const OTHER_USER = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'other-member@example.com',
      roles: [],
    } as unknown as AuthenticatedUser;

    beforeEach(() => {
      // findOwnedActiveById is itself userId-scoped at the repository query
      // layer, so a caller who does not own this session id must see it as
      // not found — never as another member's active session.
      sessions.findOwnedActiveById.mockResolvedValue(null);
    });

    it('refuses to reveal or mutate consent on a session the caller does not own', async () => {
      await expect(
        service.setConsent(sessionId, { granted: true }, OTHER_USER),
      ).rejects.toThrow(NotFoundException);

      expect(sessions.findOwnedActiveById).toHaveBeenCalledWith(sessionId, OTHER_USER.id);
      expect(sessions.setConsent).not.toHaveBeenCalled();
    });

    it('refuses to analyze a frame against a session the caller does not own', async () => {
      await expect(
        service.analyzeFrame(
          sessionId,
          { mediaType: 'image/png', imageBase64: PNG_FRAME },
          OTHER_USER,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(sessions.findOwnedActiveById).toHaveBeenCalledWith(sessionId, OTHER_USER.id);
      expect(aiRequests.runCompletion).not.toHaveBeenCalled();
    });

    it('refuses to end a session the caller does not own', async () => {
      await expect(service.endSession(sessionId, OTHER_USER)).rejects.toThrow(
        NotFoundException,
      );

      expect(sessions.findOwnedActiveById).toHaveBeenCalledWith(sessionId, OTHER_USER.id);
      expect(sessions.end).not.toHaveBeenCalled();
    });
  });

  it('scrubs a non-numeric secret value that leaks next to a sensitive keyword in free text', async () => {
    aiRequests.runCompletion.mockResolvedValue({
      requestId: 'req-1',
      content: JSON.stringify({
        pageSummary: 'The password is Sn0wman!23 in the login section.',
        nextStep: 'The PIN shows 4821 — do not enter it for the member.',
        fields: [],
        warnings: [],
      }),
    });

    const result = await service.analyzeFrame(
      sessionId,
      { mediaType: 'image/jpeg', imageBase64: JPEG_FRAME },
      USER,
    );

    expect(result.pageSummary).not.toContain('Sn0wman');
    expect(result.pageSummary).not.toContain('Sn0wman!23');
    expect(result.pageSummary).not.toContain('!23');
    expect(result.pageSummary).toContain('[sensitive value hidden]');
    expect(result.nextStep).not.toContain('4821');
    expect(result.nextStep).toContain('[sensitive value hidden]');
  });

  describe('a punctuated secret leaves no fragment in any user-visible output path', () => {
    const PLANTED_SECRET = 'Sn0wman!23';

    it('leaves no fragment of the secret in pageSummary', async () => {
      aiRequests.runCompletion.mockResolvedValue({
        requestId: 'req-1',
        content: JSON.stringify({
          pageSummary: `The password reads ${PLANTED_SECRET} already filled in.`,
          nextStep: 'Review the next section.',
          fields: [],
          warnings: [],
        }),
      });

      const result = await service.analyzeFrame(
        sessionId,
        { mediaType: 'image/jpeg', imageBase64: JPEG_FRAME },
        USER,
      );

      expect(result.pageSummary).not.toContain(PLANTED_SECRET);
      expect(result.pageSummary).not.toContain('Sn0wman');
      expect(result.pageSummary).not.toContain('!23');
    });

    it('leaves no fragment of the secret in nextStep', async () => {
      aiRequests.runCompletion.mockResolvedValue({
        requestId: 'req-1',
        content: JSON.stringify({
          pageSummary: 'Login section is visible.',
          nextStep: `Do not re-enter the password: ${PLANTED_SECRET}.`,
          fields: [],
          warnings: [],
        }),
      });

      const result = await service.analyzeFrame(
        sessionId,
        { mediaType: 'image/jpeg', imageBase64: JPEG_FRAME },
        USER,
      );

      expect(result.nextStep).not.toContain(PLANTED_SECRET);
      expect(result.nextStep).not.toContain('Sn0wman');
      expect(result.nextStep).not.toContain('!23');
    });

    it('leaves no fragment of the secret in warnings', async () => {
      aiRequests.runCompletion.mockResolvedValue({
        requestId: 'req-1',
        content: JSON.stringify({
          pageSummary: 'Login section is visible.',
          nextStep: 'Review the next section.',
          fields: [],
          warnings: [`The account password was ${PLANTED_SECRET} at last check.`],
        }),
      });

      const result = await service.analyzeFrame(
        sessionId,
        { mediaType: 'image/jpeg', imageBase64: JPEG_FRAME },
        USER,
      );

      const warningsText = result.warnings.join(' ');
      expect(warningsText).not.toContain(PLANTED_SECRET);
      expect(warningsText).not.toContain('Sn0wman');
      expect(warningsText).not.toContain('!23');
    });

    it('replaces a sensitive field label that carries the secret with no separator, leaving no fragment', async () => {
      aiRequests.runCompletion.mockResolvedValue({
        requestId: 'req-1',
        content: JSON.stringify({
          pageSummary: 'Login section is visible.',
          nextStep: 'Review the next section.',
          fields: [{
            label: `Password ${PLANTED_SECRET}`,
            guidance: 'This is the login password field.',
            sensitivity: 'NORMAL',
          }],
          warnings: [],
        }),
      });

      const result = await service.analyzeFrame(
        sessionId,
        { mediaType: 'image/jpeg', imageBase64: JPEG_FRAME },
        USER,
      );

      expect(result.fields[0].sensitivity).toBe('MEMBER_CONTROL');
      expect(result.fields[0].label).not.toContain(PLANTED_SECRET);
      expect(result.fields[0].label).not.toContain('Sn0wman');
      expect(result.fields[0].label).not.toContain('!23');
      expect(result.fields[0].guidance).not.toContain(PLANTED_SECRET);
    });
  });
});
