import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/:userId/profile')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create profile for a user (self or Admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You may only manage your own profile' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  create(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ProfileResponseDto> {
    this.assertSelfOrPrivileged(caller, userId);
    return this.service.createOrGet(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get a user's profile (self or Admin)" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You may only manage your own profile' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  findOne(
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ProfileResponseDto> {
    this.assertSelfOrPrivileged(caller, userId);
    return this.service.findByUserId(userId);
  }

  @Patch()
  @ApiOperation({ summary: "Update a user's profile (self or Admin)" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You may only manage your own profile' })
  update(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ProfileResponseDto> {
    this.assertSelfOrPrivileged(caller, userId);
    return this.service.update(userId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a user's profile (self or Admin)" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You may only manage your own profile' })
  remove(
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    this.assertSelfOrPrivileged(caller, userId);
    return this.service.remove(userId);
  }

  private assertSelfOrPrivileged(caller: AuthenticatedUser, targetUserId: string): void {
    if (caller.id === targetUserId) return;
    if (!hasRole(caller, ADMIN_ROLES)) {
      throw new ForbiddenException('You may only manage your own profile');
    }
  }
}
