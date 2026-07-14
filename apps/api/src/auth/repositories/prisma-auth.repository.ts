import { Injectable } from '@nestjs/common';
import {
  EmailVerificationToken,
  PasswordResetToken,
  RefreshToken,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRefreshTokenInput,
  CreateResetOrVerificationTokenInput,
  IAuthRepository,
} from './auth.repository.interface';

@Injectable()
export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Refresh tokens ─────────────────────────────────────────────────────

  async createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshToken> {
    return this.prisma.db.refreshToken.create({ data });
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeRefreshToken(
    id: string,
    replacedByTokenHash?: string,
  ): Promise<RefreshToken> {
    return this.prisma.db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenHash },
    });
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ── Password reset tokens ──────────────────────────────────────────────

  async createPasswordResetToken(
    data: CreateResetOrVerificationTokenInput,
  ): Promise<PasswordResetToken> {
    return this.prisma.db.passwordResetToken.create({ data });
  }

  async findPasswordResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetToken | null> {
    return this.prisma.db.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async markPasswordResetTokenUsed(id: string): Promise<PasswordResetToken> {
    return this.prisma.db.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // ── Email verification tokens ──────────────────────────────────────────

  async createEmailVerificationToken(
    data: CreateResetOrVerificationTokenInput,
  ): Promise<EmailVerificationToken> {
    return this.prisma.db.emailVerificationToken.create({ data });
  }

  async findEmailVerificationTokenByHash(
    tokenHash: string,
  ): Promise<EmailVerificationToken | null> {
    return this.prisma.db.emailVerificationToken.findUnique({ where: { tokenHash } });
  }

  async markEmailVerificationTokenUsed(
    id: string,
  ): Promise<EmailVerificationToken> {
    return this.prisma.db.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
