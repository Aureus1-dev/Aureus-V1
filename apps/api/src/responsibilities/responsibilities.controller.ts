import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateResponsibilityDto } from './dto/create-responsibility.dto';
import { ResponsibilityResponseDto } from './dto/responsibility-response.dto';
import { ResponsibilitiesService } from './responsibilities.service';

@ApiTags('responsibilities')
@Controller('responsibilities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResponsibilitiesController {
  constructor(private readonly responsibilities: ResponsibilitiesService) {}

  @Post()
  @ApiOperation({
    summary: 'Explicitly accept one bounded personal Responsibility from an existing conversation/opportunity',
  })
  @ApiResponse({ status: 201, type: ResponsibilityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Origin conversation or opportunity not found' })
  @ApiResponse({ status: 409, description: 'Opportunity is not currently actionable' })
  accept(
    @Body() dto: CreateResponsibilityDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    return this.responsibilities.accept(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List the current member\'s personal Responsibilities' })
  @ApiResponse({ status: 200, type: [ResponsibilityResponseDto] })
  findMine(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto[]> {
    return this.responsibilities.findMine(caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one current member-owned personal Responsibility' })
  @ApiParam({ name: 'id', description: 'Responsibility UUID' })
  @ApiResponse({ status: 200, type: ResponsibilityResponseDto })
  @ApiResponse({ status: 404, description: 'Responsibility not found in caller personal scope' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    return this.responsibilities.findOne(id, caller);
  }

  @Post(':id/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconcile OR-001 Opportunity Decision against server-owned saved-opportunity state',
  })
  @ApiParam({ name: 'id', description: 'Responsibility UUID' })
  @ApiResponse({ status: 200, type: ResponsibilityResponseDto })
  @ApiResponse({ status: 404, description: 'Responsibility not found in caller personal scope' })
  @ApiResponse({ status: 409, description: 'Responsibility state cannot be reconciled' })
  reconcile(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    return this.responsibilities.reconcile(id, caller);
  }
}
