import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrganizationMemberRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({ description: 'UUID of the user to add as a representative' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    enum: OrganizationMemberRole,
    default: OrganizationMemberRole.MEMBER,
    description:
      'OWNER is never accepted here — grant ownership only through the explicit ownership-transfer action',
  })
  @IsOptional()
  @IsEnum(OrganizationMemberRole)
  role?: OrganizationMemberRole;
}
