import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardshipTasksService } from './stewardship-tasks.service';
import { CreateStewardshipTaskDto } from './dto/create-stewardship-task.dto';
import { UpdateStewardshipTaskDto } from './dto/update-stewardship-task.dto';
import { StewardshipTaskResponseDto } from './dto/stewardship-task-response.dto';

@ApiTags('stewardship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stewardship/relationships/:relationshipId/tasks')
export class StewardshipTasksController {
  constructor(private readonly service: StewardshipTasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a follow-up task for the member (assigned steward or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 201, type: StewardshipTaskResponseDto })
  create(
    @Param('relationshipId') relationshipId: string,
    @Body() dto: CreateStewardshipTaskDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<StewardshipTaskResponseDto> {
    return this.service.create(relationshipId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List follow-up tasks (member, assigned steward, or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: [StewardshipTaskResponseDto] })
  findAll(
    @Param('relationshipId') relationshipId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<StewardshipTaskResponseDto[]> {
    return this.service.findByRelationship(relationshipId, caller);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a follow-up task (assigned steward or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiParam({ name: 'taskId', description: 'Stewardship task UUID' })
  @ApiResponse({ status: 200, type: StewardshipTaskResponseDto })
  update(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateStewardshipTaskDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<StewardshipTaskResponseDto> {
    return this.service.update(taskId, dto, caller);
  }
}
