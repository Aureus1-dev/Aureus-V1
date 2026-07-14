import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class RejectOpportunityDto {
  @ApiProperty({ example: 'Source URL is unreachable; details could not be verified.' })
  @IsString() @MinLength(10)
  rejectionReason: string;

  @ApiProperty({ description: 'UUID of the admin performing the rejection' })
  @IsUUID()
  reviewedById: string;
}
