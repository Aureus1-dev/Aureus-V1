import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OrganizationMembersService } from './organization-members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { MemberResponseDto } from './dto/member-response.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/members')
export class OrganizationMembersController {
  constructor(private readonly service: OrganizationMembersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR)
  @ApiOperation({
    summary:
      'Directly attach a representative, bypassing invitation (platform Steward/Admin only — ' +
      'an ordinary business OWNER/ADMIN uses POST .../invitations instead). Never grants OWNER.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: 201, type: MemberResponseDto })
  @ApiResponse({
    status: 400,
    description: 'role OWNER was requested — use ownership transfer instead',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller is not a platform Steward or Administrator' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  add(
    @Param('organizationId') organizationId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    return this.service.add(organizationId, dto, caller);
  }

  @Get()
  @ApiOperation({
    summary: "List the organization's representatives (org members, Steward, or Admin)",
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: [MemberResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 403,
    description: "Caller does not have permission to view this organization's members",
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findAll(
    @Param('organizationId') organizationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MemberResponseDto[]> {
    return this.service.findByOrganization(organizationId, caller);
  }

  @Patch('ownership/transfer')
  @ApiOperation({
    summary: 'Transfer OWNER to another existing member (current organization OWNER only)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: MemberResponseDto })
  @ApiResponse({
    status: 403,
    description: "Only the organization's current OWNER may transfer ownership",
  })
  @ApiResponse({ status: 404, description: 'Organization or target member not found' })
  @ApiResponse({ status: 409, description: 'Target is already an OWNER' })
  transferOwnership(
    @Param('organizationId') organizationId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    return this.service.transferOwnership(organizationId, dto, caller);
  }

  @Patch(':userId')
  @ApiOperation({ summary: "Update a representative's role (org ADMIN, Steward, or Admin)" })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: MemberResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 403,
    description: 'Caller does not have management authority over this organization',
  })
  @ApiResponse({ status: 404, description: 'Organization or member not found' })
  @ApiResponse({
    status: 409,
    description: "Cannot demote the organization's last remaining ADMIN or edit OWNER generically",
  })
  updateRole(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    return this.service.updateRole(organizationId, userId, dto, caller);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Remove a representative (org ADMIN, Steward, Admin, or the representative themselves)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 403,
    description: 'Caller does not have management authority over this organization',
  })
  @ApiResponse({ status: 404, description: 'Organization or member not found' })
  @ApiResponse({
    status: 409,
    description: "Cannot remove the organization's last remaining ADMIN",
  })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(organizationId, userId, caller);
  }
}
