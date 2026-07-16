import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PodMemberRole, PodMembershipOrigin, PodMembershipStatus } from '@prisma/client';
import type { PodMembership } from '@prisma/client';

export class MembershipResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() podId: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: PodMemberRole }) role: PodMemberRole;
  @ApiProperty({ enum: PodMembershipStatus }) status: PodMembershipStatus;
  @ApiProperty({ enum: PodMembershipOrigin }) origin: PodMembershipOrigin;
  @ApiPropertyOptional({ nullable: true }) invitedById: string | null;
  @ApiPropertyOptional({ nullable: true }) joinedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) endedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) endReason: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(m: PodMembership): MembershipResponseDto {
    const dto = new MembershipResponseDto();
    Object.assign(dto, m);
    return dto;
  }
}
