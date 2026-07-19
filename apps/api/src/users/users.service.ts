import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from './repositories/user.repository.interface';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Create a new user.
   * Throws ConflictException if the email is already registered.
   */
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`Email '${dto.email}' is already registered`);
    }
    const user = await this.userRepository.create({
      email: dto.email,
      emailVerified: dto.emailVerified,
      status: dto.status,
    });
    return UserResponseDto.fromEntity(user);
  }

  /** Return a paginated list of non-deleted users. */
  async findAll(query: ListUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.userRepository.findAll({
      page,
      limit,
      status: query.status,
      role: query.role,
    });

    return {
      data: result.data.map(UserResponseDto.fromEntity),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  /**
   * Return a single non-deleted user by ID.
   * Throws NotFoundException if the user does not exist or is soft-deleted.
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User '${id}' not found`);
    }
    return UserResponseDto.fromEntity(user);
  }

  /** Return a user by email or null — does not throw. */
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByEmail(email);
    return user ? UserResponseDto.fromEntity(user) : null;
  }

  /**
   * Update one or more fields on a user.
   *
   * `emailVerified` and `status` are privileged fields — a self-caller may
   * never set them directly (that would let a member self-verify their own
   * email without the real /auth/verify-email token flow, or self-reverse
   * an Administrator's SUSPENDED/INACTIVE status change). Only an
   * Administrator caller may include them; a non-admin caller who tries is
   * rejected outright rather than having the fields silently dropped, so
   * the caller gets an honest signal instead of a confusing partial update.
   *
   * Throws NotFoundException if the user does not exist or is soft-deleted.
   */
  async update(id: string, dto: UpdateUserDto, caller: AuthenticatedUser): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`User '${id}' not found`);
    }

    const isAdmin = caller.roles.some((role) => ADMIN_ROLES.includes(role as UserRole));
    if (!isAdmin && (dto.emailVerified !== undefined || dto.status !== undefined)) {
      throw new ForbiddenException('Only an Administrator may change emailVerified or status');
    }

    const user = await this.userRepository.update(id, {
      email: dto.email,
      emailVerified: dto.emailVerified,
      status: dto.status,
    });
    return UserResponseDto.fromEntity(user);
  }

  /**
   * Soft-delete a user (sets deletedAt).
   * Throws NotFoundException if the user does not exist or is already deleted.
   */
  async remove(id: string): Promise<void> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`User '${id}' not found`);
    }
    await this.userRepository.softDelete(id);
  }
}
