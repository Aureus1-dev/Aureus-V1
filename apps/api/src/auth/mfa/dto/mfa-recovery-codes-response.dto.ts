import { ApiProperty } from '@nestjs/swagger';

export class MfaRecoveryCodesResponseDto {
  @ApiProperty({
    type: [String],
    description: 'One-time recovery codes — shown only once, here. Each is single-use if the authenticator device is lost.',
  })
  recoveryCodes: string[];
}
