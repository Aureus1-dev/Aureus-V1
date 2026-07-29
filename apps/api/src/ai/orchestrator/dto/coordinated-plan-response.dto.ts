import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationResponseDto } from '../../recommendations/dto/recommendation-response.dto';
import { MatchedResourceDto } from '../../../needs/dto/matched-resource.dto';

export enum PlanItemSource {
  RECOMMENDATION = 'RECOMMENDATION',
  CITY_RESOURCE = 'CITY_RESOURCE',
}

/**
 * One item in a coordinated plan. Discriminated by `source` rather than
 * forced into one shape, because the two kinds of thing it can point to
 * keep their own real, unchanged approval mechanism: a RECOMMENDATION
 * item is an ordinary `AiRecommendation` (approve/dismiss); a
 * CITY_RESOURCE item is an ordinary City Sheet match (Gate C's existing
 * offer/respond). This DTO only presents the plan — deciding on an item
 * is still a separate, explicit call to whichever of those two mechanisms
 * applies, exactly as before this migration.
 */
export class PlanItemDto {
  @ApiProperty({ enum: PlanItemSource })
  source: PlanItemSource;

  @ApiPropertyOptional({ type: RecommendationResponseDto, nullable: true, description: 'Present when source is RECOMMENDATION' })
  recommendation: RecommendationResponseDto | null;

  @ApiPropertyOptional({ type: MatchedResourceDto, nullable: true, description: 'Present when source is CITY_RESOURCE' })
  cityResource: MatchedResourceDto | null;

  /** Short, human-readable label for this item's category, for display without a second lookup. */
  @ApiProperty()
  categoryLabel: string;
}

/**
 * One coordinated plan (Member Arrival — Steward Experience migration,
 * Founder-approved). Never a search results list: exactly one Primary
 * next step, zero to two genuinely useful Supporting steps (never padded
 * to a fixed count), and a plain-language explanation of why the primary
 * step leads and how the rest fit with it.
 */
export class CoordinatedPlanResponseDto {
  @ApiProperty({ type: PlanItemDto })
  primary: PlanItemDto;

  @ApiProperty({ type: [PlanItemDto] })
  supporting: PlanItemDto[];

  @ApiProperty({ description: 'Plain-language explanation of why the primary step leads, and how it and the supporting steps work together.' })
  combinedRationale: string;

  @ApiProperty({ description: 'Count of additional real candidates found but not surfaced, so the member can ask for more without ever being shown a list up front.' })
  additionalPossibilitiesCount: number;
}
