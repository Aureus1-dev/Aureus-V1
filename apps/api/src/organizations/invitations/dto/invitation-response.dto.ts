import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationInvitationStatus, OrganizationMemberRole } from '@prisma/client';
import type { OrganizationInvitation } from '@prisma/client';

export class InvitationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() invitedEmail: string;
  @ApiProperty({ enum: OrganizationMemberRole }) role: OrganizationMemberRole;
  @ApiProperty({ enum: OrganizationInvitationStatus }) status: OrganizationInvitationStatus;
  @ApiProperty() invitedById: string;
  @ApiProperty() expiresAt: Date;
  @ApiPropertyOptional() acceptedAt: Date | null;
  @ApiPropertyOptional() declinedAt: Date | null;
  @ApiPropertyOptional() revokedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({ description: 'Present only on GET /invitations/mine' })
  organizationName?: string;

  static fromEntity(entity: OrganizationInvitation, organizationName?: string): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    Object.assign(dto, entity);
    if (organizationName !== undefined) dto.organizationName = organizationName;
    return dto;
  }
}
