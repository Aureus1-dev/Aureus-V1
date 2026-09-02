import type { Prisma } from '@prisma/client';
import {
  buildKitchenBathReadyProject,
  toPublicKitchenBathReadyProject,
} from './kitchen-bath-ready-project';

const BASE = {
  id: '11111111-1111-4111-8111-111111111111',
  projectLocation: 'Philadelphia',
  desiredTiming: 'ONE_TO_THREE_MONTHS',
  consentVersion: 'lead-handoff-v1',
  submittedAt: new Date('2026-09-02T00:00:00.000Z'),
  retentionExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
};

function signals(overrides: Record<string, unknown> = {}): Prisma.JsonArray {
  const values: Record<string, unknown> = {
    vertical: 'KITCHEN_BATH',
    project_type: 'KITCHEN',
    rooms: ['kitchen'],
    scope: 'Open the kitchen layout and replace the worn cabinetry.',
    kitchen_bath_intake_hash: 'a'.repeat(64),
    priorities: ['FUNCTION_AND_LAYOUT', 'DURABILITY'],
    must_haves: 'Keep a full pantry.',
    concerns: 'Avoid a layout that blocks the back door.',
    budget_range: 'FROM_50000_TO_100000',
    decision_status: 'OWNER_DECISION_MAKER',
    conversation_turns: '4',
    project_attachments: [
      {
        fileName: 'existing-kitchen.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12345,
        storageRef: 'opaque://internal/storage/reference',
      },
    ],
    ...overrides,
  };
  return Object.entries(values).flatMap(([key, value]) =>
    value === undefined ? [] : [{ key, value, basis: 'test' }],
  ) as Prisma.JsonArray;
}

