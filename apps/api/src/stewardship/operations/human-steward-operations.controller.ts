import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../auth/strategies/jwt.strategy';
import {
  AssignHumanStewardDto,
  HumanStewardQueueItemDto,
  RequestHumanStewardHandoffDto,
  ResolveHumanStewardRequestDto,
  TriageHumanStewardRequestDto,
} from './human-steward-operations.dto';
import { HumanStewardOperationsService } from './human-steward-operations.service';

@ApiTags('people-steward-operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people/steward-operations')
export class HumanStewardOperationsController {
  constructor(private readonly service: HumanStewardOperationsService) {}

  @Get('queue')
  @ApiOperation({ summary: 'List open Human Steward work visible to the current operator' })
  queue(@Req() req: AuthenticatedRequest): Promise<HumanStewardQueueItemDto[]> {
    return this.service.queue(req.user);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Read one Human Steward request within the operator privacy boundary' })
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.findOne(id, req.user);
  }

  @Post('requests/:id/assign')
  @ApiOperation({ summary: 'Administrator assigns/reassigns current Human Steward ownership' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignHumanStewardDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.assign(id, dto, req.user);
  }

  @Post('requests/:id/acknowledge')
  @ApiOperation({ summary: 'Current Human Steward acknowledges the member request' })
  acknowledge(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.acknowledge(id, req.user);
  }

  @Post('requests/:id/triage')
  @ApiOperation({ summary: 'Record/reassess attributable T0–T3 operational triage' })
  triage(
    @Param('id') id: string,
    @Body() dto: TriageHumanStewardRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.triage(id, dto, req.user);
  }

  @Post('requests/:id/handoff-request')
  @ApiOperation({ summary: 'Request supervised handoff without abandoning current ownership' })
  requestHandoff(
    @Param('id') id: string,
    @Body() dto: RequestHumanStewardHandoffDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.requestHandoff(id, dto, req.user);
  }

  @Post('requests/:id/resolve')
  @ApiOperation({ summary: 'Resolve the Human Steward step without claiming the underlying need resolved' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveHumanStewardRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.resolve(id, dto, req.user);
  }
}
