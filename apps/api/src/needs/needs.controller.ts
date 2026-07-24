import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NeedsService } from './needs.service';
import { NeedEscalationsService } from './need-escalations.service';
import { StatedNeedResponseDto } from './dto/stated-need-response.dto';
import { MatchedResourceDto } from './dto/matched-resource.dto';
import { ResourceOfferResponseDto } from './dto/resource-offer-response.dto';
import { RespondToOfferDto } from './dto/respond-to-offer.dto';
import { EscalateNeedDto } from './dto/escalate-need.dto';
import { ResolveNeedEscalationDto } from './dto/resolve-need-escalation.dto';
import { NeedEscalationResponseDto } from './dto/need-escalation-response.dto';

@ApiTags('needs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('needs')
export class NeedsController {
  constructor(
    private readonly service: NeedsService,
    private readonly escalations: NeedEscalationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the caller's own stated needs (Gate C — C1: Understanding)" })
  @ApiResponse({ status: 200, type: [StatedNeedResponseDto] })
  findMine(@CurrentUser() caller: AuthenticatedUser): Promise<StatedNeedResponseDto[]> {
    return this.service.findMine(caller.id);
  }

  @Get(':id/resources')
  @ApiOperation({ summary: 'Retrieve City Sheet resources matched to this stated need (Gate C — C4: Resource discovery)' })
  @ApiParam({ name: 'id', description: 'Stated need ID' })
  @ApiResponse({ status: 200, type: [MatchedResourceDto] })
  @ApiResponse({ status: 403, description: 'Caller does not own this stated need' })
  @ApiResponse({ status: 404, description: 'Stated need not found' })
  findMatchingResources(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MatchedResourceDto[]> {
    return this.service.findMatchingResources(id, caller.id);
  }

  @Post(':id/resources/:entryId/offer')
  @ApiOperation({ summary: 'Record that a matched resource was offered to the member (Gate C — C5: Verified resource presentation)' })
  @ApiParam({ name: 'id', description: 'Stated need ID' })
  @ApiParam({ name: 'entryId', description: 'City Sheet entry ID' })
  @ApiResponse({ status: 201, type: ResourceOfferResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this stated need' })
  @ApiResponse({ status: 404, description: 'Stated need or City Sheet entry not found' })
  offerResource(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceOfferResponseDto> {
    return this.service.offerResource(id, entryId, caller.id);
  }

  @Post(':id/resources/:entryId/respond')
  @ApiOperation({ summary: "Record the member's acceptance or refusal of an offered resource (Gate C — C5)" })
  @ApiParam({ name: 'id', description: 'Stated need ID' })
  @ApiParam({ name: 'entryId', description: 'City Sheet entry ID' })
  @ApiResponse({ status: 201, type: ResourceOfferResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this stated need' })
  @ApiResponse({ status: 404, description: 'No pending offer found for this resource' })
  respondToOffer(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: RespondToOfferDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceOfferResponseDto> {
    return this.service.respondToOffer(id, entryId, dto.accepted, caller.id);
  }

  @Get(':id/offers')
  @ApiOperation({ summary: 'List every offer and response recorded for this stated need (Gate C — C5)' })
  @ApiParam({ name: 'id', description: 'Stated need ID' })
  @ApiResponse({ status: 200, type: [ResourceOfferResponseDto] })
  findOffers(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceOfferResponseDto[]> {
    return this.service.findOffers(id, caller.id);
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Ask for a human steward on this stated need — always the member\'s own choice (Gate C — C6: Steward escalation)' })
  @ApiParam({ name: 'id', description: 'Stated need ID' })
  @ApiResponse({ status: 201, type: NeedEscalationResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this stated need' })
  @ApiResponse({ status: 404, description: 'Stated need not found' })
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateNeedDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<NeedEscalationResponseDto> {
    return this.escalations.escalate(id, dto.reason, caller.id);
  }

  @Get(':id/escalations')
  @ApiOperation({ summary: 'List every escalation and its outcome for this stated need (Gate C — C6)' })
  @ApiParam({ name: 'id', description: 'Stated need ID' })
  @ApiResponse({ status: 200, type: [NeedEscalationResponseDto] })
  findEscalations(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<NeedEscalationResponseDto[]> {
    return this.escalations.findEscalations(id, caller.id);
  }

  @Post('escalations/:escalationId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a member escalation (Steward / Platform Administrator only) (Gate C — C6)' })
  @ApiParam({ name: 'escalationId', description: 'Escalation ID' })
  @ApiResponse({ status: 201, type: NeedEscalationResponseDto })
  @ApiResponse({ status: 403, description: 'Caller is not a Steward or Platform Administrator' })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  acknowledgeEscalation(
    @Param('escalationId') escalationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<NeedEscalationResponseDto> {
    return this.escalations.acknowledge(escalationId, caller);
  }

  @Post('escalations/:escalationId/resolve')
  @ApiOperation({ summary: 'Record the outcome of a member escalation (Steward / Platform Administrator only) (Gate C — C6)' })
  @ApiParam({ name: 'escalationId', description: 'Escalation ID' })
  @ApiResponse({ status: 201, type: NeedEscalationResponseDto })
  @ApiResponse({ status: 403, description: 'Caller is not a Steward or Platform Administrator' })
  @ApiResponse({ status: 404, description: 'Escalation not found' })
  resolveEscalation(
    @Param('escalationId') escalationId: string,
    @Body() dto: ResolveNeedEscalationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<NeedEscalationResponseDto> {
    return this.escalations.resolve(escalationId, dto.resolutionNotes, caller);
  }
}
