import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength,
} from 'class-validator';
import { CitySheetCategory, LaunchAreaScope } from '@prisma/client';

export class CreateCitySheetEntryDto {
  @ApiProperty({ example: 'Chester County Crisis Line', minLength: 2, maxLength: 200 })
  @IsString() @MinLength(2) @MaxLength(200)
  organizationName: string;

  @ApiProperty({ enum: CitySheetCategory })
  @IsEnum(CitySheetCategory)
  category: CitySheetCategory;

  @ApiProperty({ description: 'What this organization/service does and who it serves' })
  @IsString() @MinLength(10)
  description: string;

  @ApiPropertyOptional({ example: '123 Main St, West Chester, PA 19380' })
  @IsOptional() @IsString()
  address?: string;

  @ApiProperty({ example: 'Chester County only', description: 'Free-text description of geographic coverage' })
  @IsString() @MinLength(2)
  serviceArea: string;

  @ApiPropertyOptional({
    enum: LaunchAreaScope,
    default: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    description: 'Whether this entry is within the core launch counties (Chester/Delaware) or a supplemental Greater Philadelphia resource that genuinely serves the launch area',
  })
  @IsOptional() @IsEnum(LaunchAreaScope)
  launchScope?: LaunchAreaScope;

  @ApiPropertyOptional({ example: '+1-610-555-0100' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.org' })
  @IsOptional() @IsUrl()
  website?: string;

  @ApiProperty({ example: 'Crisis line: 24/7. Office: Mon–Fri 9am–5pm.' })
  @IsString()
  hours: string;

  @ApiPropertyOptional({ example: 'Chester County residents; no income requirement' })
  @IsOptional() @IsString()
  eligibilityRequirements?: string;

  @ApiPropertyOptional({ type: [String], example: ['English', 'Spanish'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  languagesSupported?: string[];

  @ApiPropertyOptional({ example: 'Wheelchair-accessible entrance; TTY line available' })
  @IsOptional() @IsString()
  accessibilityNotes?: string;

  @ApiPropertyOptional({ example: 'Free' })
  @IsOptional() @IsString()
  cost?: string;

  @ApiPropertyOptional({ type: [String], example: ['Photo ID', 'Proof of residency'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  requiredDocuments?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  referralRequired?: boolean;

  @ApiPropertyOptional({ default: false, description: 'True for crisis lines and other emergency services' })
  @IsOptional() @IsBoolean()
  isEmergencyService?: boolean;

  @ApiPropertyOptional({
    description: 'Where/how this candidate was originally compiled (e.g. a web-research citation). Immutable after creation — never touched by verify/reject/flag-for-review.',
    example: 'Candidate compiled via web research on 2026-07-22. Source: chesco.org/1640/Emergency.',
  })
  @IsOptional() @IsString()
  sourceNotes?: string;
}
