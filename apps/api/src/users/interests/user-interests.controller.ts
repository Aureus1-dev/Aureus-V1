import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpportunityCategory, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { UserInterestsService } from './user-interests.service';
import { AddInterestDto, InterestResponseDto } from './dto/interest-dto';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@ApiTags('interests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/:userId/interests')
export class UserInterestsController {
  constructor(private readonly service: UserInterestsService) {}

  @Post()
  @ApiOperation({ summary: 'Add an interest category (self or Admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: InterestResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You may only manage your own interests' })
  add(
    @Param('userId') userId: string,
    @Body() dto: AddInterestDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InterestResponseDto> {
    this.assertSelfOrPrivileged(caller, userId);
    return this.service.add(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a user's interest categories (self or Admin)" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: [InterestResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You may only manage your own interests' })
  findAll(
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InterestResponseDto[]> {
    this.assertSelfOrPrivileged(caller, userId);
    return this.service.findByUser(userId);
  }

  @Delete(':category')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an interest category (self or Admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'category', enum: OpportunityCategory })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You may only manage your own interests' })
  remove(
    @Param('userId') userId: string,
    @Param('category') category: OpportunityCategory,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    this.assertSelfOrPrivileged(caller, userId);
    return this.service.remove(userId, category);
  }

  private assertSelfOrPrivileged(caller: AuthenticatedUser, targetUserId: string): void {
    if (caller.id === targetUserId) return;
    if (!hasRole(caller, ADMIN_ROLES)) {
      throw new ForbiddenException('You may only manage your own interests');
    }
  }
}
