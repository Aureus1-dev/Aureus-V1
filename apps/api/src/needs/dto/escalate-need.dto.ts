import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class EscalateNeedDto {
  @ApiPropertyOptional({ description: 'Whatever the member wants a human steward to know before responding' })
  @IsOptional() @IsString()
  reason?: string;
}
