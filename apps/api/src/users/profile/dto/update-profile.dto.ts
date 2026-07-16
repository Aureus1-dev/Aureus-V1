import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { SeasonOfLife } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alice Johnson', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Software engineer passionate about learning', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional() @IsUrl()
  avatarUrl?: string;

  // ── Pods matching signals (WO-030 Founder Decisions #7-#9) ──────────────
  // Every field below is optional, member-owned, editable, and purpose-bound
  // — the Institution learns because the member chooses to share, never
  // because a field is required or defaulted. "Collect only what is
  // genuinely needed to faithfully serve the person."

  @ApiPropertyOptional({ example: 'Austin', description: 'Coarse location only — never precise geolocation' })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Central Texas', description: 'A metro area, county, or district — not always equal to state' })
  @IsOptional() @IsString() @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ example: 'Texas' })
  @IsOptional() @IsString() @MaxLength(100)
  stateProvince?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional() @IsString() @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Free text: describe the community area you consider local to you', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  localAreaDescription?: string;

  @ApiPropertyOptional({ example: 'Nurse', maxLength: 150 })
  @IsOptional() @IsString() @MaxLength(150)
  profession?: string;

  @ApiPropertyOptional({ enum: SeasonOfLife, description: 'A current season, never a permanent category. No season is ranked above another.' })
  @IsOptional() @IsEnum(SeasonOfLife)
  seasonOfLife?: SeasonOfLife;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  availabilityNotes?: string;

  @ApiPropertyOptional({ example: 'English', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  preferredLanguage?: string;

  @ApiPropertyOptional({ description: 'Voluntary only — never defaulted, never required', maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200)
  faithPreference?: string;
}
