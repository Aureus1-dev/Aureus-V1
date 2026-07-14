import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateJourneyDto } from './create-journey.dto';

export class UpdateJourneyDto extends PartialType(OmitType(CreateJourneyDto, ['goalId'] as const)) {}
