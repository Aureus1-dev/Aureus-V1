import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodEscalationsService } from './pod-escalations.service';
import { CreateEscalationDto } from '../../stewardship/escalations/dto/create-escalation.dto';
import { EscalationResponseDto } from '../../stewardship/escalations/dto/escalation-response.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pods/:podId/escalations')
export class PodEscalationsController {
  constructor(private readonly service: PodEscalationsService) {}

  @Post()
  @ApiOperation({ summary: 'Raise a confidential request for additional stewardship — any active Pod member, never an accusation (Founder Decision #4)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 201, type: EscalationResponseDto })
  create(@Param('podId') podId: string, @Body() dto: CreateEscalationDto, @CurrentUser() caller: AuthenticatedUser): Promise<EscalationResponseDto> {
    return this.service.create(podId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List escalations for this Pod (this Pod\'s Steward or Admin only — never the member concerned)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: [EscalationResponseDto] })
  findForPod(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<EscalationResponseDto[]> {
    return this.service.findForPod(podId, caller);
  }
}
