import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  AssignedFollowThroughResponseDto,
  CreateHousingFollowThroughDto,
  PeopleFollowThroughResponseDto,
  RecordFollowThroughAttemptDto,
  ReportFollowThroughDueChangeDto,
  ReportFollowThroughSatisfactionDto,
  VerifyFollowThroughDueDto,
  VerifyFollowThroughSatisfactionDto,
} from './people-follow-through.dto';
import { PeopleFollowThroughService } from './people-follow-through.service';

@ApiTags('people-follow-through')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people/follow-through')
export class PeopleFollowThroughController {
  constructor(private readonly followThrough: PeopleFollowThroughService) {}

  @Get('assigned')
  @ApiOperation({
    summary: 'Read the minimum-necessary assigned Human Steward follow-through queue',
  })
  @ApiResponse({ status: 200, type: [AssignedFollowThroughResponseDto] })
  findAssigned(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<AssignedFollowThroughResponseDto[]> {
    return this.followThrough.findAssigned(caller);
  }

  @Post(':responsibilityId/housing')
  @ApiOperation({
    summary: 'Record the first sourced housing Obligation on a Personal Need Responsibility',
  })
  @ApiResponse({ status: 201, type: PeopleFollowThroughResponseDto })
  createHousing(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: CreateHousingFollowThroughDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    return this.followThrough.createHousingObligation(responsibilityId, dto, caller);
  }

  @Get(':responsibilityId')
  @ApiOperation({ summary: 'Read the member-owned current follow-through truth' })
  @ApiResponse({ status: 200, type: PeopleFollowThroughResponseDto })
  findMine(
    @Param('responsibilityId') responsibilityId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    return this.followThrough.findMine(responsibilityId, caller);
  }

  @Post(':responsibilityId/attempts')
  @ApiOperation({ summary: 'Record one follow-through attempt without claiming outcome completion' })
  @ApiResponse({ status: 201, type: PeopleFollowThroughResponseDto })
  recordAttempt(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: RecordFollowThroughAttemptDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    return this.followThrough.recordAttempt(responsibilityId, dto, caller);
  }

  @Post(':responsibilityId/due-change')
  @ApiOperation({
    summary: 'Report a due-date correction; a verified date is preserved and disputed until reviewed',
  })
  @ApiResponse({ status: 201, type: PeopleFollowThroughResponseDto })
  reportDueChange(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: ReportFollowThroughDueChangeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    return this.followThrough.reportDueChange(responsibilityId, dto, caller);
  }

  @Post(':responsibilityId/due-verification')
  @ApiOperation({
    summary: 'Verify/correct a due date from source evidence as the assigned Steward or administrator',
  })
  @ApiResponse({ status: 201, type: PeopleFollowThroughResponseDto })
  verifyDue(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: VerifyFollowThroughDueDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    return this.followThrough.verifyDue(responsibilityId, dto, caller);
  }

  @Post(':responsibilityId/satisfaction-report')
  @ApiOperation({
    summary: 'Report that the Obligation was satisfied without completing the underlying life need',
  })
  @ApiResponse({ status: 201, type: PeopleFollowThroughResponseDto })
  reportSatisfied(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: ReportFollowThroughSatisfactionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    return this.followThrough.reportSatisfied(responsibilityId, dto, caller);
  }

  @Post(':responsibilityId/satisfaction-verification')
  @ApiOperation({
    summary: 'Verify Obligation satisfaction from independent evidence without auto-completing the need',
  })
  @ApiResponse({ status: 201, type: PeopleFollowThroughResponseDto })
  verifySatisfied(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: VerifyFollowThroughSatisfactionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    return this.followThrough.verifySatisfied(responsibilityId, dto, caller);
  }
}
