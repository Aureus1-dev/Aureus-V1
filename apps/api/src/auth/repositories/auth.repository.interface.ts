import {
  EmailVerificationToken,
  PasswordResetToken,
  RefreshToken,
} from '@prisma/client';

/** DI injection token — string constant avoids Symbol serialisation issues. */
export const AUTH_REPOSITORY = 'AUTH_REPOSITORY';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateResetOrVerificationTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Persistence contract for authentication credentials — refresh tokens,
 * password reset tokens, and email verification tokens. All tokens are
 * looked up and stored by their hash; plaintext tokens never touch the
 * database (OAS-SEC-003 — credential protection).
 */
export interface IAuthRepository {
  // ── Refresh tokens ─────────────────────────────────────────────────────
  createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshToken>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeRefreshToken(id: string, replacedByTokenHash?: string): Promise<RefreshToken>;
  revokeAllRefreshTokensForUser(userId: string): Promise<void>;

  // ── Password reset tokens ──────────────────────────────────────────────
  createPasswordResetToken(
    data: CreateResetOrVerificationTokenInput,
  ): Promise<PasswordResetToken>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markPasswordResetTokenUsed(id: string): Promise<PasswordResetToken>;

  // ── Email verification tokens ──────────────────────────────────────────
  createEmailVerificationToken(
    data: CreateResetOrVerificationTokenInput,
  ): Promise<EmailVerificationToken>;
  findEmailVerificationTokenByHash(
    tokenHash: string,
  ): Promise<EmailVerificationToken | null>;
  markEmailVerificationTokenUsed(id: string): Promise<EmailVerificationToken>;
}
