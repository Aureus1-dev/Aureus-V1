import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Profile } from '@prisma/client';

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ nullable: true }) displayName: string | null;
  @ApiPropertyOptional({ nullable: true }) bio: string | null;
  @ApiPropertyOptional({ nullable: true }) avatarUrl: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(p: Profile): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    dto.id = p.id; dto.userId = p.userId;
    dto.displayName = p.displayName ?? null;
    dto.bio = p.bio ?? null;
    dto.avatarUrl = p.avatarUrl ?? null;
    dto.createdAt = p.createdAt; dto.updatedAt = p.updatedAt; dto.deletedAt = p.deletedAt;
    return dto;
  }
}
