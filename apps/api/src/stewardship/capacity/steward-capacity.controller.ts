import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardCapacityService } from './steward-capacity.service';
import { UpdateCapacityDto } from './dto/update-capacity.dto';
import { CapacityResponseDto } from './dto/capacity-response.dto';

@ApiTags('stewardship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stewardship/capacities/:stewardId')
export class StewardCapacityController {
  constructor(private readonly service: StewardCapacityService) {}

  @Get()
  @ApiOperation({ summary: "Get a steward's active-member capacity (self or Admin)" })
  @ApiParam({ name: 'stewardId', description: 'Steward user UUID' })
  @ApiResponse({ status: 200, type: CapacityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'You may only view your own capacity' })
  findOne(
    @Param('stewardId') stewardId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CapacityResponseDto> {
    return this.service.findByStewardId(stewardId, caller);
  }

  @Patch()
  @ApiOperation({ summary: "Set a steward's maximum active-member capacity (Platform/System Administrator only)" })
  @ApiParam({ name: 'stewardId', description: 'Steward user UUID' })
  @ApiResponse({ status: 200, type: CapacityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Only a Platform/System Administrator may change a steward\'s capacity' })
  update(
    @Param('stewardId') stewardId: string,
    @Body() dto: UpdateCapacityDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CapacityResponseDto> {
    return this.service.update(stewardId, dto.maxActiveMembers, caller);
  }
}
