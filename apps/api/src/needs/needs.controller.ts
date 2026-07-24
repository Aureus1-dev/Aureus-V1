import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NeedsService } from './needs.service';
import { StatedNeedResponseDto } from './dto/stated-need-response.dto';
import { MatchedResourceDto } from './dto/matched-resource.dto';
import { ResourceOfferResponseDto } from './dto/resource-offer-response.dto';
import { RespondToOfferDto } from './dto/respond-to-offer.dto';

@ApiTags('needs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('needs')
export class NeedsController {
  constructor(private readonly service: NeedsService) {}

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
}
