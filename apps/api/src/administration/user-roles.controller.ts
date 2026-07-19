import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserRolesService } from './user-roles.service';
import { RoleActionDto } from './dto/role-action.dto';

const ADMIN_ROLES = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

// Privilege-escalation-adjacent — tighter than the global 100/min default (PD-001).
const ROLE_ACTION_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@ApiTags('administration')
@Controller('users/:id/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@ApiBearerAuth()
export class UserRolesController {
  constructor(private readonly service: UserRolesService) {}

  @Post('grant')
  @Throttle(ROLE_ACTION_THROTTLE)
  @ApiOperation({ summary: 'Grant a role to a user (Platform / System Administrator)' })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role, or is targeting their own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Role already held, or the role is the protected baseline role' })
  grant(
    @Param('id') id: string,
    @Body() dto: RoleActionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.service.grant(id, dto.role, caller);
  }

  @Post('revoke')
  @Throttle(ROLE_ACTION_THROTTLE)
  @ApiOperation({ summary: 'Revoke a role from a user (Platform / System Administrator)' })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role, or is targeting their own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Role not held, is the protected baseline role, or is the user\'s last remaining role' })
  revoke(
    @Param('id') id: string,
    @Body() dto: RoleActionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.service.revoke(id, dto.role, caller);
  }
}
