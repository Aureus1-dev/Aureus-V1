import { Test } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generate, generateSecret } from 'otplib';
import { MfaService } from './mfa.service';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import type { User } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeUser = (o: Partial<User> = {}): User => ({
  id: 'u-001', email: 'alice@example.com', emailVerified: true, passwordHash: null,
  roles: [UserRole.MEMBER], status: UserStatus.ACTIVE, failedLoginAttempts: 0, lockedUntil: null,
  mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [],
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockUserRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findAll: jest.fn(),
};

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [MfaService, { provide: USER_REPOSITORY, useValue: mockUserRepo }],
    }).compile();
    service = m.get(MfaService);
    jest.clearAllMocks();
  });

  describe('beginEnrollment', () => {
    it('generates a secret, persists it unconfirmed, and returns an otpauth URL', async () => {
      const result = await service.beginEnrollment('u-001', 'alice@example.com');

      expect(typeof result.secret).toBe('string');
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', { mfaSecret: result.secret });
    });
  });

  describe('confirmEnrollment', () => {
    it('throws BadRequestException when no enrollment is in progress', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser({ mfaSecret: null }));
      await expect(service.confirmEnrollment('u-001', '123456')).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException for an invalid code', async () => {
      const secret = generateSecret();
      mockUserRepo.findById.mockResolvedValue(makeUser({ mfaSecret: secret }));
      await expect(service.confirmEnrollment('u-001', '000000')).rejects.toThrow(UnauthorizedException);
    });

    it('enables MFA and returns hashed-not-plaintext recovery codes for a valid code', async () => {
      const secret = generateSecret();
      const code = await generate({ secret });
      mockUserRepo.findById.mockResolvedValue(makeUser({ mfaSecret: secret }));

      const codes = await service.confirmEnrollment('u-001', code);

      expect(codes).toHaveLength(8);
      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', expect.objectContaining({ mfaEnabled: true }));
      const persisted = mockUserRepo.update.mock.calls[0][1].mfaRecoveryCodes as string[];
      expect(persisted).toHaveLength(8);
      expect(persisted[0]).not.toBe(codes[0]);
    });
  });

  describe('disable', () => {
    it('throws UnauthorizedException for a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      mockUserRepo.findById.mockResolvedValue(makeUser({ passwordHash, mfaEnabled: true }));
      await expect(service.disable('u-001', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    });

    it('clears every MFA field for a correct password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      mockUserRepo.findById.mockResolvedValue(
        makeUser({ passwordHash, mfaEnabled: true, mfaSecret: 'x', mfaRecoveryCodes: ['a'] }),
      );

      await service.disable('u-001', 'correct-password');

      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', {
        mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [],
      });
    });
  });

  describe('verifyLoginCode', () => {
    it('returns false when MFA is not enabled', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: false }));
      await expect(service.verifyLoginCode('u-001', '123456')).resolves.toBe(false);
    });

    it('returns true for a valid live TOTP code', async () => {
      const secret = generateSecret();
      const code = await generate({ secret });
      mockUserRepo.findById.mockResolvedValue(makeUser({ mfaEnabled: true, mfaSecret: secret }));

      await expect(service.verifyLoginCode('u-001', code)).resolves.toBe(true);
    });

    it('returns true and consumes (single-use) a matching recovery code', async () => {
      const secret = generateSecret();
      const hashedA = await bcrypt.hash('recovery-code-a', 4);
      const hashedB = await bcrypt.hash('recovery-code-b', 4);
      mockUserRepo.findById.mockResolvedValue(makeUser({
        mfaEnabled: true, mfaSecret: secret, mfaRecoveryCodes: [hashedA, hashedB],
      }));

      const result = await service.verifyLoginCode('u-001', 'recovery-code-a');

      expect(result).toBe(true);
      expect(mockUserRepo.update).toHaveBeenCalledWith('u-001', { mfaRecoveryCodes: [hashedB] });
    });

    it('returns false for an invalid code that matches no recovery code either', async () => {
      const secret = generateSecret();
      const hashedA = await bcrypt.hash('recovery-code-a', 4);
      mockUserRepo.findById.mockResolvedValue(makeUser({
        mfaEnabled: true, mfaSecret: secret, mfaRecoveryCodes: [hashedA],
      }));

      await expect(service.verifyLoginCode('u-001', 'totally-wrong')).resolves.toBe(false);
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });
});
