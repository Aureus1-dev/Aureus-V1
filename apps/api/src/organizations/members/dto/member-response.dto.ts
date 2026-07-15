import { ApiProperty } from '@nestjs/swagger';
import { OrganizationMemberRole } from '@prisma/client';
import type { OrganizationMember } from '@prisma/client';

export class MemberResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: OrganizationMemberRole }) role: OrganizationMemberRole;
  @ApiProperty() createdAt: Date;

  static fromEntity(m: OrganizationMember): MemberResponseDto {
    const dto = new MemberResponseDto();
    Object.assign(dto, m);
    return dto;
  }
}
