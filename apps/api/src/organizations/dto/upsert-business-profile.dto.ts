import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessPublicStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ServiceAreaDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  postalCodes?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  remote?: boolean;
}

export class ContactRouteDto {
  @ApiProperty({ enum: ['PHONE', 'SMS', 'EMAIL', 'WEBSITE'] })
  @IsIn(['PHONE', 'SMS', 'EMAIL', 'WEBSITE'])
  type: 'PHONE' | 'SMS' | 'EMAIL' | 'WEBSITE';

  @ApiProperty()
  @IsString() @MaxLength(500)
  value: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80)
  label?: string;
}

export class EscalationTargetDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;
}

export class UpsertBusinessProfileDto {
  @ApiPropertyOptional({ example: 'river-city-kitchens' })
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(80)
  publicSlug?: string;

  @ApiPropertyOptional({ enum: BusinessPublicStatus })
  @IsOptional() @IsEnum(BusinessPublicStatus)
  publicStatus?: BusinessPublicStatus;

  @ApiProperty()
  @ValidateNested() @Type(() => ServiceAreaDto)
  serviceArea: ServiceAreaDto;

  @ApiProperty({ description: 'Day keys mapped to human-readable opening hours' })
  @IsObject()
  businessHours: Record<string, string>;

  @ApiProperty({ type: [ContactRouteDto] })
  @IsArray() @ArrayMaxSize(12)
  @ValidateNested({ each: true }) @Type(() => ContactRouteDto)
  contactRoutes: ContactRouteDto[];

  @ApiPropertyOptional({ type: EscalationTargetDto })
  @IsOptional() @ValidateNested() @Type(() => EscalationTargetDto)
  escalationTarget?: EscalationTargetDto;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional() @IsInt() @Min(0) @Max(5)
  onboardingStep?: number;
}
