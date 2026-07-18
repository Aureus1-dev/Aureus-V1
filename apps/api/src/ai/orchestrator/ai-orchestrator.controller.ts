import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { OrchestrateRequestDto } from './dto/orchestrate-request.dto';
import { OrchestrateResponseDto } from './dto/orchestrate-response.dto';
import { ListOrchestrationRunsQueryDto } from './dto/list-orchestration-runs-query.dto';
import { PaginatedOrchestrationRunsResponseDto } from './dto/paginated-orchestration-runs-response.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiOrchestratorController {
  constructor(private readonly service: AiOrchestratorService) {}

  @Post('orchestrate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'AI Orchestrator — routes a goal to the right existing AI capability, coordinating across domains and recording an auditable, explainable outcome (self-scoped)' })
  @ApiResponse({ status: 201, type: OrchestrateResponseDto })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  orchestrate(
    @Body() dto: OrchestrateRequestDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OrchestrateResponseDto> {
    return this.service.orchestrate(dto, caller);
  }

  @Get('orchestration/runs/me')
  @ApiOperation({ summary: "List the caller's own AI orchestration run history" })
  @ApiResponse({ status: 200, type: PaginatedOrchestrationRunsResponseDto })
  findMine(
    @Query() query: ListOrchestrationRunsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedOrchestrationRunsResponseDto> {
    return this.service.findMine(query, caller);
  }

  @Get('orchestration/runs')
  @ApiOperation({ summary: 'List every AI orchestration run platform-wide (Platform / System Administrator)' })
  @ApiResponse({ status: 200, type: PaginatedOrchestrationRunsResponseDto })
  findAllAdmin(
    @Query() query: ListOrchestrationRunsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedOrchestrationRunsResponseDto> {
    return this.service.findAllAdmin(query, caller);
  }
}