describe('buildKitchenBathReadyProject', () => {
  it('distills retained customer facts into Ready Project without model inference', () => {
    const project = buildKitchenBathReadyProject({
      ...BASE,
      qualificationSignals: signals(),
    });

    expect(project).toMatchObject({
      contractVersion: 'or003-ready-project-v1',
      vertical: 'KITCHEN_BATH',
      readinessStatus: 'READY_FOR_EXPERT_REVIEW',
      customerIntent: {
        projectType: 'KITCHEN',
        rooms: ['kitchen'],
        priorities: ['FUNCTION_AND_LAYOUT', 'DURABILITY'],
        mustHaves: 'Keep a full pantry.',
        concerns: 'Avoid a layout that blocks the back door.',
      },
      source: {
        basis: 'CONSENTED_WARD_HANDOFF',
        modelInferencesIncluded: false,
      },
    });

    expect(project?.source.intakeIntegrity).toBe('SYSTEM_HASH_PRESENT');
    expect(project?.source.conversationTurns).toBe(4);
    expect(project?.constraints.attachments).toEqual([
      {
        fileName: 'existing-kitchen.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12345,
      },
    ]);
    expect(JSON.stringify(project)).not.toContain('storageRef');
    expect(JSON.stringify(project)).not.toContain('opaque://internal/storage/reference');
  });

  it('keeps price, fit, and trust honest instead of inventing certainty', () => {
    const project = buildKitchenBathReadyProject({
      ...BASE,
      qualificationSignals: signals(),
    })!;

    const byKey = Object.fromEntries(
      project.transactionBarriers.map((barrier) => [barrier.key, barrier]),
    );

    expect(byKey.PRICE.status).toBe('BUSINESS_REQUIRED');
    expect(byKey.PRICE.basis).not.toMatch(/\$\d|quote is|estimated price/i);
    expect(byKey.FIT.status).toBe('EXPERT_REQUIRED');
    expect(byKey.TRUST.status).toBe('NOT_ASSESSED');
  });

  it('leaves timing and decision authority open when the visitor did not supply them', () => {
    const project = buildKitchenBathReadyProject({
      ...BASE,
      desiredTiming: null,
      qualificationSignals: signals({
        decision_status: undefined,
      }),
    })!;

    const byKey = Object.fromEntries(
      project.transactionBarriers.map((barrier) => [barrier.key, barrier]),
    );

    expect(byKey.TIMING.status).toBe('OPEN');
    expect(byKey.DECISION_AUTHORITY.status).toBe('OPEN');
  });

  it('fails closed to INCOMPLETE_SOURCE for malformed retained K&B state', () => {
    const project = buildKitchenBathReadyProject({
      ...BASE,
      qualificationSignals: signals({
        rooms: [],
        scope: undefined,
        kitchen_bath_intake_hash: undefined,
      }),
    });

    expect(project?.readinessStatus).toBe('INCOMPLETE_SOURCE');
    expect(project?.missingRequiredSource).toEqual(
      expect.arrayContaining(['rooms', 'scope', 'intakeHash']),
    );
    expect(project?.transactionBarriers.find((item) => item.key === 'DESIRE')?.status).toBe(
      'OPEN',
    );
  });

  it('rejects malformed required enums and integrity values while ignoring corrupt optional enums', () => {
    const project = buildKitchenBathReadyProject({
      ...BASE,
      qualificationSignals: signals({
        project_type: 'NOT_A_PROJECT_TYPE',
        kitchen_bath_intake_hash: 'not-a-sha',
        priorities: ['FUNCTION_AND_LAYOUT', 'SECRET_SCORE_BUCKET'],
        budget_range: 'MADE_UP_BUDGET',
        decision_status: 'INFERRED_DECIDER',
        conversation_turns: '4turns',
      }),
    })!;

    expect(project.readinessStatus).toBe('INCOMPLETE_SOURCE');
    expect(project.missingRequiredSource).toEqual(
      expect.arrayContaining(['projectType', 'intakeHash']),
    );
    expect(project.customerIntent.projectType).toBeNull();
    expect(project.customerIntent.priorities).toEqual(['FUNCTION_AND_LAYOUT']);
    expect(project.constraints.budgetRange).toBeNull();
    expect(project.constraints.decisionStatus).toBeNull();
    expect(project.source.intakeIntegrity).toBe('MISSING');
    expect(project.source.conversationTurns).toBeNull();
    expect(
      project.transactionBarriers.find(
        (item) => item.key === 'DECISION_AUTHORITY',
      )?.status,
    ).toBe('OPEN');
  });

  it('drops malformed attachment metadata rather than exposing it', () => {
    const project = buildKitchenBathReadyProject({
      ...BASE,
      qualificationSignals: signals({
        project_attachments: [
          {
            fileName: 'bad.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: -1,
            storageRef: 'opaque://secret',
          },
          {
            fileName: 'good.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 100,
            storageRef: 'opaque://also-secret',
          },
        ],
      }),
    })!;

    expect(project.constraints.attachments).toEqual([
      {
        fileName: 'good.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
      },
    ]);
    expect(JSON.stringify(project)).not.toContain('opaque://');
  });

  it('returns no Ready Project for a non-Kitchen-and-Bath handoff', () => {
    expect(
      buildKitchenBathReadyProject({
        ...BASE,
        qualificationSignals: [
          { key: 'contact_method', value: 'EMAIL' },
        ] as Prisma.JsonArray,
      }),
    ).toBeNull();
  });

  it('removes back-office barrier and provenance machinery from the public projection', () => {
    const full = buildKitchenBathReadyProject({
      ...BASE,
      qualificationSignals: signals(),
    })!;
    const publicProject = toPublicKitchenBathReadyProject(full)!;

    expect(publicProject).not.toHaveProperty('leadId');
    expect(publicProject).not.toHaveProperty('transactionBarriers');
    expect(publicProject.source).toEqual({
      basis: 'CONSENTED_WARD_HANDOFF',
      modelInferencesIncluded: false,
    });
    expect(publicProject).not.toHaveProperty('source.consentVersion');
    expect(publicProject).not.toHaveProperty('source.intakeIntegrity');
    expect(publicProject).not.toHaveProperty('source.conversationTurns');
    expect(JSON.stringify(publicProject)).not.toContain('storageRef');
  });

  it('does not emit a hidden score, ranking, propensity, or fit judgment', () => {
    const project = buildKitchenBathReadyProject({
      ...BASE,
      qualificationSignals: signals(),
    });

    const serialized = JSON.stringify(project);
    expect(serialized).not.toMatch(/leadScore|propensity|ranking|qualifiedLead|fitScore/i);
  });
});
