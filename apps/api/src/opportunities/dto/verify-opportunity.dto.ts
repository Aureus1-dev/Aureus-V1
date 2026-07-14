import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class VerifyOpportunityDto {
  @ApiProperty({ description: 'UUID of the admin performing the verification' })
  @IsUUID()
  reviewedById: string;
}
