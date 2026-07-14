import { User, UserRole, UserStatus } from '@prisma/client';

/** DI injection token — string constant avoids Symbol serialisation issues. */
export const USER_REPOSITORY = 'USER_REPOSITORY';

// ---------------------------------------------------------------------------
// Input shapes (decoupled from DTO decorators)
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  email: string;
  emailVerified?: boolean;
  status?: UserStatus;
  passwordHash?: string;
  roles?: UserRole[];
}

export interface UpdateUserInput {
  email?: string;
  emailVerified?: boolean;
  status?: UserStatus;
  passwordHash?: string;
  roles?: UserRole[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  status?: UserStatus;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

export interface IUserRepository {
  /** Persist a new user record. */
  create(data: CreateUserInput): Promise<User>;

  /** Return the user with the given ID, excluding soft-deleted records. */
  findById(id: string): Promise<User | null>;

  /** Return the user with the given email, excluding soft-deleted records. */
  findByEmail(email: string): Promise<User | null>;

  /** Update editable fields on an existing user. */
  update(id: string, data: UpdateUserInput): Promise<User>;

  /** Mark the user as deleted by setting deletedAt (no hard delete). */
  softDelete(id: string): Promise<User>;

  /**
   * Return a paginated, sorted list of active users.
   * Soft-deleted records are always excluded.
   */
  findAll(params: PaginationParams): Promise<PaginatedResult<User>>;
}
