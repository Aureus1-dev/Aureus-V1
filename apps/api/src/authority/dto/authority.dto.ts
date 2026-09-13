import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityRequestSource,
  AuthorityResourceClass,
} from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAuthorityRequestDto {
  @ApiProperty({ enum: AuthorityContextType })
  @IsEnum(AuthorityContextType)
  contextType: AuthorityContextType;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subjectUserId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;

  @ApiProperty({ enum: AuthorityCapability })
  @IsEnum(AuthorityCapability)
  capability: AuthorityCapability;

  @ApiProperty({ enum: AuthorityResourceClass })
  @IsEnum(AuthorityResourceClass)
  resourceClass: AuthorityResourceClass;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  resourceRef?: string;

  @ApiProperty()
  @IsString() @MinLength(3) @MaxLength(500)
  purpose: string;

  @ApiPropertyOptional({ enum: AuthorityRequestSource, default: AuthorityRequestSource.USER })
  @IsOptional() @IsEnum(AuthorityRequestSource)
  source?: AuthorityRequestSource;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expiresAt?: string;
}

export class AuthorityReasonDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class AuthorityCapabilityControlDto {
  @ApiProperty({ enum: AuthorityContextType })
  @IsEnum(AuthorityContextType)
  contextType: AuthorityContextType;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subjectUserId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;

  @ApiProperty({ enum: AuthorityCapability })
  @IsEnum(AuthorityCapability)
  capability: AuthorityCapability;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class AuthorityEvaluationDto {
  @ApiProperty({ enum: AuthorityContextType })
  @IsEnum(AuthorityContextType)
  contextType: AuthorityContextType;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subjectUserId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;

  @ApiProperty({ enum: AuthorityCapability })
  @IsEnum(AuthorityCapability)
  capability: AuthorityCapability;

  @ApiProperty({ enum: AuthorityResourceClass })
  @IsEnum(AuthorityResourceClass)
  resourceClass: AuthorityResourceClass;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  resourceRef?: string;

  @ApiProperty({ description: 'The exact approved purpose for this attempted authority use.' })
  @IsString() @MinLength(3) @MaxLength(500)
  purpose: string;
}
