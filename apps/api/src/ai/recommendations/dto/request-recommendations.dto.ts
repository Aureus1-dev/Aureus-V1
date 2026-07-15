import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum RecommendationCategory {
  OPPORTUNITY = 'OPPORTUNITY',
  RESOURCE = 'RESOURCE',
  COURSE = 'COURSE',
}

export class RequestRecommendationsDto {
  @ApiProperty({ enum: RecommendationCategory })
  @IsEnum(RecommendationCategory)
  category: RecommendationCategory;
}
