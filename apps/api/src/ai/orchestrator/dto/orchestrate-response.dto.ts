import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrchestrationRunResponseDto } from './orchestration-run-response.dto';
import { RecommendationResponseDto } from '../../recommendations/dto/recommendation-response.dto';
import { InsightResponseDto } from '../../insights/dto/insight-response.dto';

export class OrchestrateResponseDto {
  @ApiProperty({ type: OrchestrationRunResponseDto, description: 'The tracing/correlation record for this orchestration call' })
  run: OrchestrationRunResponseDto;

  @ApiPropertyOptional({ type: [RecommendationResponseDto], description: 'Present when the goal was served by the Recommendation Engine' })
  recommendations?: RecommendationResponseDto[];

  @ApiPropertyOptional({ type: InsightResponseDto, description: 'Present when the goal was served by Journey guidance' })
  insight?: InsightResponseDto;
}
