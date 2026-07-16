import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AiMessageCompletionStatus, AiTurnEventType } from '@prisma/client';

/**
 * Finalized-only sync (Founder Decision 3: "Do not treat unstable partial
 * transcription as a final member message"). The client only ever reports
 * a message here once the provider has finalized it — there is no partial/
 * draft variant of this DTO, by design, not by omission.
 */
export class VoiceMessageEventDto {
  @ApiProperty({ enum: ['USER', 'ASSISTANT'] })
  @IsIn(['USER', 'ASSISTANT'])
  role: 'USER' | 'ASSISTANT';

  @ApiProperty()
  @IsString() @MinLength(1)
  content: string;

  @ApiProperty({ description: 'Provider item id — required for idempotent re-delivery on reconnect/retry' })
  @IsString() @MinLength(1)
  providerItemId: string;

  @ApiPropertyOptional({ enum: AiMessageCompletionStatus, default: AiMessageCompletionStatus.COMPLETE })
  @IsOptional() @IsEnum(AiMessageCompletionStatus)
  completionStatus?: AiMessageCompletionStatus;
}

export class VoiceTurnEventDto {
  @ApiProperty({ enum: AiTurnEventType })
  @IsEnum(AiTurnEventType)
  type: AiTurnEventType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  providerItemId?: string;

  @ApiProperty({ description: 'Client-reported timestamp of when this actually occurred' })
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional()
  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}

export class SyncVoiceEventsDto {
  @ApiPropertyOptional({ type: [VoiceMessageEventDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VoiceMessageEventDto)
  messages?: VoiceMessageEventDto[];

  @ApiPropertyOptional({ type: [VoiceTurnEventDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VoiceTurnEventDto)
  turnEvents?: VoiceTurnEventDto[];
}
