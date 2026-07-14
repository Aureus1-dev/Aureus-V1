import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOpportunityDto } from './create-opportunity.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateOpportunityDto extends PartialType(
  OmitType(CreateOpportunityDto, ['submittedById', 'createdById'] as const),
) {
  @ApiPropertyOptional()
  @IsUUID()
  lastUpdatedById?: string;
}
