import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import { MfaEnrollmentResponseDto } from './dto/mfa-enrollment-response.dto';

const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_BYTES = 5; // → 10 hex characters per code
const BCRYPT_SALT_ROUNDS = 12;
const MFA_ISSUER = 'Aureus';

/**
 * TOTP multi-factor authentication (PD-001 Production Foundation). Owns MFA
 * enrollment/enable/disable and login-time code verification only — token
 * issuance stays in AuthService (the single place that signs access/refresh
 * tokens), so AuthService calls back into this service, never the reverse.
 */
@Injectable()
export class MfaService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  /**
   * Begins (or restarts) enrollment: generates a fresh secret and persists it
   * unconfirmed. mfaEnabled stays false until confirmEnrollment succeeds, so
   * an abandoned enrollment never silently starts requiring a code at login.
   */
  async beginEnrollment(userId: string, email: string): Promise<MfaEnrollmentResponseDto> {
    const secret = generateSecret();
    await this.users.update(userId, { mfaSecret: secret });
    const otpauthUrl = generateURI({ issuer: MFA_ISSUER, label: email, secret });
    return { secret, otpauthUrl };
  }

  /** Confirms enrollment with a live TOTP code, enables MFA, and issues one-time recovery codes. */
  async confirmEnrollment(userId: string, code: string): Promise<string[]> {
    const user = await this.users.findById(userId);
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('No MFA enrollment is in progress for this account');
    }

    // A malformed (non-6-digit) code is as invalid as a wrong one — otplib
    // throws rather than returning { valid: false } for those, so both
    // outcomes collapse to the same 401 instead of a raw 500.
    const isValid = await verify({ secret: user.mfaSecret, token: code }).then(
      (result) => result.valid,
      () => false,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    const hashed = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, BCRYPT_SALT_ROUNDS)));
    await this.users.update(userId, { mfaEnabled: true, mfaRecoveryCodes: hashed });
    return recoveryCodes;
  }

  /** Disabling MFA is a security downgrade — always re-confirmed with the current password. */
  async disable(userId: string, password: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid password');
    }
    await this.users.update(userId, { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] });
  }

  /** Verifies a login-time code — a live TOTP code, or a single-use recovery code (consumed on match). */
  async verifyLoginCode(userId: string, code: string): Promise<boolean> {
    const user = await this.users.findById(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    // A recovery code is a different shape entirely (10 hex chars, not 6
    // digits) — otplib's verify() throws rather than returning { valid:
    // false } for a token that doesn't even look like a TOTP code, so that
    // must be treated as "not a TOTP match," not a real error.
    const isValidTotp = await verify({ secret: user.mfaSecret, token: code }).then(
      (result) => result.valid,
      () => false,
    );
    if (isValidTotp) {
      return true;
    }

    for (let i = 0; i < user.mfaRecoveryCodes.length; i++) {
      if (await bcrypt.compare(code, user.mfaRecoveryCodes[i])) {
        const remaining = [...user.mfaRecoveryCodes.slice(0, i), ...user.mfaRecoveryCodes.slice(i + 1)];
        await this.users.update(userId, { mfaRecoveryCodes: remaining });
        return true;
      }
    }

    return false;
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => randomBytes(RECOVERY_CODE_BYTES).toString('hex'));
  }
}
