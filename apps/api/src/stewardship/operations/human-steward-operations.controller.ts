import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
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
  queue(@CurrentUser() caller: AuthenticatedUser): Promise<HumanStewardQueueItemDto[]> {
    return this.service.queue(caller);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Read one Human Steward request within the operator privacy boundary' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.findOne(id, caller);
  }

  @Post('requests/:id/assign')
  @ApiOperation({ summary: 'Administrator assigns/reassigns current Human Steward ownership' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignHumanStewardDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.assign(id, dto, caller);
  }

  @Post('requests/:id/acknowledge')
  @ApiOperation({ summary: 'Current Human Steward acknowledges the member request' })
  acknowledge(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.acknowledge(id, caller);
  }

  @Post('requests/:id/triage')
  @ApiOperation({ summary: 'Record/reassess attributable T0–T3 operational triage' })
  triage(
    @Param('id') id: string,
    @Body() dto: TriageHumanStewardRequestDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.triage(id, dto, caller);
  }

  @Post('requests/:id/handoff-request')
  @ApiOperation({ summary: 'Request supervised handoff without abandoning current ownership' })
  requestHandoff(
    @Param('id') id: string,
    @Body() dto: RequestHumanStewardHandoffDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.requestHandoff(id, dto, caller);
  }

  @Post('requests/:id/resolve')
  @ApiOperation({ summary: 'Resolve the Human Steward step without claiming the underlying need resolved' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveHumanStewardRequestDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    return this.service.resolve(id, dto, caller);
  }
}
