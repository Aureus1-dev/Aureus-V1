import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodMessagesService } from './pod-messages.service';
import { ConversationResponseDto } from '../../communication/messaging/dto/conversation-response.dto';
import { MessageResponseDto } from '../../communication/messaging/dto/message-response.dto';
import { MessageReportResponseDto } from '../../communication/messaging/dto/message-report-response.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pods/:podId/conversation')
export class PodMessagesController {
  constructor(private readonly service: PodMessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Get or start this Pod\'s single group conversation thread (any current ACTIVE member)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  startOrGet(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    return this.service.startOrGetConversation(podId, caller);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'PD-008 — remove any message in this Pod\'s conversation (this Pod\'s Steward or an Administrator only)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteMessage(
    @Param('podId') podId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    return this.service.deleteAnyMessage(podId, messageId, caller);
  }

  @Get('reports')
  @ApiOperation({ summary: 'PD-008 — this Pod\'s reported-content queue (this Pod\'s Steward or an Administrator only)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: [MessageReportResponseDto] })
  listReports(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<MessageReportResponseDto[]> {
    return this.service.listReports(podId, caller);
  }
}
