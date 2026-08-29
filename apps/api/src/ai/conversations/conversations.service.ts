import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { AiCapability, AiMessageRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PLATFORM_ASSISTANT_SYSTEM_PROMPT } from '../prompts/system-prompts.util';
import { INTERFACE_TOOL_SPECS } from '../common/interface-tools';
import type { AiCompletionMessage } from '../providers/ai-provider.interface';
import { AiRequestsService } from '../requests/ai-requests.service';
import { NeedsService } from '../../needs/needs.service';
import { isAmbiguousNeed, CLARIFYING_QUESTION } from '../../needs/ambiguity.util';
import { isCrisisLanguage, CRISIS_REDIRECT_MESSAGE } from '../../needs/crisis-detection.util';
import { isOutcomeUnclear, OUTCOME_QUESTION } from '../../needs/outcome.util';
import {
  isOpportunityActionRequest,
  OpportunityLinkRegistryService,
} from '../../opportunities/opportunity-link-registry.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { PaginatedConversationsResponseDto } from './dto/paginated-conversations-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import {
  currentDateTimeContext,
  directHallReply,
  ensureVisibleAssistantContent,
  isConversationalTurnWithoutNeed,
} from './conversation-turn.util';
import {
  AI_CONVERSATION_REPOSITORY,
  IAiConversationRepository,
} from './repositories/ai-conversation.repository.interface';
import { AI_MESSAGE_REPOSITORY, IAiMessageRepository } from './repositories/ai-message.repository.interface';

