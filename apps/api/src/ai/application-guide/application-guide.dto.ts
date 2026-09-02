import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class StartGuidedApplicationSessionDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiProperty()
  @IsUUID()
  opportunityId: string;
}

export class FindActiveGuidedApplicationSessionQueryDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;
}

export class GuidedApplicationConsentDto {
  @ApiProperty({
    description:
      'Explicit member choice. true grants screen-capture analysis consent; false revokes it.',
  })
  @IsBoolean()
  granted: boolean;
}

export const GUIDED_APPLICATION_IMAGE_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type GuidedApplicationImageMediaType =
  (typeof GUIDED_APPLICATION_IMAGE_MEDIA_TYPES)[number];

export class AnalyzeGuidedApplicationFrameDto {
  @ApiProperty({ enum: GUIDED_APPLICATION_IMAGE_MEDIA_TYPES })
  @IsIn(GUIDED_APPLICATION_IMAGE_MEDIA_TYPES)
  mediaType: GuidedApplicationImageMediaType;

  /**
   * Deliberately small. A Hall screen frame is downscaled client-side before
   * upload so the API can keep the normal JSON body limit rather than opening
   * a multi-megabyte request surface for the entire application.
   */
  @ApiProperty({
    description:
      'Raw base64 image bytes only (no data: prefix). Maximum encoded size 82,000 characters.',
  })
  @IsString()
  @MaxLength(82_000)
  imageBase64: string;

  @ApiPropertyOptional({
    description:
      'Optional member-authored note such as "I am on the income section." Never page-supplied instructions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  pageHint?: string;
}

export class GuidedApplicationSessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() opportunityId: string;
  @ApiProperty({ nullable: true }) responsibilityId: string | null;
  @ApiProperty() opportunityTitle: string;
  @ApiProperty() provider: string;
  @ApiProperty() applicationUrl: string;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true }) screenCaptureConsentGrantedAt: Date | null;
  @ApiProperty({ nullable: true }) screenCaptureConsentRevokedAt: Date | null;
  @ApiProperty({ nullable: true }) lastFrameAnalyzedAt: Date | null;
}

export type GuidedFieldSensitivity = 'NORMAL' | 'MEMBER_CONTROL';

export interface GuidedApplicationFieldGuidance {
  label: string;
  guidance: string;
  sensitivity: GuidedFieldSensitivity;
  memberControlReason: string | null;
}

export class GuidedApplicationAnalysisResponseDto {
  @ApiProperty() pageSummary: string;
  @ApiProperty() nextStep: string;
  @ApiProperty({ isArray: true }) fields: GuidedApplicationFieldGuidance[];
  @ApiProperty({ type: [String] }) warnings: string[];
  @ApiProperty({ example: false }) imagePersisted: false;
  @ApiProperty() analyzedAt: Date;
}
