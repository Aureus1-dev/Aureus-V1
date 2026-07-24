import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiCapability, AiMessageRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PLATFORM_ASSISTANT_SYSTEM_PROMPT } from '../prompts/system-prompts.util';
import { INTERFACE_TOOL_SPECS } from '../common/interface-tools';
import type { AiCompletionMessage } from '../providers/ai-provider.interface';
import { AiRequestsService } from '../requests/ai-requests.service';
import { NeedsService } from '../../needs/needs.service';
import { isAmbiguousNeed, CLARIFYING_QUESTION } from '../../needs/ambiguity.util';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { PaginatedConversationsResponseDto } from './dto/paginated-conversations-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
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

    // Gate C (C1: Understanding) — the very first message of a conversation
    // is the member's stated need, captured with no menu navigation
    // involved. Best-effort: a capture failure must never block the actual
    // AI response the member is waiting for.
    if (history.length === 1) {
      try {
        await this.needs.capture(caller.id, id, dto.content);
      } catch (error) {
        this.logger.warn(`Failed to capture stated need for conversation ${id}: ${error}`);
      }

      // Gate C (C2: Clarification) — an ambiguous or incomplete initial need
      // reliably gets a clarifying question, decided deterministically
      // rather than left to the model's judgment (matching the
      // Orchestrator's preference for reliability over a free-form LLM
      // decision). The member answers in the very same conversation — no
      // restart, no new conversation, no lost context.
      if (isAmbiguousNeed(dto.content)) {
        const clarifyingMessage = await this.messageRepo.create({
          conversationId: id, role: AiMessageRole.ASSISTANT, content: CLARIFYING_QUESTION,
        });
        await this.repo.touch(id);
        return MessageResponseDto.fromEntity(clarifyingMessage);
      }
    }

    const systemMessages: AiCompletionMessage[] = [{ role: 'system', content: PLATFORM_ASSISTANT_SYSTEM_PROMPT }];
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

    const assistantMessage = await this.messageRepo.create({
      conversationId: id, role: AiMessageRole.ASSISTANT, content,
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
