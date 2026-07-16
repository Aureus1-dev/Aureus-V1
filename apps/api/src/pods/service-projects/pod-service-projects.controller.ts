import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodServiceProjectsService } from './pod-service-projects.service';
import { CreateServiceProjectDto, ServiceProjectResponseDto, UpdateServiceProjectDto, UpdateServiceProjectStatusDto } from './dto/service-project.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PodServiceProjectsController {
  constructor(private readonly service: PodServiceProjectsService) {}

  @Post('pods/:podId/service-projects')
  @ApiOperation({ summary: '"Who needs us?" — propose a service project (any active Pod member)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 201, type: ServiceProjectResponseDto })
  create(@Param('podId') podId: string, @Body() dto: CreateServiceProjectDto, @CurrentUser() caller: AuthenticatedUser): Promise<ServiceProjectResponseDto> {
    return this.service.create(podId, dto, caller);
  }

  @Get('pods/:podId/service-projects')
  @ApiOperation({ summary: 'List this Pod\'s service projects' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: [ServiceProjectResponseDto] })
  findForPod(@Param('podId') podId: string): Promise<ServiceProjectResponseDto[]> {
    return this.service.findForPod(podId);
  }

  @Patch('pods/service-projects/:id')
  @ApiOperation({ summary: 'Update a service project (proposer, this Pod\'s Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'PodServiceProject UUID' })
  @ApiResponse({ status: 200, type: ServiceProjectResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateServiceProjectDto, @CurrentUser() caller: AuthenticatedUser): Promise<ServiceProjectResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Patch('pods/service-projects/:id/status')
  @ApiOperation({ summary: 'Update service project status (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'id', description: 'PodServiceProject UUID' })
  @ApiResponse({ status: 200, type: ServiceProjectResponseDto })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateServiceProjectStatusDto, @CurrentUser() caller: AuthenticatedUser): Promise<ServiceProjectResponseDto> {
    return this.service.updateStatus(id, dto, caller);
  }
}
