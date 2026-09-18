import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  CreateHouseholdDependencyDto,
  CreateHouseholdDto,
  CreateHouseholdRelationshipDto,
  InviteHouseholdMemberDto,
  RespondHouseholdProposalDto,
  ShareHouseholdResponsibilityDto,
} from './household-continuity.dto';
import { HouseholdContinuityService } from './household-continuity.service';

@ApiTags('people-households')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people/households')
export class HouseholdContinuityController {
  constructor(private readonly households: HouseholdContinuityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a member-owned household continuity boundary' })
  create(@Body() dto: CreateHouseholdDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.households.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List only the caller household memberships and invitations' })
  findMine(@CurrentUser() caller: AuthenticatedUser) {
    return this.households.findMine(caller);
  }

  @Get(':householdId')
  @ApiOperation({ summary: 'Read caller-safe household continuity state without private member payloads' })
  findOne(@Param('householdId') householdId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.households.findOne(householdId, caller);
  }

  @Post(':householdId/invitations')
  @ApiOperation({ summary: 'Invite an exact existing member; invitation itself grants no membership or data access' })
  invite(
    @Param('householdId') householdId: string,
    @Body() dto: InviteHouseholdMemberDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.inviteMember(householdId, dto, caller);
  }

  @Post(':householdId/invitations/:membershipId/respond')
  @ApiOperation({ summary: 'Accept or decline the caller own household invitation' })
  respondToInvitation(
    @Param('householdId') householdId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: RespondHouseholdProposalDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.respondToInvitation(householdId, membershipId, dto, caller);
  }

  @Post(':householdId/relationships')
  @ApiOperation({ summary: 'Propose one relationship involving the caller and another active household member' })
  relationship(
    @Param('householdId') householdId: string,
    @Body() dto: CreateHouseholdRelationshipDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.proposeRelationship(householdId, dto, caller);
  }

  @Post(':householdId/relationships/:relationshipId/respond')
  @ApiOperation({ summary: 'Confirm or decline a relationship proposed to the caller' })
  respondToRelationship(
    @Param('householdId') householdId: string,
    @Param('relationshipId') relationshipId: string,
    @Body() dto: RespondHouseholdProposalDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.respondToRelationship(householdId, relationshipId, dto, caller);
  }

  @Post(':householdId/dependencies')
  @ApiOperation({ summary: 'Propose a bounded household dependency that the other adult must confirm' })
  dependency(
    @Param('householdId') householdId: string,
    @Body() dto: CreateHouseholdDependencyDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.proposeDependency(householdId, dto, caller);
  }

  @Post(':householdId/dependencies/:dependencyId/respond')
  @ApiOperation({ summary: 'Confirm or decline a dependency involving the caller' })
  respondToDependency(
    @Param('householdId') householdId: string,
    @Param('dependencyId') dependencyId: string,
    @Body() dto: RespondHouseholdProposalDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.respondToDependency(householdId, dependencyId, dto, caller);
  }

  @Post(':householdId/responsibilities')
  @ApiOperation({ summary: 'Invite a household member to coordinate on one exact caller-owned Responsibility' })
  shareResponsibility(
    @Param('householdId') householdId: string,
    @Body() dto: ShareHouseholdResponsibilityDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.shareResponsibility(householdId, dto, caller);
  }

  @Post(':householdId/responsibilities/:shareId/respond')
  @ApiOperation({ summary: 'Accept or decline participation in an exact shared Responsibility; no private data authority is granted' })
  respondToResponsibilityShare(
    @Param('householdId') householdId: string,
    @Param('shareId') shareId: string,
    @Body() dto: RespondHouseholdProposalDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.households.respondToResponsibilityShare(householdId, shareId, dto, caller);
  }

  @Post(':householdId/leave')
  @ApiOperation({ summary: 'Leave a household and end caller household coordination edges' })
  leave(@Param('householdId') householdId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.households.leave(householdId, caller);
  }
}
