import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength,
} from 'class-validator';
import { OrganizationType } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Community Legal Aid Society', minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3) @MaxLength(200)
  name: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  shortDescription: string;

  @ApiProperty()
  @IsString() @MinLength(10)
  fullDescription: string;

  @ApiProperty({ enum: OrganizationType })
  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ApiProperty({ example: 'https://communitylegalaid.example.org' })
  @IsUrl()
  websiteUrl: string;

  @ApiPropertyOptional({ example: 'partnerships@communitylegalaid.example.org' })
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
}
