import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMilestoneDto } from './create-milestone.dto';

export class UpdateMilestoneDto extends PartialType(OmitType(CreateMilestoneDto, ['journeyId'] as const)) {}
