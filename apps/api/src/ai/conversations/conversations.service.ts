import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @Inject(AI_CONVERSATION_REPOSITORY) private readonly repo: IAiConversationRepository,
    @Inject(AI_MESSAGE_REPOSITORY) private readonly messageRepo: IAiMessageRepository,
    private readonly aiRequests: AiRequestsService,
    private readonly needs: NeedsService,
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

    const systemMessages: AiCompletionMessage[] = [
      { role: 'system', content: PLATFORM_ASSISTANT_SYSTEM_PROMPT },
      { role: 'system', content: currentDateTimeContext() },
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
