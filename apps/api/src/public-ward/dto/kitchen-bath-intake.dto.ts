import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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

export enum KitchenBathPriority {
  LOOK_AND_FEEL = 'LOOK_AND_FEEL',
  FUNCTION_AND_LAYOUT = 'FUNCTION_AND_LAYOUT',
  DURABILITY = 'DURABILITY',
  BUDGET_CONTROL = 'BUDGET_CONTROL',
  TIMING = 'TIMING',
  ACCESSIBILITY = 'ACCESSIBILITY',
  LOW_MAINTENANCE = 'LOW_MAINTENANCE',
  RESALE_VALUE = 'RESALE_VALUE',
  ENERGY_EFFICIENCY = 'ENERGY_EFFICIENCY',
  OTHER = 'OTHER',
}

export enum KitchenBathBudgetRange {
  UNDER_25000 = 'UNDER_25000',
  FROM_25000_TO_50000 = 'FROM_25000_TO_50000',
  FROM_50000_TO_100000 = 'FROM_50000_TO_100000',
  FROM_100000_TO_200000 = 'FROM_100000_TO_200000',
  OVER_200000 = 'OVER_200000',
  UNSURE = 'UNSURE',
}

export class KitchenBathAttachmentReferenceDto {
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fileName: string;

  @ApiProperty({ maxLength: 120, example: 'image/jpeg' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  mimeType: string;

  @ApiProperty({ minimum: 1, maximum: 20_000_000 })
  @IsInt()
  @Min(1)
  @Max(20_000_000)
  sizeBytes: number;

  @ApiProperty({
    maxLength: 1000,
    description:
      'Opaque storage pointer created by the deployment storage adapter. Aureus does not infer or fetch arbitrary visitor URLs here.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  storageRef: string;
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

  @ApiPropertyOptional({
    type: [String],
    enum: KitchenBathPriority,
    maxItems: 6,
    description:
      'Optional customer-selected value criteria. These are transparent project priorities, never a hidden lead score.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsEnum(KitchenBathPriority, { each: true })
  priorities?: KitchenBathPriority[];

  @ApiPropertyOptional({ maxLength: 800 })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  mustHaves?: string;

  @ApiPropertyOptional({ maxLength: 800 })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  concerns?: string;


  @ApiPropertyOptional({ type: [KitchenBathAttachmentReferenceDto], maxItems: 6 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => KitchenBathAttachmentReferenceDto)
  attachments?: KitchenBathAttachmentReferenceDto[];
}
