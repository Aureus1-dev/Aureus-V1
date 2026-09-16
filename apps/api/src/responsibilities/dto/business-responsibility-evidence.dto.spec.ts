import {
  ResponsibilityActorClass,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityStatus,
} from '@prisma/client';
import type { ResponsibilityWithEvents } from '../repositories/responsibility.repository.interface';
import { BusinessResponsibilityEvidenceDto } from './business-responsibility-evidence.dto';

function entity(evidenceLevel: ResponsibilityEvidenceLevel | null) {
  return {
    id: 'responsibility-id',
    principalOrganizationId: 'organization-id',
    objective: 'Prepare the approved scope',
    successCriteria: { promise: 'We will prepare it', criterion: 'Scope is ready' },
    status: ResponsibilityStatus.COMPLETED,
    dueAt: null,
    completedAt: new Date('2026-09-13T00:00:01.000Z'),
    events: [
      {
        id: 'event-id',
        responsibilityId: 'responsibility-id',
        type: ResponsibilityEventType.COMPLETED,
        actorClass: ResponsibilityActorClass.SYSTEM,
        actorUserId: null,
        fromStatus: ResponsibilityStatus.ACTIVE,
        toStatus: ResponsibilityStatus.COMPLETED,
        sourceSystem: 'AUREUS_BUSINESS',
        sourceRecordType: 'OrganizationMemberAttestation',
        sourceRecordId: 'manager-id',
        sourceState: 'MANAGER_CONFIRMED',
        evidenceLevel,
        occurredAt: new Date('2026-09-13T00:00:01.000Z'),
      },
    ],
  } as ResponsibilityWithEvents;
}

describe('BusinessResponsibilityEvidenceDto', () => {
  it('projects the canonical event without upgrading REPORTED evidence', () => {
    const receipt = BusinessResponsibilityEvidenceDto.fromEntity(
      entity(ResponsibilityEvidenceLevel.REPORTED),
    );

    expect(receipt.lifecycle[0].evidenceLevel).toBe(ResponsibilityEvidenceLevel.REPORTED);
    expect(receipt.evidenceSummary).toContain('reported');
    expect(receipt.evidenceSummary).toContain('does not claim independent verification');
  });

  it('uses verified language only for a canonically VERIFIED event', () => {
    const receipt = BusinessResponsibilityEvidenceDto.fromEntity(
      entity(ResponsibilityEvidenceLevel.VERIFIED),
    );

    expect(receipt.lifecycle[0].evidenceLevel).toBe(ResponsibilityEvidenceLevel.VERIFIED);
    expect(receipt.evidenceSummary).toContain('verified evidence');
  });

  it('does not invent evidence when the ledger has none', () => {
    const receipt = BusinessResponsibilityEvidenceDto.fromEntity(entity(null));

    expect(receipt.evidenceSummary).toBe('No completion evidence has been recorded yet.');
  });
});
