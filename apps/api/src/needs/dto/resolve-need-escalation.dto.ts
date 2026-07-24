import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolveNeedEscalationDto {
  @ApiPropertyOptional({ description: "The steward's own account of how this was resolved" })
  @IsOptional() @IsString()
  resolutionNotes?: string;
}
