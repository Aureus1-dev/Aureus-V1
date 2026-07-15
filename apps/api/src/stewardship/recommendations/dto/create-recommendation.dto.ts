import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { StewardshipRecommendationType } from '@prisma/client';

export class CreateRecommendationDto {
  @ApiProperty({ enum: StewardshipRecommendationType })
  @IsEnum(StewardshipRecommendationType)
  type: StewardshipRecommendationType;

  @ApiPropertyOptional({ description: 'Required when type is OPPORTUNITY' })
  @IsOptional() @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional({ description: 'Required when type is RESOURCE' })
  @IsOptional() @IsUUID()
  resourceId?: string;

  @ApiPropertyOptional({ example: 'This grant matches your current financial goal well.' })
  @IsOptional() @IsString()
  note?: string;
}
