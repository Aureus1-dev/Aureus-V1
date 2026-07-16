import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodRequestsService } from './pod-requests.service';
import { CreateRequestDto, DecideRequestDto, RequestResponseDto } from './dto/request.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pods/requests')
export class PodRequestsController {
  constructor(private readonly service: PodRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Request to join, leave, be reassigned, or propose a new Pod — Article VIII\'s Freedom of Belonging made concrete' })
  @ApiResponse({ status: 201, type: RequestResponseDto })
  create(@Body() dto: CreateRequestDto, @CurrentUser() caller: AuthenticatedUser): Promise<RequestResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my own Pod requests' })
  @ApiResponse({ status: 200, type: [RequestResponseDto] })
  findMine(@CurrentUser() caller: AuthenticatedUser): Promise<RequestResponseDto[]> {
    return this.service.findMine(caller);
  }

  @Get('for-pod/:podId')
  @ApiOperation({ summary: 'List pending requests targeting this Pod (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: [RequestResponseDto] })
  findForPod(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<RequestResponseDto[]> {
    return this.service.findForPod(podId, caller);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw my own pending request' })
  @ApiParam({ name: 'id', description: 'PodRequest UUID' })
  @ApiResponse({ status: 200, type: RequestResponseDto })
  withdraw(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<RequestResponseDto> {
    return this.service.withdraw(id, caller);
  }

  @Post(':id/decide')
  @ApiOperation({ summary: 'Approve or decline a pending request (target Pod\'s Steward/Admin; PROPOSE_NEW_POD is Admin-only)' })
  @ApiParam({ name: 'id', description: 'PodRequest UUID' })
  @ApiResponse({ status: 200, type: RequestResponseDto })
  decide(@Param('id') id: string, @Body() dto: DecideRequestDto, @CurrentUser() caller: AuthenticatedUser): Promise<RequestResponseDto> {
    return this.service.decide(id, dto, caller);
  }
}
