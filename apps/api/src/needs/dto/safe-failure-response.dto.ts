import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UnresolvedNeed } from '@prisma/client';

/**
 * Gate C (C7: Safe failure). Reports the honest current state — either the
 * member's need is resolvable right now (`triggered: false`, no record
 * exists), or it genuinely has no verified resource and no reachable
 * steward, in which case `message`/`nextStep` are always populated and the
 * `UnresolvedNeed` row backing them is real and retrievable.
 *
 * `recordId` is an opaque provenance reference used by OR-004's
 * Responsibility evidence ledger. It does not expose any additional need
 * content or internal reasoning.
 */
export class SafeFailureResponseDto {
  @ApiProperty() triggered: boolean;
  @ApiPropertyOptional({ nullable: true }) recordId: string | null;
  @ApiPropertyOptional({ nullable: true }) reason: string | null;
  @ApiPropertyOptional({ nullable: true }) message: string | null;
  @ApiPropertyOptional({ nullable: true }) nextStep: string | null;
  @ApiPropertyOptional({ nullable: true }) recordedAt: Date | null;

  static notTriggered(): SafeFailureResponseDto {
    const dto = new SafeFailureResponseDto();
    dto.triggered = false;
    dto.recordId = null;
    dto.reason = null;
    dto.message = null;
    dto.nextStep = null;
    dto.recordedAt = null;
    return dto;
  }

  static fromEntity(e: UnresolvedNeed, nextStep: string): SafeFailureResponseDto {
    const dto = new SafeFailureResponseDto();
    dto.triggered = true;
    dto.recordId = e.id;
    dto.reason = e.reason;
    dto.message = e.message;
    dto.nextStep = nextStep;
    dto.recordedAt = e.createdAt;
    return dto;
  }
}
