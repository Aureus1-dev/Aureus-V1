import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateGoalDto } from './create-goal.dto';

export class UpdateGoalDto extends PartialType(OmitType(CreateGoalDto, ['userId'] as const)) {}
