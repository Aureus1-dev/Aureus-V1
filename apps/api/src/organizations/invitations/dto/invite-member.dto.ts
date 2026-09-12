import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { OrganizationMemberRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ description: 'Email address of the person being invited' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: OrganizationMemberRole,
    default: OrganizationMemberRole.MEMBER,
    description: 'Role granted if the invitation is accepted. OWNER cannot be granted by invitation — use ownership transfer.',
  })
  @IsOptional() @IsEnum(OrganizationMemberRole)
  role?: OrganizationMemberRole;
}
