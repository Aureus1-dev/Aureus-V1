import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { PaginatedConversationsResponseDto } from './dto/paginated-conversations-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageReportResponseDto } from './dto/message-report-response.dto';
import { PaginatedMessagesResponseDto } from './dto/paginated-messages-response.dto';

@ApiTags('communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications/conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Post('stewardship/:relationshipId')
  @ApiOperation({ summary: 'Start (or resume) the conversation for an ACTIVE stewardship relationship (member or steward party)' })
  @ApiParam({ name: 'relationshipId', description: 'Stewardship relationship UUID' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  @ApiResponse({ status: 409, description: 'The relationship is not ACTIVE' })
  startStewardship(
    @Param('relationshipId') relationshipId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    return this.service.startStewardshipConversation(relationshipId, caller);
  }

  @Post('organization/:organizationId/with/:userId')
  @ApiOperation({ summary: 'Start (or resume) a conversation with another representative of the same organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'userId', description: 'Counterpart representative UUID' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  @ApiResponse({ status: 403, description: 'You must be a representative of this organization' })
  startOrganization(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    return this.service.startOrganizationConversation(organizationId, userId, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List your conversations, most recently active first' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: PaginatedConversationsResponseDto })
  findAll(
    @Query('page') page: number | undefined,
    @Query('limit') limit: number | undefined,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedConversationsResponseDto> {
    return this.service.findAllForUser(Number(page) || 1, Number(limit) || 20, caller);
  }

  // Static "moderation/reports" routes are declared before the ':id' route
  // below so Nest/Express matches them first — otherwise ':id' would greedily
  // capture "moderation" as a conversation ID.

  @Get('moderation/reports')
  @ApiOperation({ summary: 'PD-008 — platform-wide OPEN moderation queue, every conversation type (Administrator only)' })
  @ApiResponse({ status: 200, type: [MessageReportResponseDto] })
  listReportsForAdmin(@CurrentUser() caller: AuthenticatedUser): Promise<MessageReportResponseDto[]> {
    return this.service.listReportsForAdmin(caller);
  }

  @Patch('moderation/reports/:reportId')
  @ApiOperation({ summary: 'PD-008 — resolve or dismiss a moderation report (Administrator only)' })
  @ApiParam({ name: 'reportId', description: 'MessageReport UUID' })
  @ApiResponse({ status: 200, type: MessageReportResponseDto })
  resolveReport(
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MessageReportResponseDto> {
    return this.service.resolveReport(reportId, dto, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation by ID (participant or Administrator)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({ status: 403, description: 'You are not a participant in this conversation' })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    return this.service.findById(id, caller);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'List messages in a conversation, newest first (participant or Administrator)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, type: PaginatedMessagesResponseDto })
  findMessages(
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedMessagesResponseDto> {
    return this.service.findMessages(id, query, caller);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message (participant only — sender identity derived from the JWT)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    return this.service.sendMessage(id, dto, caller);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a conversation as read up to now (participant only)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  markRead(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<{ success: true }> {
    return this.service.markRead(id, caller);
  }

  @Delete(':id/messages/:messageId')
  @ApiOperation({ summary: 'PD-008 — delete a message (your own message, or any message if you are a Platform/System Administrator)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    return this.service.deleteMessage(id, messageId, caller);
  }

  @Post(':id/messages/:messageId/report')
  @ApiOperation({ summary: 'PD-008 — report a message for moderation review (participant only)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({ status: 201, type: MessageReportResponseDto })
  reportMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReportMessageDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MessageReportResponseDto> {
    return this.service.reportMessage(id, messageId, dto, caller);
  }
}
