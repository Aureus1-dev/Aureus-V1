import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
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

/**
 * Real cost tracking (ADR-017 follow-up): OpenAI's `response.done` event
 * carries the actual token usage for that turn, but only the client ever
 * sees it — Founder Decision 1 rules out a backend audio proxy, so this
 * is the only way the backend learns real voice cost rather than
 * recording costUsd=0 forever. `providerItemId` mirrors the same field on
 * the assistant message this usage belongs to (itemId, falling back to
 * responseId for a pure tool-call turn with no spoken content) — reusing
 * that identifier, rather than inventing a parallel one, is what lets the
 * backend dedupe a replayed usage report the same way it already dedupes
 * a replayed message.
 */
export class VoiceUsageEventDto {
  @ApiProperty({ description: "The same providerItemId as this turn's assistant message" })
  @IsString() @MinLength(1)
  providerItemId: string;

  @ApiProperty() @IsInt() @Min(0)
  inputAudioTokens: number;

  @ApiProperty() @IsInt() @Min(0)
  inputTextTokens: number;

  @ApiProperty() @IsInt() @Min(0)
  cachedAudioTokens: number;

  @ApiProperty() @IsInt() @Min(0)
  cachedTextTokens: number;

  @ApiProperty() @IsInt() @Min(0)
  outputAudioTokens: number;

  @ApiProperty() @IsInt() @Min(0)
  outputTextTokens: number;
}

export class SyncVoiceEventsDto {
  @ApiPropertyOptional({ type: [VoiceMessageEventDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VoiceMessageEventDto)
  messages?: VoiceMessageEventDto[];

  @ApiPropertyOptional({ type: [VoiceTurnEventDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VoiceTurnEventDto)
  turnEvents?: VoiceTurnEventDto[];

  @ApiPropertyOptional({ type: [VoiceUsageEventDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VoiceUsageEventDto)
  usage?: VoiceUsageEventDto[];
}
