import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import {
  AnalyzeGuidedApplicationFrameDto,
  GuidedApplicationAnalysisResponseDto,
  GuidedApplicationConsentDto,
  GuidedApplicationSessionResponseDto,
  StartGuidedApplicationSessionDto,
} from './application-guide.dto';
import { GuidedApplicationService } from './guided-application.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/application-guide/sessions')
export class GuidedApplicationController {
  constructor(private readonly service: GuidedApplicationService) {}

  @Post()
  @ApiOperation({
    summary:
      'Start or resume guidance for a VERIFIED + ACTIVE opportunity in an owned Hall conversation',
  })
  @ApiResponse({ status: 201, type: GuidedApplicationSessionResponseDto })
  start(
    @Body() dto: StartGuidedApplicationSessionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuidedApplicationSessionResponseDto> {
    return this.service.startSession(dto, caller);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the active application guidance context for an owned Hall conversation' })
  active(
    @Query('conversationId') conversationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuidedApplicationSessionResponseDto | null> {
    return this.service.findActive(conversationId, caller);
  }

  @Post(':id/consent')
  @ApiOperation({ summary: 'Explicitly grant or revoke ephemeral screen-analysis consent' })
  consent(
    @Param('id') id: string,
    @Body() dto: GuidedApplicationConsentDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuidedApplicationSessionResponseDto> {
    return this.service.setConsent(id, dto, caller);
  }

  @Post(':id/analyze')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Analyze one member-authorized, ephemeral screen frame. The image bytes are not persisted.',
  })
  @ApiResponse({ status: 201, type: GuidedApplicationAnalysisResponseDto })
  analyze(
    @Param('id') id: string,
    @Body() dto: AnalyzeGuidedApplicationFrameDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GuidedApplicationAnalysisResponseDto> {
    return this.service.analyzeFrame(id, dto, caller);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End guidance and revoke any active screen-analysis consent' })
  async end(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<{ ended: true }> {
    await this.service.endSession(id, caller);
    return { ended: true };
  }
}