const RECENT_MESSAGE_HISTORY_LIMIT = 20;
const MEMBER_HELP_SCOPE = `The Hall is also the member's general first step for real-life help. Requests about money, bills, utilities, housing, food, employment, benefits, transportation, healthcare, education, legal-help preparation, family logistics, and similar stability or flourishing needs are in scope even when they are not questions about the Aureus software itself. Do not reject those requests as unrelated trivia. Respond help-first and understand before recommending. If a necessary fact is missing, briefly acknowledge the concrete need and ask one natural, targeted question instead of listing possible programs, strategies, or categories. Ask no more than one question at a time unless a few short facts are inseparable and easy to answer together. Once the problem is understood, lead with the single strongest grounded next step and help carry it through; mention alternatives only if that path does not fit or the member asks. Keep ordinary replies to one short paragraph or a few sentences. Never invent local eligibility, provider availability, deadlines, phone numbers, or commitments you have not been given. The platform-action limits in the other system instructions still apply.`;

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @Inject(AI_CONVERSATION_REPOSITORY) private readonly repo: IAiConversationRepository,
    @Inject(AI_MESSAGE_REPOSITORY) private readonly messageRepo: IAiMessageRepository,
    private readonly aiRequests: AiRequestsService,
    private readonly needs: NeedsService,
    // Optional only so older isolated unit harnesses that instantiate this
    // service without the full OpportunitiesModule remain valid. Production
    // AiModule imports OpportunitiesModule, where the registry is guaranteed.
    // The action-intent path still fails closed if this dependency is absent.
    @Optional() private readonly opportunityLinks?: OpportunityLinkRegistryService,
  ) {}

  async create(dto: CreateConversationDto, caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    const conversation = await this.repo.create({ userId: caller.id, title: dto.title });
    this.logger.log(`AI conversation created for user ${caller.id}`);
    return ConversationResponseDto.fromEntity(conversation);
  }

  async findMine(query: ListConversationsQueryDto, caller: AuthenticatedUser): Promise<PaginatedConversationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({ page, limit, userId: caller.id });
    return {
      data: result.data.map(ConversationResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    const conversation = await this.getOwnedOrThrow(id, caller);
    return ConversationResponseDto.fromEntity(conversation);
  }

  async findMessages(id: string, caller: AuthenticatedUser): Promise<MessageResponseDto[]> {
    await this.getOwnedOrThrow(id, caller);
    const messages = await this.messageRepo.findByConversation(id);
    return messages.map(MessageResponseDto.fromEntity);
  }

  /**
   * AI Question Answering — the conversation-memory-grounded capability
   * (PA-006), extended by DOMAIN-007 Founder Decision 1 with the same
   * fixed, backend-owned interface toolset the voice modality already
   * uses: a member who types "show me my opportunities" receives the same
   * safe interface guidance as a member who says it aloud. `toolCalls` on
   * the response is ephemeral (this response only) — the frontend executes
   * them exactly as `VoiceOrchestrator` does for voice; nothing here
   * assumes or requires a follow-up round trip.
   */
  async ask(id: string, dto: AskQuestionDto, caller: AuthenticatedUser): Promise<MessageResponseDto> {
    await this.getOwnedOrThrow(id, caller);

    await this.messageRepo.create({ conversationId: id, role: AiMessageRole.USER, content: dto.content });
    const history = await this.messageRepo.findRecentByConversation(id, RECENT_MESSAGE_HISTORY_LIMIT);
    const firstTurnIsConversation = history.length === 1 && isConversationalTurnWithoutNeed(dto.content);

    // Gate C (C1: Understanding) — the first actual need of a conversation
    // is captured without forcing ordinary greetings/questions into the need
    // ledger. The Hall is allowed to be a conversation before it is intake.
    // Best-effort: a capture failure must never block the response.
    if (history.length === 1 && !firstTurnIsConversation) {
      try {
        await this.needs.capture(caller.id, id, dto.content);
      } catch (error) {
        this.logger.warn(`Failed to capture stated need for conversation ${id}: ${error}`);
      }
    }

    // Gate C (C3: Urgency assessment) — checked on every message, not only
    // the first, since a member may reveal urgency at any point in a
    // conversation. Detection is deterministic and takes priority over C2.
    if (isCrisisLanguage(dto.content)) {
      const redirectMessage = await this.messageRepo.create({
        conversationId: id, role: AiMessageRole.ASSISTANT, content: CRISIS_REDIRECT_MESSAGE,
      });
      await this.repo.touch(id);
      return MessageResponseDto.fromEntity(redirectMessage);
    }

    // These narrow, high-confidence Hall turns must always work even if an
    // external provider is unavailable, constrained, or chooses a tool-only
    // response. This directly covers the founder walkthrough's greeting,
    // date question, and request to talk by voice.
    const directReply = directHallReply(dto.content);
    if (directReply) {
      const assistantMessage = await this.messageRepo.create({
        conversationId: id, role: AiMessageRole.ASSISTANT, content: directReply,
      });
      await this.repo.touch(id);
      return MessageResponseDto.fromEntity(assistantMessage);
    }

    // Issue #95 §1 — a request to act is different from a request to explain.
    // Never send "show me where" to a free-form model and then trust whatever
    // URL appears in prose. Resolve an existing VERIFIED + ACTIVE Opportunity
    // through the server-owned registry, or fail closed with no actionable URL.
    if (isOpportunityActionRequest(dto.content)) {
      const memberContext = history
        .filter((message) => message.role === AiMessageRole.USER)
        .map((message) => message.content)
        .join('\n');
      const resolution = this.opportunityLinks
        ? await this.opportunityLinks.findBestAction(memberContext)
        : { action: null, reason: 'UNVERIFIED' as const };

      const responseContent = resolution.action
        ? `I found a verified place to take the next step for ${resolution.action.title}. Open the verified action below when you're ready.`
        : resolution.reason === 'NO_MATCH'
          ? "I don't have a verified signup link I can safely send from what we've discussed yet. Tell me the specific opportunity or kind of help you want, and I'll narrow it down."
          : "I found something relevant, but I don't have a currently verified signup link I can safely send you yet.";

      const assistantMessage = await this.messageRepo.create({
        conversationId: id,
        role: AiMessageRole.ASSISTANT,
        content: responseContent,
      });
      await this.repo.touch(id);

      const responseDto = MessageResponseDto.fromEntity(assistantMessage);
      if (resolution.action) responseDto.opportunityAction = resolution.action;
      return responseDto;
    }

    // Gate C only applies when the member is actually presenting a need.
    // Greetings and direct questions go to the Steward normally instead of
    // producing an intake-form clarification.
    if (history.length === 1 && !firstTurnIsConversation && isAmbiguousNeed(dto.content)) {
      const clarifyingMessage = await this.messageRepo.create({
        conversationId: id, role: AiMessageRole.ASSISTANT, content: CLARIFYING_QUESTION,
      });
      await this.repo.touch(id);
      return MessageResponseDto.fromEntity(clarifyingMessage);
    }

    if (history.length === 1 && !firstTurnIsConversation && isOutcomeUnclear(dto.content)) {
      const outcomeMessage = await this.messageRepo.create({
        conversationId: id, role: AiMessageRole.ASSISTANT, content: OUTCOME_QUESTION,
      });
      await this.repo.touch(id);
      return MessageResponseDto.fromEntity(outcomeMessage);
    }

    // Keep the stable platform persona as the first system message while
    // composing the Hall's member-help scope and current date/time into the
    // same instruction. This preserves downstream interface-context ordering
    // and avoids making tests or providers depend on a growing stack of
    // separate system messages.
    const systemMessages: AiCompletionMessage[] = [
      {
        role: 'system',
        content: `${PLATFORM_ASSISTANT_SYSTEM_PROMPT}\n\n${MEMBER_HELP_SCOPE}\n\n${currentDateTimeContext()}`,
      },
    ];
    if (dto.interfaceContext) {
      systemMessages.push({
        role: 'system',
        content: `Currently visible on the member's screen: ${dto.interfaceContext}`,
      });
    }

    const { content, toolCalls } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.QUESTION_ANSWERING,
      conversationId: id,
      messages: [
        ...systemMessages,
        ...history.map((m) => ({ role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content })),
      ],
      tools: [...INTERFACE_TOOL_SPECS],
    });

    // Some provider/tool-call responses can legally contain no natural
    // language content. Persisting that value created the tiny blank white
    // assistant bubbles seen in the production Hall. Never persist an empty
    // assistant message: keep any tool calls, but guarantee visible copy.
    const visibleContent = ensureVisibleAssistantContent(content, toolCalls);
    const assistantMessage = await this.messageRepo.create({
      conversationId: id, role: AiMessageRole.ASSISTANT, content: visibleContent,
    });
    await this.repo.touch(id);

    const responseDto = MessageResponseDto.fromEntity(assistantMessage);
    responseDto.toolCalls = toolCalls;
    return responseDto;
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser) {
    const conversation = await this.repo.findById(id);
    if (!conversation) throw new NotFoundException(`Conversation '${id}' not found`);
    if (conversation.userId !== caller.id) {
      throw new ForbiddenException('You may only access your own conversations');
    }
    return conversation;
  }
}
