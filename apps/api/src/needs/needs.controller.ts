import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NeedsService } from './needs.service';
import { StatedNeedResponseDto } from './dto/stated-need-response.dto';
import { MatchedResourceDto } from './dto/matched-resource.dto';

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
}
