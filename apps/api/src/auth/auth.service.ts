import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../users/repositories/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { IAuthRepository, AUTH_REPOSITORY } from './repositories/auth.repository.interface';
import { generateOpaqueToken, hashOpaqueToken } from './token.util';
import { JwtPayload } from './strategies/jwt.strategy';
import { IEmailService, EMAIL_SERVICE } from '../email/email.service.interface';

const BCRYPT_SALT_ROUNDS = 12;
const PASSWORD_RESET_TTL_MINUTES = 30;
const EMAIL_VERIFICATION_TTL_HOURS = 48;

// Brute-force protection (PR-002).
const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Registration ──────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`Email '${dto.email}' is already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      roles: [UserRole.MEMBER],
    });

    await this.issueEmailVerificationToken(user.id, user.email);

    const tokens = await this.issueTokenPair(user.id, user.email, user.roles);
    this.logger.log(`User registered: ${user.id}`);
    return { user: UserResponseDto.fromEntity(user), tokens };
  }

  // ── Login ─────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is not active');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Too many failed sign-in attempts. Please try again later.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.registerFailedLoginAttempt(user);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.users.update(user.id, { failedLoginAttempts: 0, lockedUntil: null });
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.roles);
    this.logger.log(`User logged in: ${user.id}`);
    return { user: UserResponseDto.fromEntity(user), tokens };
  }

  /** Brute-force protection (PR-002) — locks the account for LOGIN_LOCKOUT_DURATION_MINUTES once LOGIN_LOCKOUT_THRESHOLD consecutive failures are reached, then resets the counter. */
  private async registerFailedLoginAttempt(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= LOGIN_LOCKOUT_THRESHOLD;

    await this.users.update(user.id, {
      failedLoginAttempts: shouldLock ? 0 : attempts,
      lockedUntil: shouldLock ? new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MINUTES * 60_000) : null,
    });

    if (shouldLock) {
      this.logger.warn(`Account locked after ${attempts} failed login attempts: ${user.id}`);
    }
  }

  // ── Refresh / Logout ─────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<TokenPairDto> {
    const tokenHash = hashOpaqueToken(refreshToken);
    const stored = await this.authRepo.findRefreshTokenByHash(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.roles);
    await this.authRepo.revokeRefreshToken(stored.id, hashOpaqueToken(tokens.refreshToken));
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashOpaqueToken(refreshToken);
    const stored = await this.authRepo.findRefreshTokenByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await this.authRepo.revokeRefreshToken(stored.id);
    }
  }

  // ── Password reset ───────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.users.findByEmail(dto.email);
    // Do not reveal whether the email is registered — prevents user enumeration.
    if (!user) {
      this.logger.log(`Password reset requested for unknown email: ${dto.email}`);
      return;
    }

    const { token, tokenHash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);
    await this.authRepo.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt });

    await this.emailService.sendPasswordReset(user.email, token);
    // The plaintext token is never logged (ADR-009) — it is a live credential
    // once issued, and logs are a broader-access surface than the recipient's inbox.
    this.logger.log(`Password reset token issued and emailed for ${user.id}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashOpaqueToken(dto.token);
    const stored = await this.authRepo.findPasswordResetTokenByHash(tokenHash);

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    await this.users.update(stored.userId, { passwordHash });
    await this.authRepo.markPasswordResetTokenUsed(stored.id);
    // A password change invalidates all existing sessions.
    await this.authRepo.revokeAllRefreshTokensForUser(stored.userId);

    this.logger.log(`Password reset completed for ${stored.userId}`);
  }

  // ── Email verification ───────────────────────────────────────────────

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = hashOpaqueToken(dto.token);
    const stored = await this.authRepo.findEmailVerificationTokenByHash(tokenHash);

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired email verification token');
    }

    await this.users.update(stored.userId, { emailVerified: true });
    await this.authRepo.markEmailVerificationTokenUsed(stored.id);

    this.logger.log(`Email verified for ${stored.userId}`);
  }

  private async issueEmailVerificationToken(userId: string, email: string): Promise<void> {
    const { token, tokenHash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 3_600_000);
    await this.authRepo.createEmailVerificationToken({ userId, tokenHash, expiresAt });
    await this.emailService.sendEmailVerification(email, token);
    this.logger.log(`Email verification token issued and emailed for ${email}`);
  }

  // ── Token issuance ───────────────────────────────────────────────────

  private async issueTokenPair(
    userId: string,
    email: string,
    roles: UserRole[],
  ): Promise<TokenPairDto> {
    const payload: JwtPayload = { sub: userId, email, roles };
    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRY', '15m');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see auth.module.ts
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: expiresIn as any });

    const { token: refreshToken, tokenHash } = generateOpaqueToken();
    const refreshDays = this.config.get<number>('JWT_REFRESH_EXPIRY_DAYS', 30);
    const expiresAt = new Date(Date.now() + refreshDays * 86_400_000);
    await this.authRepo.createRefreshToken({ userId, tokenHash, expiresAt });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiryToSeconds(expiresIn),
    };
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2];
    const multiplier = { s: 1, m: 60, h: 3_600, d: 86_400 }[unit] ?? 1;
    return value * multiplier;
  }
}
