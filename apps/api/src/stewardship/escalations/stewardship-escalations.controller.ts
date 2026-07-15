import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardshipEscalationsService } from './stewardship-escalations.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationStatusDto } from './dto/update-escalation-status.dto';
import { ResolveEscalationDto } from './dto/resolve-escalation.dto';
import { EscalationResponseDto } from './dto/escalation-response.dto';

@ApiTags('stewardship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stewardship/relationships/:relationshipId/escalations')
export class StewardshipEscalationsController {
  constructor(private readonly service: StewardshipEscalationsService) {}

  @Post()
  @ApiOperation({ summary: 'Raise an escalation (assigned steward or Administrator; not visible to the member)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 201, type: EscalationResponseDto })
  create(
    @Param('relationshipId') relationshipId: string,
    @Body() dto: CreateEscalationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<EscalationResponseDto> {
    return this.service.create(relationshipId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List escalations (assigned steward or Administrator only)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: [EscalationResponseDto] })
  findAll(
    @Param('relationshipId') relationshipId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<EscalationResponseDto[]> {
    return this.service.findByRelationship(relationshipId, caller);
  }

  @Patch(':escalationId/status')
  @ApiOperation({ summary: 'Update escalation status (assigned steward or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiParam({ name: 'escalationId', description: 'Escalation UUID' })
  @ApiResponse({ status: 200, type: EscalationResponseDto })
  updateStatus(
    @Param('escalationId') escalationId: string,
    @Body() dto: UpdateEscalationStatusDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<EscalationResponseDto> {
    return this.service.updateStatus(escalationId, dto, caller);
  }

  @Post(':escalationId/resolve')
  @ApiOperation({ summary: 'Resolve an escalation with resolution notes (assigned steward or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiParam({ name: 'escalationId', description: 'Escalation UUID' })
  @ApiResponse({ status: 201, type: EscalationResponseDto })
  @ApiResponse({ status: 409, description: 'Escalation has already been resolved or closed' })
  resolve(
    @Param('escalationId') escalationId: string,
    @Body() dto: ResolveEscalationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<EscalationResponseDto> {
    return this.service.resolve(escalationId, dto, caller);
  }
}
