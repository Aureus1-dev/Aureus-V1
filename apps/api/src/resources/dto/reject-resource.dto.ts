import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectResourceDto {
  @ApiProperty({ example: 'Official source URL is unreachable; details could not be verified.' })
  @IsString() @MinLength(10)
  rejectionReason: string;
}
