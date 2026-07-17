import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardActivityLogService } from './steward-activity-log.service';
import { ListActivityQueryDto } from './dto/list-activity-query.dto';
import { PaginatedActivityResponseDto } from './dto/paginated-activity-response.dto';

@ApiTags('connected-experiences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('steward-activity')
export class StewardActivityLogController {
  constructor(private readonly service: StewardActivityLogService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's own Steward activity history (connections, revocations, document actions)" })
  @ApiResponse({ status: 200, type: PaginatedActivityResponseDto })
  findMine(
    @Query() query: ListActivityQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedActivityResponseDto> {
    return this.service.findMine(query, caller);
  }
}
