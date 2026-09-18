import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityRequestSource,
  AuthorityResourceClass,
  AuthorityShareRecipientKind,
} from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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


  @ApiPropertyOptional({ enum: AuthorityShareRecipientKind })
  @IsOptional() @IsEnum(AuthorityShareRecipientKind)
  shareRecipientKind?: AuthorityShareRecipientKind;

  @ApiPropertyOptional({ description: 'Exact recipient identifier for SHARE authority.' })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(300)
  shareRecipientRef?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Minimum explicit field identifiers authorized for SHARE. Values/content do not belong here.',
  })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(25)
  @IsString({ each: true })
  @Matches(/^[A-Za-z0-9_.:-]+$/, { each: true })
  @MaxLength(80, { each: true })
  shareDataFields?: string[];

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


  @ApiPropertyOptional({ enum: AuthorityShareRecipientKind })
  @IsOptional() @IsEnum(AuthorityShareRecipientKind)
  shareRecipientKind?: AuthorityShareRecipientKind;

  @ApiPropertyOptional({ description: 'Exact recipient identifier for SHARE authority.' })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(300)
  shareRecipientRef?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Minimum explicit field identifiers authorized for SHARE. Values/content do not belong here.',
  })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(25)
  @IsString({ each: true })
  @Matches(/^[A-Za-z0-9_.:-]+$/, { each: true })
  @MaxLength(80, { each: true })
  shareDataFields?: string[];

  @ApiProperty({ description: 'The exact approved purpose for this attempted authority use.' })
  @IsString() @MinLength(3) @MaxLength(500)
  purpose: string;
}
