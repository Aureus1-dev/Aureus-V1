import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEvent,
  ResponsibilityEventType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
} from '@prisma/client';
import type { ResponsibilityWithEvents } from '../repositories/responsibility.repository.interface';

export class ResponsibilityEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ResponsibilityEventType }) type!: ResponsibilityEventType;
  @ApiProperty({ enum: ResponsibilityActorClass }) actorClass!: ResponsibilityActorClass;
  @ApiPropertyOptional({ nullable: true }) actorUserId!: string | null;
  @ApiPropertyOptional({ enum: ResponsibilityStatus, nullable: true }) fromStatus!: ResponsibilityStatus | null;
  @ApiPropertyOptional({ enum: ResponsibilityStatus, nullable: true }) toStatus!: ResponsibilityStatus | null;
  @ApiPropertyOptional({ nullable: true }) sourceSystem!: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceRecordType!: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceRecordId!: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceState!: string | null;
  @ApiPropertyOptional({ enum: ResponsibilityEvidenceLevel, nullable: true })
  evidenceLevel!: ResponsibilityEvidenceLevel | null;
  @ApiProperty() occurredAt!: Date;

  static fromEntity(event: ResponsibilityEvent): ResponsibilityEventResponseDto {
    return {
      id: event.id,
      type: event.type,
      actorClass: event.actorClass,
      actorUserId: event.actorUserId,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      sourceSystem: event.sourceSystem,
      sourceRecordType: event.sourceRecordType,
      sourceRecordId: event.sourceRecordId,
      sourceState: event.sourceState,
      evidenceLevel: event.evidenceLevel,
      occurredAt: event.occurredAt,
    };
  }
}

export class ResponsibilityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ResponsibilityKind }) kind!: ResponsibilityKind;
  @ApiProperty() objective!: string;
  @ApiProperty({ enum: ResponsibilityStatus }) status!: ResponsibilityStatus;
  @ApiProperty({ enum: ResponsibilityContextType }) contextType!: ResponsibilityContextType;
  @ApiProperty({ enum: ResponsibilityAuthorityClass }) authorityClass!: ResponsibilityAuthorityClass;
  @ApiProperty() authorityPolicyVersion!: string;
  @ApiProperty({ enum: ResponsibilityPrivacyScope }) privacyScope!: ResponsibilityPrivacyScope;
  @ApiProperty() privacyPolicyVersion!: string;
  @ApiPropertyOptional({ nullable: true }) originConversationId!: string | null;
  @ApiPropertyOptional({ nullable: true }) originOpportunityId!: string | null;
  @ApiProperty({ type: Object }) successCriteria!: unknown;
  @ApiPropertyOptional({ nullable: true }) dueAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) retentionExpiresAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [ResponsibilityEventResponseDto] })
  events!: ResponsibilityEventResponseDto[];

  static fromEntity(entity: ResponsibilityWithEvents): ResponsibilityResponseDto {
    return {
      id: entity.id,
      kind: entity.kind,
      objective: entity.objective,
      status: entity.status,
      contextType: entity.contextType,
      authorityClass: entity.authorityClass,
      authorityPolicyVersion: entity.authorityPolicyVersion,
      privacyScope: entity.privacyScope,
      privacyPolicyVersion: entity.privacyPolicyVersion,
      originConversationId: entity.originConversationId,
      originOpportunityId: entity.originOpportunityId,
      successCriteria: entity.successCriteria,
      dueAt: entity.dueAt,
      retentionExpiresAt: entity.retentionExpiresAt,
      completedAt: entity.completedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      events: entity.events.map(ResponsibilityEventResponseDto.fromEntity),
    };
  }
}
