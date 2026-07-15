import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AiRequestsService } from './ai-requests.service';
import { ListAiRequestsQueryDto } from './dto/list-ai-requests-query.dto';
import { AiRequestResponseDto } from './dto/ai-request-response.dto';
import { PaginatedAiRequestsResponseDto } from './dto/paginated-ai-requests-response.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/requests')
export class AiRequestsController {
  constructor(private readonly service: AiRequestsService) {}

  @Get('me')
  @ApiOperation({ summary: "List the caller's AI request history (audit log, cost, token usage)" })
  @ApiResponse({ status: 200, type: PaginatedAiRequestsResponseDto })
  findMine(
    @Query() query: ListAiRequestsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedAiRequestsResponseDto> {
    return this.service.findMine(query, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an AI request by UUID (owner, Platform/System Administrator)' })
  @ApiParam({ name: 'id', description: 'AI request UUID' })
  @ApiResponse({ status: 200, type: AiRequestResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this request' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<AiRequestResponseDto> {
    return this.service.findById(id, caller);
  }
}
