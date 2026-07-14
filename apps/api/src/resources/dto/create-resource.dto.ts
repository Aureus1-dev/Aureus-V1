import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUrl,
  MaxLength, MinLength,
} from 'class-validator';
import { ResourceCategory, ResourceType, SourceType } from '@prisma/client';

export class CreateResourceDto {
  @ApiProperty({ example: 'Community Legal Aid Society', minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  shortDescription: string;

  @ApiProperty()
  @IsString() @MinLength(10)
  fullDescription: string;

  @ApiProperty({ enum: ResourceCategory })
  @IsEnum(ResourceCategory)
  category: ResourceCategory;

  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiPropertyOptional({ type: [String], example: ['free', 'walk-in'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ example: 'Community Legal Aid Society' })
  @IsString() @MinLength(2)
  organizationName: string;

  @ApiProperty({ example: 'https://communitylegalaid.example.org' })
  @IsUrl()
  officialSourceUrl: string;

  @ApiPropertyOptional({ example: 'Intake Coordinator' })
  @IsOptional() @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: 'intake@communitylegalaid.example.org' })
  @IsOptional() @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1-555-010-2000' })
  @IsOptional() @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Downtown Office' })
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Texas' })
  @IsOptional() @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Austin' })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ default: false, description: 'True for online-only / remote resources' })
  @IsOptional() @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ example: 'Open to all residents; no income requirement' })
  @IsOptional() @IsString()
  eligibilityNotes?: string;

  @ApiProperty({ example: 'Community Legal Aid Society' })
  @IsString()
  sourceName: string;

  @ApiPropertyOptional({ example: 'https://communitylegalaid.example.org/about' })
  @IsOptional() @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({ enum: SourceType, default: SourceType.ADMIN_ENTRY })
  @IsOptional() @IsEnum(SourceType)
  sourceType?: SourceType;
}
