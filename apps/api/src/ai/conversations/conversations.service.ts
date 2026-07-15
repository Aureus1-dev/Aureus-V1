import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiCapability, AiMessageRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PLATFORM_ASSISTANT_SYSTEM_PROMPT } from '../prompts/system-prompts.util';
import { AiRequestsService } from '../requests/ai-requests.service';
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

  /** AI Question Answering — the conversation-memory-grounded capability (PA-006). */
  async ask(id: string, dto: AskQuestionDto, caller: AuthenticatedUser): Promise<MessageResponseDto> {
    await this.getOwnedOrThrow(id, caller);

    await this.messageRepo.create({ conversationId: id, role: AiMessageRole.USER, content: dto.content });
    const history = await this.messageRepo.findRecentByConversation(id, RECENT_MESSAGE_HISTORY_LIMIT);

    const { content } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.QUESTION_ANSWERING,
      conversationId: id,
      messages: [
        { role: 'system', content: PLATFORM_ASSISTANT_SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content })),
      ],
    });

    const assistantMessage = await this.messageRepo.create({
      conversationId: id, role: AiMessageRole.ASSISTANT, content,
    });
    await this.repo.touch(id);

    return MessageResponseDto.fromEntity(assistantMessage);
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
