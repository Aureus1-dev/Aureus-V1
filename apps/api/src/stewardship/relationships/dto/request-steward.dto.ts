import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RequestStewardDto {
  @ApiPropertyOptional({ description: 'A specific steward the member is requesting, if any' })
  @IsOptional() @IsUUID()
  preferredStewardId?: string;
}
