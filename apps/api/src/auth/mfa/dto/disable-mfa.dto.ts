import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DisableMfaDto {
  @ApiProperty({ description: 'Current account password, required to confirm this security-sensitive change' })
  @IsString()
  @MinLength(1)
  password: string;
}
