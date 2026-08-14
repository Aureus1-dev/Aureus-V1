import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WardLeadContactMethod, WardLeadDesiredTiming } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Equals,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WARD_LEAD_CONSENT_VERSION } from '../ward-lead-consent';
import { KitchenBathIntakeDto } from './kitchen-bath-intake.dto';

export class CreateWardLeadDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName: string;

  @ApiProperty({ enum: WardLeadContactMethod })
  @IsEnum(WardLeadContactMethod)
  contactMethod: WardLeadContactMethod;

  @ApiProperty({ maxLength: 320 })
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  contactValue: string;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  projectSummary: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  projectLocation?: string;

  @ApiPropertyOptional({ enum: WardLeadDesiredTiming })
  @IsOptional()
  @IsEnum(WardLeadDesiredTiming)
  desiredTiming?: WardLeadDesiredTiming;

  @ApiPropertyOptional({ type: KitchenBathIntakeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => KitchenBathIntakeDto)
  kitchenBath?: KitchenBathIntakeDto;

  @ApiProperty({ enum: [WARD_LEAD_CONSENT_VERSION] })
  @Equals(WARD_LEAD_CONSENT_VERSION)
  consentVersion: typeof WARD_LEAD_CONSENT_VERSION;

  @ApiProperty({ description: 'SHA-256 of the exact consent copy displayed to the visitor' })
  @Matches(/^[a-f0-9]{64}$/)
  consentTextSha256: string;

  @ApiProperty({ example: true, description: 'Must be an affirmative, unchecked visitor action' })
  @Equals(true)
  consentGranted: true;
}
