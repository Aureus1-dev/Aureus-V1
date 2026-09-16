import type { ResponsibilityWithEvents } from '../repositories/responsibility.repository.interface';

interface BusinessPromiseCriteria {
  promise?: unknown;
  criterion?: unknown;
}

export class BusinessResponsibilityEvidenceDto {
  static fromEntity(entity: ResponsibilityWithEvents) {
    const criteria = (entity.successCriteria ?? {}) as BusinessPromiseCriteria;
    return {
      responsibilityId: entity.id,
      organizationId: entity.principalOrganizationId,
      objective: entity.objective,
      promise: typeof criteria.promise === 'string' ? criteria.promise : null,
      criterion: typeof criteria.criterion === 'string' ? criteria.criterion : null,
      status: entity.status,
      dueAt: entity.dueAt,
      completedAt: entity.completedAt,
      evidenceSummary: BusinessResponsibilityEvidenceDto.summary(entity),
      lifecycle: entity.events.map((event) => ({
        eventId: event.id,
        type: event.type,
        actorClass: event.actorClass,
        actorUserId: event.actorUserId,
        occurredAt: event.occurredAt,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        sourceSystem: event.sourceSystem,
        sourceRecordType: event.sourceRecordType,
        sourceRecordId: event.sourceRecordId,
        sourceState: event.sourceState,
        evidenceLevel: event.evidenceLevel,
      })),
    };
  }

  private static summary(entity: ResponsibilityWithEvents): string {
    const strongest = entity.events
      .map((event) => event.evidenceLevel)
      .filter((level): level is NonNullable<typeof level> => Boolean(level));

    if (strongest.includes('VERIFIED')) {
      return 'This responsibility contains verified evidence from a recorded source.';
    }
    if (strongest.includes('REPORTED')) {
      return 'Completion or progress has been reported, but this receipt does not claim independent verification.';
    }
    return 'No completion evidence has been recorded yet.';
  }
}
