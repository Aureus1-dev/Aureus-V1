import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;
}
