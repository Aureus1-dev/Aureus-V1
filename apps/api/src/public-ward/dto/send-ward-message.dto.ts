import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendWardMessageDto {
  @ApiProperty({
    description: 'The visitor question. It is treated as untrusted content, never as authority.',
    minLength: 1,
    maxLength: 1200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  content: string;
}
