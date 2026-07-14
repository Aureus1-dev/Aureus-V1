import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token issued at login or last refresh' })
  @IsString()
  @MinLength(1, { message: 'refreshToken is required' })
  refreshToken: string;
}
