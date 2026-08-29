import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import {
  ConfirmHarvestRequirementDto,
  CreateHarvestPlanDto,
  HarvestAmountDto,
  ReportHarvestProgressDto,
  SkipHarvestItemDto,
  StopHarvestPlanDto,
  UpsertHarvestProfileDto,
} from './dto/harvest.dto';
import { HarvestPlanningService } from './harvest-planning.service';

@ApiTags('harvest')
@ApiBearerAuth()
@Controller('harvest')
@UseGuards(JwtAuthGuard)
export class HarvestController {
  constructor(private readonly service: HarvestPlanningService) {}

  @Patch('profiles/:opportunityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Attach or update a freshly reviewed harvest profile on a VERIFIED opportunity',
  })
  upsertProfile(
    @Param('opportunityId') opportunityId: string,
    @Body() dto: UpsertHarvestProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upsertProfile(opportunityId, dto, user.id);
  }

  @Get('profiles/review-queue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR)
  @ApiOperation({
    summary:
      'List harvest promotion profiles that are stale, expired, unverified, or backed by a stale opportunity',
  })
  reviewQueue() {
    return this.service.listProfileReviewQueue();
  }

  @Get('candidates')
  @ApiOperation({
    summary:
      'List currently fresh, regulated harvest candidates so the member can review eligibility before planning',
  })
  listCandidates(
    @Query('state') state: string,
    @Query('country') country: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!state?.trim()) {
      throw new BadRequestException('state is required');
    }
    return this.service.listCandidates(
      user.isGuest,
      state,
      country ?? 'US',
    );
  }

  @Post('plans')
  @ApiOperation({
    summary:
      'Create the member annual plan from currently eligible, freshly reviewed offers',
  })
  createPlan(
    @Body() dto: CreateHarvestPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createPlan(user.id, user.isGuest, dto);
  }

  @Get('plans/current')
  getCurrent(
    @Query('taxYear', ParseIntPipe) taxYear: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getPlan(user.id, taxYear);
  }

  @Post('plans/:planId/items/:itemId/start')
  start(
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.startItem(user.id, planId, itemId);
  }

  @Post('plans/:planId/items/:itemId/progress')
  progress(
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ReportHarvestProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reportProgress(user.id, planId, itemId, dto);
  }

  @Post('plans/:planId/items/:itemId/requirement-complete')
  requirement(
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ConfirmHarvestRequirementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmRequirement(user.id, planId, itemId, dto);
  }

  @Post('plans/:planId/items/:itemId/request-withdrawal')
  requestWithdrawal(
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @Body() dto: HarvestAmountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.requestWithdrawal(user.id, planId, itemId, dto);
  }

  @Post('plans/:planId/items/:itemId/confirm-withdrawal')
  confirmWithdrawal(
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @Body() dto: HarvestAmountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmWithdrawal(user.id, planId, itemId, dto);
  }

  @Post('plans/:planId/items/:itemId/skip')
  skip(
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @Body() dto: SkipHarvestItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.skipItem(user.id, planId, itemId, dto);
  }

  @Post('plans/:planId/stop')
  stop(
    @Param('planId') planId: string,
    @Body() dto: StopHarvestPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.stopPlan(user.id, planId, dto);
  }
}
