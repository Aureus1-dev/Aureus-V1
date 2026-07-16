import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PodsService } from './pods.service';
import { CreatePodDto } from './dto/create-pod.dto';
import { UpdatePodDto } from './dto/update-pod.dto';
import { ListPodsQueryDto } from './dto/list-pods-query.dto';
import { PodResponseDto } from './dto/pod-response.dto';
import { PaginatedPodsResponseDto } from './dto/paginated-pods-response.dto';
import { CREATOR_ROLES } from './common/pods-roles.util';

@ApiTags('pods')
@Controller('pods')
export class PodsController {
  constructor(private readonly service: PodsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CREATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Pod (Steward / Admin)' })
  @ApiResponse({ status: 201, type: PodResponseDto })
  create(@Body() dto: CreatePodDto, @CurrentUser() caller: AuthenticatedUser): Promise<PodResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List/search Pods (default: ACTIVE only)' })
  @ApiResponse({ status: 200, type: PaginatedPodsResponseDto })
  findAll(@Query() q: ListPodsQueryDto): Promise<PaginatedPodsResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @ApiOperation({ summary: 'Get a Pod by stable reference (e.g. AUR-POD-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-POD-000001' })
  @ApiResponse({ status: 200, type: PodResponseDto })
  findByRef(@Param('ref') ref: string): Promise<PodResponseDto> {
    return this.service.findByRef(ref);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Pod by UUID' })
  @ApiParam({ name: 'id', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: PodResponseDto })
  findOne(@Param('id') id: string): Promise<PodResponseDto> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a Pod (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: PodResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdatePodDto, @CurrentUser() caller: AuthenticatedUser): Promise<PodResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'FORMING/DORMANT → ACTIVE (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: PodResponseDto })
  @ApiResponse({ status: 409, description: 'Pod is not FORMING or DORMANT' })
  activate(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<PodResponseDto> {
    return this.service.activate(id, caller);
  }

  @Post(':id/mark-dormant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ACTIVE → DORMANT — a signal for attention, never an automatic termination (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: PodResponseDto })
  markDormant(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<PodResponseDto> {
    return this.service.markDormant(id, caller);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a Pod — terminal, history preserved (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: PodResponseDto })
  archive(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<PodResponseDto> {
    return this.service.archive(id, caller);
  }
}
