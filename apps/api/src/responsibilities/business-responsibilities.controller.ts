import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BusinessResponsibilitiesService } from './business-responsibilities.service';
import {
  ConfirmBusinessResponsibilityCompletionDto,
  CreateBusinessResponsibilityDto,
} from './dto/business-responsibility.dto';
import { ResponsibilityResponseDto } from './dto/responsibility-response.dto';

@ApiTags('business-responsibilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/responsibilities')
export class BusinessResponsibilitiesController {
  constructor(private readonly service: BusinessResponsibilitiesService) {}

  @Post()
  async create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateBusinessResponsibilityDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return ResponsibilityResponseDto.fromEntity(
      await this.service.create(organizationId, dto, caller),
    );
  }

  @Get()
  async list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    const rows = await this.service.list(organizationId, caller);
    return rows.map(ResponsibilityResponseDto.fromEntity);
  }

  @Get(':id')
  async get(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return ResponsibilityResponseDto.fromEntity(
      await this.service.get(organizationId, id, caller),
    );
  }

  @Post(':id/needs-you')
  async needsYou(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return ResponsibilityResponseDto.fromEntity(
      await this.service.markNeedsYou(organizationId, id, caller),
    );
  }

  @Post(':id/resume')
  async resume(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return ResponsibilityResponseDto.fromEntity(
      await this.service.resume(organizationId, id, caller),
    );
  }

  @Post(':id/complete')
  async complete(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmBusinessResponsibilityCompletionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return ResponsibilityResponseDto.fromEntity(
      await this.service.complete(organizationId, id, dto, caller),
    );
  }

  @Post(':id/cancel')
  async cancel(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return ResponsibilityResponseDto.fromEntity(
      await this.service.cancel(organizationId, id, caller),
    );
  }
}
