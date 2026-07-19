import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ConfirmMfaDto {
  @ApiProperty({ description: '6-digit code from the authenticator app', example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
