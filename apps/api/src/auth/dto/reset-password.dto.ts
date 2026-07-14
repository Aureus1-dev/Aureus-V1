import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token issued via the forgot-password flow' })
  @IsString()
  @MinLength(1, { message: 'token is required' })
  token: string;

  @ApiProperty({
    example: 'N3wStr0ng!Passw0rd',
    description: 'Minimum 10 characters, at least one letter and one number',
  })
  @IsString()
  @MinLength(10, { message: 'password must be at least 10 characters' })
  @MaxLength(128, { message: 'password must be at most 128 characters' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;
}
