import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodMessagesService } from './pod-messages.service';
import { ConversationResponseDto } from '../../communication/messaging/dto/conversation-response.dto';

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
}
