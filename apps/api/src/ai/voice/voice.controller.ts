import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { VoiceSessionService } from './voice-session.service';
import { StartVoiceSessionDto } from './dto/start-voice-session.dto';
import { VoiceSessionResponseDto } from './dto/voice-session-response.dto';
import { SyncVoiceEventsDto } from './dto/sync-voice-events.dto';
import { SyncVoiceEventsResponseDto } from './dto/sync-voice-events-response.dto';
import { VoiceSessionStatusResponseDto } from './dto/voice-session-status-response.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/voice/sessions')
export class VoiceController {
  constructor(private readonly service: VoiceSessionService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start a realtime voice session — brokers a short-lived, member-scoped provider credential. The permanent provider key never reaches the client.' })
  @ApiResponse({ status: 201, type: VoiceSessionResponseDto })
  start(
    @Body() dto: StartVoiceSessionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<VoiceSessionResponseDto> {
    return this.service.startSession(dto, caller);
  }

  @Post(':id/events')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sync finalized messages and Conversation Timing Layer turn events for a voice session (owner only). Never accepts partial/unstable transcripts.' })
  @ApiParam({ name: 'id', description: 'Voice session UUID' })
  @ApiResponse({ status: 201, type: SyncVoiceEventsResponseDto })
  syncEvents(
    @Param('id') id: string,
    @Body() dto: SyncVoiceEventsDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SyncVoiceEventsResponseDto> {
    return this.service.syncEvents(id, dto, caller);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a voice session (owner only). Idempotent.' })
  @ApiParam({ name: 'id', description: 'Voice session UUID' })
  @ApiResponse({ status: 201, type: VoiceSessionStatusResponseDto })
  end(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<VoiceSessionStatusResponseDto> {
    return this.service.endSession(id, caller);
  }
}
