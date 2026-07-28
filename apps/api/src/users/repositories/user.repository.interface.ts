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
  isGuest?: boolean;
  guestLastActiveAt?: Date;
}

export interface UpdateUserInput {
  email?: string;
  emailVerified?: boolean;
  status?: UserStatus;
  passwordHash?: string;
  roles?: UserRole[];
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  mfaRecoveryCodes?: string[];
  isGuest?: boolean;
  guestClaimedAt?: Date | null;
  guestLastActiveAt?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  status?: UserStatus;
  role?: UserRole;
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

  /**
   * Permanently deletes every never-claimed guest account (isGuest: true)
   * whose last real activity is older than `cutoff` — a genuine hard
   * delete, unlike `softDelete` above, deliberately: "creating a free
   * account is only to preserve progress," so a guest who never claims
   * one should not have their conversations, needs, or goals kept
   * indefinitely. Every relation to `User` cascades (see schema.prisma),
   * so this is the single point that removes all of it. Returns the
   * number of accounts removed.
   */
  deleteInactiveGuests(cutoff: Date): Promise<number>;
}
