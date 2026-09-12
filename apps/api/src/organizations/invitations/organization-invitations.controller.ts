import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OrganizationInvitationsService } from './organization-invitations.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/invitations')
export class OrganizationInvitationsController {
  constructor(private readonly service: OrganizationInvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Invite a person to the organization by email (org OWNER/ADMIN, Steward, or Admin)' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: 201, type: InvitationResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not have management authority over this organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'A pending invitation or membership already exists for this email' })
  invite(
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InvitationResponseDto> {
    return this.service.invite(organizationId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List the organization's invitations (org OWNER/ADMIN, Steward, or Admin)" })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: [InvitationResponseDto] })
  list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InvitationResponseDto[]> {
    return this.service.listForOrganization(organizationId, caller);
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending invitation (org OWNER/ADMIN, Steward, or Admin)' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'invitationId', description: 'Invitation UUID' })
  @ApiResponse({ status: 404, description: 'Invitation not found for this organization' })
  @ApiResponse({ status: 409, description: 'Only a pending invitation can be revoked' })
  revoke(
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.revoke(organizationId, invitationId, caller);
  }
}

/**
 * Caller-scoped invitation actions. Deliberately not nested under
 * `/organizations/:organizationId` — the invitee is not yet a member of
 * the target organization, so there is no tenant membership to scope a
 * guard against; identity is instead established by requiring the
 * authenticated caller's own account email to match the invitation's
 * `invitedEmail` (enforced in the service).
 */
@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class MyInvitationsController {
  constructor(private readonly service: OrganizationInvitationsService) {}

  @Get('mine')
  @ApiOperation({ summary: "List invitations addressed to the caller's own account email" })
  @ApiResponse({ status: 200, type: [InvitationResponseDto] })
  listMine(@CurrentUser() caller: AuthenticatedUser): Promise<InvitationResponseDto[]> {
    return this.service.listMine(caller);
  }

  @Post(':invitationId/accept')
  @ApiOperation({ summary: 'Accept an invitation addressed to the caller' })
  @ApiParam({ name: 'invitationId', description: 'Invitation UUID' })
  @ApiResponse({ status: 201, type: InvitationResponseDto })
  @ApiResponse({ status: 403, description: "Invitation was not addressed to the caller's account email" })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'Invitation is no longer pending or has expired' })
  accept(
    @Param('invitationId') invitationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InvitationResponseDto> {
    return this.service.accept(invitationId, caller);
  }

  @Post(':invitationId/decline')
  @ApiOperation({ summary: 'Decline an invitation addressed to the caller' })
  @ApiParam({ name: 'invitationId', description: 'Invitation UUID' })
  @ApiResponse({ status: 201, type: InvitationResponseDto })
  @ApiResponse({ status: 403, description: "Invitation was not addressed to the caller's account email" })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'Invitation is no longer pending' })
  decline(
    @Param('invitationId') invitationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InvitationResponseDto> {
    return this.service.decline(invitationId, caller);
  }
}
