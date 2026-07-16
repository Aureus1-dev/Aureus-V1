import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodMembershipsService } from './pod-memberships.service';
import { SuggestHomePodDto } from './dto/suggest-home-pod.dto';
import { RespondToMembershipDto } from './dto/respond-to-membership.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PodMembershipsController {
  constructor(private readonly service: PodMembershipsService) {}

  @Post('pods/memberships/suggest-home-pod')
  @ApiOperation({ summary: 'Prepare a proactive Home Pod invitation — never assignment (AI service account / Admin only)' })
  @ApiResponse({ status: 201, type: MembershipResponseDto })
  suggestHomePod(@Body() dto: SuggestHomePodDto, @CurrentUser() caller: AuthenticatedUser): Promise<MembershipResponseDto> {
    return this.service.suggestHomePod(dto, caller);
  }

  @Get('pods/memberships/mine')
  @ApiOperation({ summary: 'List my own Pod memberships and pending invitations' })
  @ApiResponse({ status: 200, type: [MembershipResponseDto] })
  findMine(@CurrentUser() caller: AuthenticatedUser): Promise<MembershipResponseDto[]> {
    return this.service.findMine(caller);
  }

  @Get('pods/:podId/memberships')
  @ApiOperation({ summary: 'List the Pod roster (this Pod\'s Steward or Admin only)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: [MembershipResponseDto] })
  findForPod(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<MembershipResponseDto[]> {
    return this.service.findForPod(podId, caller);
  }

  @Post('pods/memberships/:id/respond')
  @ApiOperation({ summary: 'Accept, decline, or defer a pending Pod invitation (the invited member only)' })
  @ApiParam({ name: 'id', description: 'PodMembership UUID' })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  respond(
    @Param('id') id: string, @Body() dto: RespondToMembershipDto, @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MembershipResponseDto> {
    return this.service.respond(id, dto, caller);
  }

  @Post('pods/memberships/:id/leave')
  @ApiOperation({ summary: 'Leave a Pod — immediate, no approval required ("Belonging shall never become imprisonment")' })
  @ApiParam({ name: 'id', description: 'PodMembership UUID' })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  leave(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<MembershipResponseDto> {
    return this.service.leave(id, caller);
  }

  @Post('pods/memberships/:id/role')
  @ApiOperation({ summary: 'Appoint or transition a member\'s Pod role — Institutional Appointment only (Admin)' })
  @ApiParam({ name: 'id', description: 'PodMembership UUID' })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  setRole(@Param('id') id: string, @Body() dto: SetRoleDto, @CurrentUser() caller: AuthenticatedUser): Promise<MembershipResponseDto> {
    return this.service.setRole(id, dto, caller);
  }
}
