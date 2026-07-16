import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PodInvitationStatus } from '@prisma/client';
import type { PodInvitation } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty()
  @IsUUID()
  invitedUserId: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  message?: string;
}

export class RespondToInvitationDto {
  @ApiProperty({ enum: ['ACCEPT', 'DECLINE'] })
  @IsIn(['ACCEPT', 'DECLINE'])
  decision: 'ACCEPT' | 'DECLINE';
}

export class InvitationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() podId: string;
  @ApiProperty() invitedUserId: string;
  @ApiProperty() invitedById: string;
  @ApiPropertyOptional({ nullable: true }) message: string | null;
  @ApiProperty({ enum: PodInvitationStatus }) status: PodInvitationStatus;
  @ApiPropertyOptional({ nullable: true }) respondedAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(i: PodInvitation): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    Object.assign(dto, i);
    return dto;
  }
}
