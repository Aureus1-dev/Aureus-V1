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
  AcceptPersonalResolutionDto,
  PersonalResolutionStateDto,
  RequestHumanStewardDto,
  ReportPersonalResolutionOutcomeDto,
  RespondToResolutionResourceDto,
} from './people-resolutions.dto';
import { PeopleResolutionsService } from './people-resolutions.service';

@ApiTags('people-resolutions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people/resolutions')
export class PeopleResolutionsController {
  constructor(private readonly resolutions: PeopleResolutionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Accept an owned stated need as one durable Personal Responsibility',
  })
  @ApiResponse({ status: 201, type: PersonalResolutionStateDto })
  accept(
    @Body() dto: AcceptPersonalResolutionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    return this.resolutions.accept(dto, caller);
  }

  @Get(':responsibilityId')
  @ApiOperation({
    summary: 'Read the member-safe current state of one personal resolution',
  })
  @ApiResponse({ status: 200, type: PersonalResolutionStateDto })
  findOne(
    @Param('responsibilityId') responsibilityId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    return this.resolutions.findOne(responsibilityId, caller);
  }

  @Post(':responsibilityId/continue')
  @ApiOperation({
    summary: 'Reconcile source evidence and continue to the next responsible route',
  })
  @ApiResponse({ status: 201, type: PersonalResolutionStateDto })
  continue(
    @Param('responsibilityId') responsibilityId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    return this.resolutions.continue(responsibilityId, caller);
  }

  @Post(':responsibilityId/resource-response')
  @ApiOperation({
    summary: 'Accept or decline the currently offered verified resource route',
  })
  @ApiResponse({ status: 201, type: PersonalResolutionStateDto })
  respondToResource(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: RespondToResolutionResourceDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    return this.resolutions.respondToResource(responsibilityId, dto, caller);
  }

  @Post(':responsibilityId/outcome')
  @ApiOperation({
    summary: 'Explicitly report whether the underlying personal need is resolved',
  })
  @ApiResponse({ status: 201, type: PersonalResolutionStateDto })
  reportOutcome(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: ReportPersonalResolutionOutcomeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    return this.resolutions.reportOutcome(responsibilityId, dto, caller);
  }

  @Post(':responsibilityId/human-steward')
  @ApiOperation({
    summary: 'Explicitly ask for the existing Human Steward escalation route',
  })
  @ApiResponse({ status: 201, type: PersonalResolutionStateDto })
  requestHumanSteward(
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: RequestHumanStewardDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PersonalResolutionStateDto> {
    return this.resolutions.requestHumanSteward(responsibilityId, dto, caller);
  }
}
