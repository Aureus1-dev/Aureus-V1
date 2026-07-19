import { ApiProperty } from '@nestjs/swagger';

/**
 * Returned by POST /auth/login instead of AuthResponseDto when the account
 * has MFA enabled — the caller has proven their password but must still
 * complete POST /auth/mfa/verify-login with mfaToken + a TOTP/recovery code
 * before a real token pair is issued.
 */
export class MfaChallengeResponseDto {
  @ApiProperty({ example: true })
  mfaRequired: true;

  @ApiProperty({ description: 'Short-lived challenge token — present this and a TOTP/recovery code to /auth/mfa/verify-login' })
  mfaToken: string;
}
