import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyMfaLoginDto {
  @ApiProperty({ description: 'The mfaToken returned by /auth/login' })
  @IsString()
  mfaToken: string;

  @ApiProperty({ description: 'A 6-digit TOTP code, or a single-use recovery code', example: '123456' })
  @IsString()
  @Length(6, 10)
  code: string;
}
