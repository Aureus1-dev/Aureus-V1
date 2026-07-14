import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token issued at registration' })
  @IsString()
  @MinLength(1, { message: 'token is required' })
  token: string;
}
