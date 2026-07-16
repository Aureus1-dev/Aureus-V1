import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SeasonOfLife } from '@prisma/client';
import type { Profile } from '@prisma/client';

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ nullable: true }) displayName: string | null;
  @ApiPropertyOptional({ nullable: true }) bio: string | null;
  @ApiPropertyOptional({ nullable: true }) avatarUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) city: string | null;
  @ApiPropertyOptional({ nullable: true }) region: string | null;
  @ApiPropertyOptional({ nullable: true }) stateProvince: string | null;
  @ApiPropertyOptional({ nullable: true }) country: string | null;
  @ApiPropertyOptional({ nullable: true }) localAreaDescription: string | null;
  @ApiPropertyOptional({ nullable: true }) profession: string | null;
  @ApiPropertyOptional({ enum: SeasonOfLife, nullable: true }) seasonOfLife: SeasonOfLife | null;
  @ApiPropertyOptional({ nullable: true }) availabilityNotes: string | null;
  @ApiPropertyOptional({ nullable: true }) preferredLanguage: string | null;
  @ApiPropertyOptional({ nullable: true }) faithPreference: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(p: Profile): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    dto.id = p.id; dto.userId = p.userId;
    dto.displayName = p.displayName ?? null;
    dto.bio = p.bio ?? null;
    dto.avatarUrl = p.avatarUrl ?? null;
    dto.city = p.city ?? null;
    dto.region = p.region ?? null;
    dto.stateProvince = p.stateProvince ?? null;
    dto.country = p.country ?? null;
    dto.localAreaDescription = p.localAreaDescription ?? null;
    dto.profession = p.profession ?? null;
    dto.seasonOfLife = p.seasonOfLife ?? null;
    dto.availabilityNotes = p.availabilityNotes ?? null;
    dto.preferredLanguage = p.preferredLanguage ?? null;
    dto.faithPreference = p.faithPreference ?? null;
    dto.createdAt = p.createdAt; dto.updatedAt = p.updatedAt; dto.deletedAt = p.deletedAt;
    return dto;
  }
}
