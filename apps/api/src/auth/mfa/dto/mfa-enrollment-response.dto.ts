import { ApiProperty } from '@nestjs/swagger';

export class MfaEnrollmentResponseDto {
  @ApiProperty({ description: 'Base32 TOTP secret — shown once for manual entry as a fallback to scanning the QR code' })
  secret: string;

  @ApiProperty({ description: 'otpauth:// URI — render this as a QR code for the member to scan with an authenticator app' })
  otpauthUrl: string;
}
