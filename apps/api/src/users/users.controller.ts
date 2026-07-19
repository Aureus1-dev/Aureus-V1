import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ---------------------------------------------------------------------------
  // POST /users — administrative user creation (self-service uses /auth/register)
  // ---------------------------------------------------------------------------

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user (Admin)' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  // ---------------------------------------------------------------------------
  // GET /users
  // ---------------------------------------------------------------------------

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES, UserRole.STEWARD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (paginated, soft-deleted excluded) (Steward / Admin)' })
  @ApiResponse({ status: 200, description: 'Paginated user list', type: PaginatedUsersResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  findAll(@Query() query: ListUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findAll(query);
  }

  // ---------------------------------------------------------------------------
  // GET /users/:id — self or Steward/Admin
  // ---------------------------------------------------------------------------

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID (self, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'User UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only access their own record' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    this.assertSelfOrPrivileged(caller, id);
    return this.usersService.findById(id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /users/:id — self or Admin
  // ---------------------------------------------------------------------------

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user (partial update) (self or Admin)' })
  @ApiParam({ name: 'id', description: 'User UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only update their own record' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    this.assertSelfOrPrivileged(caller, id);
    return this.usersService.update(id, updateUserDto, caller);
  }

  // ---------------------------------------------------------------------------
  // DELETE /users/:id
  // ---------------------------------------------------------------------------

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (sets deletedAt, no hard delete) (Admin)' })
  @ApiParam({ name: 'id', description: 'User UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 204, description: 'User soft-deleted' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  // ---------------------------------------------------------------------------
  // Ownership helper — allows a caller to act on their own record, or requires
  // an administrative role for acting on someone else's.
  // ---------------------------------------------------------------------------

  private assertSelfOrPrivileged(caller: AuthenticatedUser, targetUserId: string): void {
    if (caller.id === targetUserId) return;
    const hasAdminRole = caller.roles.some((role) => ADMIN_ROLES.includes(role as UserRole));
    if (!hasAdminRole) {
      throw new ForbiddenException('You may only access your own user record');
    }
  }
}
