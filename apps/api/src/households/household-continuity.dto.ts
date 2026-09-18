import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum HouseholdRelationshipType {
  SPOUSE_OR_PARTNER = 'SPOUSE_OR_PARTNER',
  PARENT_OR_GUARDIAN = 'PARENT_OR_GUARDIAN',
  CHILD_OR_DEPENDENT = 'CHILD_OR_DEPENDENT',
  CAREGIVER = 'CAREGIVER',
  CARE_RECIPIENT = 'CARE_RECIPIENT',
  SIBLING = 'SIBLING',
  RELATIVE = 'RELATIVE',
  ROOMMATE = 'ROOMMATE',
  OTHER = 'OTHER',
}

export enum HouseholdDependencyKind {
  FINANCIAL = 'FINANCIAL',
  CARE = 'CARE',
  HOUSING = 'HOUSING',
  TRANSPORTATION = 'TRANSPORTATION',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  HEALTHCARE = 'HEALTHCARE',
  OTHER = 'OTHER',
}

export enum HouseholdDependencyDirection {
  I_SUPPORT_THEM = 'I_SUPPORT_THEM',
  THEY_SUPPORT_ME = 'THEY_SUPPORT_ME',
}

export class CreateHouseholdDto {
  @ApiPropertyOptional({ description: 'Member-owned household label; never used as an authority signal.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}

export class InviteHouseholdMemberDto {
  @ApiProperty({ format: 'uuid', description: 'Exact existing Aureus member to invite.' })
  @IsUUID()
  userId!: string;
}

export class RespondHouseholdProposalDto {
  @ApiProperty()
  @IsBoolean()
  accept!: boolean;
}

export class CreateHouseholdRelationshipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  otherUserId!: string;

  @ApiProperty({ enum: HouseholdRelationshipType })
  @IsEnum(HouseholdRelationshipType)
  type!: HouseholdRelationshipType;
}

export class CreateHouseholdDependencyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  otherUserId!: string;

  @ApiProperty({ enum: HouseholdDependencyDirection })
  @IsEnum(HouseholdDependencyDirection)
  direction!: HouseholdDependencyDirection;

  @ApiProperty({ enum: HouseholdDependencyKind })
  @IsEnum(HouseholdDependencyKind)
  kind!: HouseholdDependencyKind;
}

export class ShareHouseholdResponsibilityDto {
  @ApiProperty({ format: 'uuid', description: 'Exact caller-owned Personal Responsibility.' })
  @IsUUID()
  responsibilityId!: string;

  @ApiProperty({ format: 'uuid', description: 'Exact ACTIVE household member invited to coordinate.' })
  @IsUUID()
  participantUserId!: string;
}
