import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { MfaService } from './mfa/mfa.service';
import { IUserRepository, USER_REPOSITORY } from '../users/repositories/user.repository.interface';
import { IAuthRepository, AUTH_REPOSITORY } from './repositories/auth.repository.interface';
import { IEmailService, EMAIL_SERVICE } from '../email/email.service.interface';
import type { User, RefreshToken, PasswordResetToken, EmailVerificationToken } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

// emailVerified defaults true: most tests exercise a normal, already-verified
// login/session flow; the unverified-login-block behavior is exercised by
// its own explicit test with emailVerified: false.
const makeUser = (o: Partial<User> = {}): User => ({
  id: 'u-001',
  email: 'alice@example.com',
  emailVerified: true,
  passwordHash: null,
  roles: [UserRole.MEMBER],
  status: UserStatus.ACTIVE,
  failedLoginAttempts: 0,
  lockedUntil: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaRecoveryCodes: [],
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
  ...o,
});

const mockUserRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findAll: jest.fn(),
};

const mockAuthRepo: jest.Mocked<IAuthRepository> = {
  createRefreshToken: jest.fn(),
  findRefreshTokenByHash: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllRefreshTokensForUser: jest.fn(),
  createPasswordResetToken: jest.fn(),
  findPasswordResetTokenByHash: jest.fn(),
  markPasswordResetTokenUsed: jest.fn(),
  createEmailVerificationToken: jest.fn(),
  findEmailVerificationTokenByHash: jest.fn(),
  markEmailVerificationTokenUsed: jest.fn(),
};

const mockEmailService: jest.Mocked<IEmailService> = {
  sendEmailVerification: jest.fn(),
  sendPasswordReset: jest.fn(),
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
  verifyAsync: jest.fn(),
} as unknown as jest.Mocked<JwtService>;

const mockMfaService = { verifyLoginCode: jest.fn() } as unknown as jest.Mocked<MfaService>;

