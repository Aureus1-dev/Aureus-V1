import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { PaginatedConversationsResponseDto } from './dto/paginated-conversations-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new AI conversation' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  create(
    @Body() dto: CreateConversationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List the caller's AI conversations" })
  @ApiResponse({ status: 200, type: PaginatedConversationsResponseDto })
  findAll(
    @Query() query: ListConversationsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedConversationsResponseDto> {
    return this.service.findMine(query, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation by UUID (owner only)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    return this.service.findById(id, caller);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: "List a conversation's messages, oldest first (owner only)" })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  findMessages(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MessageResponseDto[]> {
    return this.service.findMessages(id, caller);
  }

  @Post(':id/messages')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ask a question in this conversation — AI Question Answering (owner only)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  ask(
    @Param('id') id: string,
    @Body() dto: AskQuestionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    return this.service.ask(id, dto, caller);
  }
}
