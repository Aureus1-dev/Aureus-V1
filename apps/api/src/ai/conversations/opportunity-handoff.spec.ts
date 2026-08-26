import { Test } from '@nestjs/testing';
import { AiMessageRole, SourceType, UserRole } from '@prisma/client';
import type { AiConversation, AiMessage } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { NeedsService } from '../../needs/needs.service';
import { OpportunityLinkRegistryService } from '../../opportunities/opportunity-link-registry.service';
import { AiRequestsService } from '../requests/ai-requests.service';
import { ConversationsService } from './conversations.service';
import {
  AI_CONVERSATION_REPOSITORY,
  IAiConversationRepository,
} from './repositories/ai-conversation.repository.interface';
import { AI_MESSAGE_REPOSITORY, IAiMessageRepository } from './repositories/ai-message.repository.interface';

const NOW = new Date('2026-08-25T12:00:00.000Z');
const USER: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'member@example.com',
  roles: [UserRole.MEMBER],
};

const conversation = {
  id: '00000000-0000-0000-0000-000000000010',
  userId: USER.id,
  title: null,
  createdAt: NOW,
  updatedAt: NOW,
} as AiConversation;

function message(id: string, role: AiMessageRole, content: string): AiMessage {
  return { id, conversationId: conversation.id, role, content, createdAt: NOW } as AiMessage;
}

describe('Hall verified opportunity handoff — Issue #95 §1', () => {
  const conversationRepo: jest.Mocked<IAiConversationRepository> = {
    create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), touch: jest.fn(),
  };
  const messageRepo: jest.Mocked<IAiMessageRepository> = {
    create: jest.fn(), createIfNotExists: jest.fn(), findByConversation: jest.fn(), findRecentByConversation: jest.fn(),
  };
  const aiRequests = { runCompletion: jest.fn() } as unknown as jest.Mocked<AiRequestsService>;
  const needs = { capture: jest.fn() } as unknown as jest.Mocked<NeedsService>;
  const links = { findBestAction: jest.fn() } as unknown as jest.Mocked<OpportunityLinkRegistryService>;

  let service: ConversationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: AI_CONVERSATION_REPOSITORY, useValue: conversationRepo },
        { provide: AI_MESSAGE_REPOSITORY, useValue: messageRepo },
        { provide: AiRequestsService, useValue: aiRequests },
        { provide: NeedsService, useValue: needs },
        { provide: OpportunityLinkRegistryService, useValue: links },
      ],
    }).compile();
    service = module.get(ConversationsService);
    conversationRepo.findById.mockResolvedValue(conversation);
  });

  it('show me where to sign up returns the server-verified action and never asks the model for a URL', async () => {
    messageRepo.create
      .mockResolvedValueOnce(message('user-2', AiMessageRole.USER, 'show me where to sign up'))
      .mockResolvedValueOnce(message('assistant-2', AiMessageRole.ASSISTANT, 'verified action'));
    messageRepo.findRecentByConversation.mockResolvedValue([
      message('user-1', AiMessageRole.USER, 'I need help finding a job'),
      message('assistant-1', AiMessageRole.ASSISTANT, 'I can help with that.'),
      message('user-2', AiMessageRole.USER, 'show me where to sign up'),
    ]);
    links.findBestAction.mockResolvedValue({
      reason: 'VERIFIED',
      action: {
        opportunityId: 'opp-1',
        opportunityRef: 'AUR-OPP-000001',
        title: 'Warehouse Associate',
        provider: 'Example Employer',
        url: 'https://example.org/apply',
        canonicalUrl: 'https://example.org/apply',
        referralUrl: null,
        affiliateDisclosure: null,
        eligibility: '18+',
        geography: 'Philadelphia, PA',
        payoutNotes: null,
        timeToCashNotes: null,
        status: 'verified',
        lastVerifiedAt: NOW,
        sourceName: 'Employer careers page',
        sourceUrl: 'https://example.org/jobs',
        sourceType: SourceType.EXTERNAL_SOURCE,
      },
    });

    const result = await service.ask(conversation.id, { content: 'show me where to sign up' }, USER);

    expect(links.findBestAction).toHaveBeenCalledWith(expect.stringContaining('I need help finding a job'));
    expect(result.opportunityAction?.url).toBe('https://example.org/apply');
    expect(result.content).toMatch(/verified place/i);
    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });

  it('refuses stale or unverified link evidence and returns no actionable URL', async () => {
    messageRepo.create
      .mockResolvedValueOnce(message('user-2', AiMessageRole.USER, 'show me where to sign up'))
      .mockResolvedValueOnce(message('assistant-2', AiMessageRole.ASSISTANT, 'not verified'));
    messageRepo.findRecentByConversation.mockResolvedValue([
      message('user-1', AiMessageRole.USER, 'I need help finding a job'),
      message('user-2', AiMessageRole.USER, 'show me where to sign up'),
    ]);
    links.findBestAction.mockResolvedValue({ action: null, reason: 'UNVERIFIED' });

    const result = await service.ask(conversation.id, { content: 'show me where to sign up' }, USER);

    expect(result.opportunityAction).toBeUndefined();
    expect(result.content).toMatch(/don't have a currently verified signup link/i);
    expect(aiRequests.runCompletion).not.toHaveBeenCalled();
  });
});