const mockConfig = {
  get: jest.fn((key: string, fallback?: unknown) => {
    const values: Record<string, unknown> = {
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY_DAYS: 30,
    };
    return values[key] ?? fallback;
  }),
} as unknown as ConfigService;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: AUTH_REPOSITORY, useValue: mockAuthRepo },
        { provide: EMAIL_SERVICE, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MfaService, useValue: mockMfaService },
      ],
    }).compile();

    service = m.get(AuthService);
    jest.clearAllMocks();
    mockAuthRepo.createRefreshToken.mockResolvedValue({} as RefreshToken);
    mockAuthRepo.createEmailVerificationToken.mockResolvedValue({} as EmailVerificationToken);
  });

  // ── register ──────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a user with a hashed password and issues tokens', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(makeUser());

      const result = await service.register({ email: 'alice@example.com', password: 'Str0ngPassw0rd' });

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'alice@example.com', roles: [UserRole.MEMBER] }),
      );
      const createCall = mockUserRepo.create.mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('Str0ngPassw0rd');
      expect(await bcrypt.compare('Str0ngPassw0rd', createCall.passwordHash!)).toBe(true);
      expect(mockAuthRepo.createEmailVerificationToken).toHaveBeenCalled();
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(
        'alice@example.com',
        expect.any(String),
      );
      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user.email).toBe('alice@example.com');
    });

    it('throws ConflictException when the email is already registered', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'alice@example.com', password: 'Str0ngPassw0rd' }),
      ).rejects.toThrow(ConflictException);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    it('authenticates a user with the correct password', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      const result = await service.login({ email: 'alice@example.com', password: 'Str0ngPassw0rd' });

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
    });

    it('throws UnauthorizedException for an unknown email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'whatever12' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.login({ email: 'alice@example.com', password: 'WrongPassword1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for a suspended account', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(
        makeUser({ passwordHash, status: UserStatus.SUSPENDED }),
      );

      await expect(
        service.login({ email: 'alice@example.com', password: 'Str0ngPassw0rd' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // ── brute-force protection (PR-002) ──────────────────────────────────

    it('increments failedLoginAttempts on a wrong password without locking below the threshold', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(
        makeUser({ passwordHash, failedLoginAttempts: 2 }),
      );
      mockUserRepo.update.mockResolvedValue(makeUser({ passwordHash, failedLoginAttempts: 3 }));

      await expect(
        service.login({ email: 'alice@example.com', password: 'WrongPassword1' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', {
        failedLoginAttempts: 3,
        lockedUntil: null,
      });
    });

    it('locks the account once the failure threshold is reached', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(
        makeUser({ passwordHash, failedLoginAttempts: 4 }),
      );
      mockUserRepo.update.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.login({ email: 'alice@example.com', password: 'WrongPassword1' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'u-001',
        expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: expect.any(Date) }),
      );
    });

    it('rejects a correct password while the account is still locked', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(
        makeUser({ passwordHash, lockedUntil: new Date(Date.now() + 60_000) }),
      );

      await expect(
        service.login({ email: 'alice@example.com', password: 'Str0ngPassw0rd' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('allows login once a past lock has expired and resets the counters', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(
        makeUser({
          passwordHash,
          failedLoginAttempts: 5,
          lockedUntil: new Date(Date.now() - 60_000),
        }),
      );
      mockUserRepo.update.mockResolvedValue(makeUser({ passwordHash }));

      const result = await service.login({ email: 'alice@example.com', password: 'Str0ngPassw0rd' });

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    });

    // ── email verification enforcement (PD-001) ──────────────────────────

    it('rejects login with ForbiddenException when the email is not verified', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(makeUser({ passwordHash, emailVerified: false }));

      await expect(
        service.login({ email: 'alice@example.com', password: 'Str0ngPassw0rd' }),
      ).rejects.toThrow(ForbiddenException);
    });

    // ── MFA challenge (PD-001) ────────────────────────────────────────────

    it('returns an MFA challenge instead of tokens when the account has MFA enabled', async () => {
      const passwordHash = await bcrypt.hash('Str0ngPassw0rd', 4);
      mockUserRepo.findByEmail.mockResolvedValue(makeUser({ passwordHash, mfaEnabled: true }));

      const result = await service.login({ email: 'alice@example.com', password: 'Str0ngPassw0rd' });

      expect(result).toEqual({ mfaRequired: true, mfaToken: 'signed.jwt.token' });
    });
  });

  // ── completeMfaLogin ──────────────────────────────────────────────────

  describe('completeMfaLogin', () => {
    it('issues real tokens for a valid challenge token and correct code', async () => {
      (mockJwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'u-001', type: 'mfa_challenge' });
      mockUserRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      mockMfaService.verifyLoginCode.mockResolvedValue(true);

      const result = await service.completeMfaLogin('challenge-token', '123456');

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(mockMfaService.verifyLoginCode).toHaveBeenCalledWith('u-001', '123456');
    });

    it('rejects an invalid or expired challenge token', async () => {
      (mockJwt.verifyAsync as jest.Mock).mockRejectedValue(new Error('expired'));

      await expect(service.completeMfaLogin('bogus', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token that is not an mfa_challenge type', async () => {
      (mockJwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'u-001', type: 'access' });

      await expect(service.completeMfaLogin('not-a-challenge', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an incorrect code', async () => {
      (mockJwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'u-001', type: 'mfa_challenge' });
      mockUserRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));
      mockMfaService.verifyLoginCode.mockResolvedValue(false);

      await expect(service.completeMfaLogin('challenge-token', '000000')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logoutEverywhere ──────────────────────────────────────────────────

  describe('logoutEverywhere', () => {
    it('revokes every refresh token for the caller', async () => {
      await service.logoutEverywhere('u-001');
      expect(mockAuthRepo.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('u-001');
    });
  });

  // ── resendVerificationEmail ───────────────────────────────────────────

  describe('resendVerificationEmail', () => {
    it('issues a new verification token when the account exists and is unverified', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser({ emailVerified: false }));

      await service.resendVerificationEmail({ email: 'alice@example.com' });

      expect(mockAuthRepo.createEmailVerificationToken).toHaveBeenCalled();
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith('alice@example.com', expect.any(String));
    });

    it('does nothing for an already-verified account (no enumeration signal)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser({ emailVerified: true }));

      await service.resendVerificationEmail({ email: 'alice@example.com' });

      expect(mockAuthRepo.createEmailVerificationToken).not.toHaveBeenCalled();
    });

    it('does nothing for an unregistered email (no enumeration signal)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await service.resendVerificationEmail({ email: 'ghost@example.com' });

      expect(mockAuthRepo.createEmailVerificationToken).not.toHaveBeenCalled();
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('issues a new token pair for a valid refresh token and revokes the old one', async () => {
      const stored: RefreshToken = {
        id: 'rt-001',
        tokenHash: 'hash',
        userId: 'u-001',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        replacedByTokenHash: null,
        createdAt: NOW,
      };
      mockAuthRepo.findRefreshTokenByHash.mockResolvedValue(stored);
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockAuthRepo.revokeRefreshToken.mockResolvedValue(stored);

      const result = await service.refresh('some-plaintext-refresh-token');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith('rt-001', expect.any(String));
    });

    it('throws UnauthorizedException when the token is not found', async () => {
      mockAuthRepo.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.refresh('bogus')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token is revoked', async () => {
      mockAuthRepo.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-001', tokenHash: 'hash', userId: 'u-001',
        expiresAt: new Date(Date.now() + 60_000), revokedAt: NOW,
        replacedByTokenHash: null, createdAt: NOW,
      });

      await expect(service.refresh('bogus')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token is expired', async () => {
      mockAuthRepo.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-001', tokenHash: 'hash', userId: 'u-001',
        expiresAt: new Date(Date.now() - 60_000), revokedAt: null,
        replacedByTokenHash: null, createdAt: NOW,
      });

      await expect(service.refresh('bogus')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes an active refresh token', async () => {
      const stored: RefreshToken = {
        id: 'rt-001', tokenHash: 'hash', userId: 'u-001',
        expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
        replacedByTokenHash: null, createdAt: NOW,
      };
      mockAuthRepo.findRefreshTokenByHash.mockResolvedValue(stored);

      await service.logout('some-token');

      expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith('rt-001');
    });

    it('does nothing when the token does not exist', async () => {
      mockAuthRepo.findRefreshTokenByHash.mockResolvedValue(null);

      await service.logout('bogus');

      expect(mockAuthRepo.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('issues a reset token and emails it when the email exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());

      await service.forgotPassword({ email: 'alice@example.com' });

      expect(mockAuthRepo.createPasswordResetToken).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith('alice@example.com', expect.any(String));
    });

    it('does not reveal whether the email exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(service.forgotPassword({ email: 'ghost@example.com' })).resolves.toBeUndefined();
      expect(mockAuthRepo.createPasswordResetToken).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('updates the password and revokes existing sessions', async () => {
      const stored: PasswordResetToken = {
        id: 'pr-001', tokenHash: 'hash', userId: 'u-001',
        expiresAt: new Date(Date.now() + 60_000), usedAt: null, createdAt: NOW,
      };
      mockAuthRepo.findPasswordResetTokenByHash.mockResolvedValue(stored);
      mockUserRepo.update.mockResolvedValue(makeUser());

      await service.resetPassword({ token: 'plaintext', password: 'NewStr0ngPassw0rd' });

      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', expect.objectContaining({
        passwordHash: expect.any(String),
      }));
      expect(mockAuthRepo.markPasswordResetTokenUsed).toHaveBeenCalledWith('pr-001');
      expect(mockAuthRepo.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('u-001');
    });

    it('throws UnauthorizedException for an already-used token', async () => {
      mockAuthRepo.findPasswordResetTokenByHash.mockResolvedValue({
        id: 'pr-001', tokenHash: 'hash', userId: 'u-001',
        expiresAt: new Date(Date.now() + 60_000), usedAt: NOW, createdAt: NOW,
      });

      await expect(
        service.resetPassword({ token: 'plaintext', password: 'NewStr0ngPassw0rd' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('marks the email as verified for a valid token', async () => {
      const stored: EmailVerificationToken = {
        id: 'ev-001', tokenHash: 'hash', userId: 'u-001',
        expiresAt: new Date(Date.now() + 60_000), usedAt: null, createdAt: NOW,
      };
      mockAuthRepo.findEmailVerificationTokenByHash.mockResolvedValue(stored);
      mockUserRepo.update.mockResolvedValue(makeUser({ emailVerified: true }));

      await service.verifyEmail({ token: 'plaintext' });

      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', { emailVerified: true });
      expect(mockAuthRepo.markEmailVerificationTokenUsed).toHaveBeenCalledWith('ev-001');
    });

    it('throws UnauthorizedException for an expired token', async () => {
      mockAuthRepo.findEmailVerificationTokenByHash.mockResolvedValue({
        id: 'ev-001', tokenHash: 'hash', userId: 'u-001',
        expiresAt: new Date(Date.now() - 60_000), usedAt: null, createdAt: NOW,
      });

      await expect(service.verifyEmail({ token: 'plaintext' })).rejects.toThrow(UnauthorizedException);
    });
  });
});
