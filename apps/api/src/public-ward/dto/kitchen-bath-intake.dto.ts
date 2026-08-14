import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export enum KitchenBathProjectType {
  KITCHEN = 'KITCHEN',
  BATHROOM = 'BATHROOM',
  KITCHEN_AND_BATH = 'KITCHEN_AND_BATH',
  OTHER_REMODELING = 'OTHER_REMODELING',
}

export enum KitchenBathDecisionStatus {
  OWNER_DECISION_MAKER = 'OWNER_DECISION_MAKER',
  OWNER_WITH_OTHER_DECISION_MAKERS = 'OWNER_WITH_OTHER_DECISION_MAKERS',
  AUTHORIZED_REPRESENTATIVE = 'AUTHORIZED_REPRESENTATIVE',
  EXPLORING = 'EXPLORING',
}

export enum KitchenBathBudgetRange {
  UNDER_25000 = 'UNDER_25000',
  FROM_25000_TO_50000 = 'FROM_25000_TO_50000',
  FROM_50000_TO_100000 = 'FROM_50000_TO_100000',
  FROM_100000_TO_200000 = 'FROM_100000_TO_200000',
  OVER_200000 = 'OVER_200000',
  UNSURE = 'UNSURE',
}

export class KitchenBathIntakeDto {
  @ApiProperty({ enum: KitchenBathProjectType })
  @IsEnum(KitchenBathProjectType)
  projectType: KitchenBathProjectType;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 8, example: ['kitchen', 'primary bathroom'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  rooms: string[];

  @ApiProperty({ minLength: 10, maxLength: 1500 })
  @IsString()
  @MinLength(10)
  @MaxLength(1500)
  scope: string;

  @ApiPropertyOptional({ enum: KitchenBathDecisionStatus })
  @IsOptional()
  @IsEnum(KitchenBathDecisionStatus)
  decisionStatus?: KitchenBathDecisionStatus;

  @ApiPropertyOptional({
    enum: KitchenBathBudgetRange,
    description: 'Optional. Ask only when useful to the visitor and the business; never infer it.',
  })
  @IsOptional()
  @IsEnum(KitchenBathBudgetRange)
  budgetRange?: KitchenBathBudgetRange;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  designNeeds?: string;
}

export class KitchenBathHandoffDto {
  @ApiProperty({ type: KitchenBathIntakeDto })
  @ValidateNested()
  @Type(() => KitchenBathIntakeDto)
  intake: KitchenBathIntakeDto;
}
