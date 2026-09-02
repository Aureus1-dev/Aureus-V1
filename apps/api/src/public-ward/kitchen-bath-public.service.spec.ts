import { ConflictException, NotFoundException } from '@nestjs/common';
import { KitchenBathPublicService } from './kitchen-bath-public.service';

describe('KitchenBathPublicService', () => {
  const baseDto = {
    displayName: 'Visitor',
    contactMethod: 'EMAIL',
    contactValue: 'visitor@example.com',
    projectSummary: 'Replace cabinets and improve the kitchen layout',
    consentVersion: 'lead-handoff-v1',
    consentTextSha256: 'a'.repeat(64),
    consentGranted: true,
    kitchenBath: {
      projectType: 'KITCHEN',
      rooms: ['kitchen'],
      scope: 'Replace cabinets and improve the kitchen layout',
      budgetRange: 'UNSURE',
      priorities: ['FUNCTION_AND_LAYOUT', 'DURABILITY'],
      mustHaves: 'Keep pantry storage.',
      concerns: 'Avoid blocking the back door.',
    },
  } as any;

  function fixture(active = true) {
    const leadRecord: any = {
      id: 'lead',
      projectLocation: 'Philadelphia',
      desiredTiming: 'ONE_TO_THREE_MONTHS',
      consentVersion: 'lead-handoff-v1',
      submittedAt: new Date('2026-09-02T00:00:00.000Z'),
      retentionExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      qualificationSignals: [],
    };
    const prisma = {
      db: {
        organization: {
          findFirst: jest.fn().mockResolvedValue({ id: 'tenant' }),
        },
        wardLead: {
          findFirst: jest.fn().mockImplementation(async () => leadRecord),
        },
      },
    } as any;
    const vertical = {
      hasCurrentApprovedPack: jest.fn().mockResolvedValue(active),
    } as any;
    const leads = {
      submitPublicHandoff: jest.fn().mockImplementation(
        async (
          _slug: string,
          _conversationId: string,
          _token: string,
          _dto: unknown,
          serverContext?: { qualificationSignals?: unknown[] },
        ) => {
          leadRecord.qualificationSignals = [
            { key: 'conversation_turns', value: '2', basis: 'System count' },
            ...(serverContext?.qualificationSignals ?? []),
          ];
          return {
            handoffId: 'lead',
            status: 'SUBMITTED',
            preferredContactMethod: 'EMAIL',
            submittedAt: leadRecord.submittedAt,
            retentionExpiresAt: leadRecord.retentionExpiresAt,
          };
        },
      ),
    } as any;

    return {
      prisma,
      vertical,
      leads,
      leadRecord,
      service: new KitchenBathPublicService(prisma, vertical, leads),
    };
  }

  it('hides specialized intake unless the complete current pack is approved', async () => {
    const { service, leads } = fixture(false);

    await expect(
      service.submit('shop', 'conversation', 'x'.repeat(48), baseDto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(leads.submitPublicHandoff).not.toHaveBeenCalled();
  });

  it('rejects sanitized-empty required Kitchen & Bath source before creating a handoff', async () => {
    const { service, leads } = fixture(true);

    await expect(
      service.submit(
        'shop',
        'conversation',
        'x'.repeat(48),
        {
          ...baseDto,
          kitchenBath: {
            ...baseDto.kitchenBath,
            rooms: ['<b></b>'],
            scope: '<script></script>',
          },
        },
      ),
    ).rejects.toThrow('must contain meaningful text');

    expect(leads.submitPublicHandoff).not.toHaveBeenCalled();
  });

  it('passes the complete Ready Project source into the atomic handoff transaction', async () => {
    const { service, leads } = fixture(true);

    const result = await service.submit(
      'shop',
      'conversation',
      'x'.repeat(48),
      baseDto,
    );

    expect(leads.submitPublicHandoff).toHaveBeenCalledWith(
      'shop',
      'conversation',
      'x'.repeat(48),
      baseDto,
      expect.objectContaining({
        fingerprintContext: expect.stringMatching(/^KITCHEN_BATH:[a-f0-9]{64}$/),
        qualificationSignals: expect.arrayContaining([
          expect.objectContaining({ key: 'vertical', value: 'KITCHEN_BATH' }),
          expect.objectContaining({
            key: 'project_type',
            value: 'KITCHEN',
            basis: 'Visitor supplied',
          }),
          expect.objectContaining({
            key: 'priorities',
            value: ['FUNCTION_AND_LAYOUT', 'DURABILITY'],
            basis: 'Visitor supplied; optional; no scoring',
          }),
          expect.objectContaining({
            key: 'must_haves',
            value: 'Keep pantry storage.',
          }),
          expect.objectContaining({
            key: 'concerns',
            value: 'Avoid blocking the back door.',
          }),
          expect.objectContaining({
            key: 'kitchen_bath_intake_hash',
            basis: 'System SHA-256',
            value: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        ]),
      }),
    );

    expect(result.readyProject).toMatchObject({
      readinessStatus: 'READY_FOR_EXPERT_REVIEW',
      customerIntent: {
        projectType: 'KITCHEN',
        priorities: ['FUNCTION_AND_LAYOUT', 'DURABILITY'],
      },
      source: {
        basis: 'CONSENTED_WARD_HANDOFF',
        modelInferencesIncluded: false,
      },
    });
    expect(result.readyProject).not.toHaveProperty('leadId');
    expect(result.readyProject).not.toHaveProperty('transactionBarriers');
    expect(result.readyProject).not.toHaveProperty('source.intakeIntegrity');
    expect(result.readyProject).not.toHaveProperty('source.conversationTurns');
    expect(result.readyProject).not.toHaveProperty('source.consentVersion');
  });

  it('sanitizes new customer value fields before putting them in the transactional source envelope', async () => {
    const { service, leads } = fixture(true);

    const result = await service.submit(
      'shop',
      'conversation',
      'x'.repeat(48),
      {
        ...baseDto,
        kitchenBath: {
          ...baseDto.kitchenBath,
          mustHaves: '<script>alert(1)</script>Keep the pantry',
          concerns: '<b>Do not</b> block the back door',
        },
      },
    );

    const serverContext = leads.submitPublicHandoff.mock.calls[0][4];
    expect(serverContext.qualificationSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'must_haves',
          value: 'Keep the pantry',
        }),
        expect.objectContaining({
          key: 'concerns',
          value: 'Do not block the back door',
        }),
      ]),
    );
    expect(JSON.stringify(result.readyProject)).not.toMatch(/<script>|<b>/i);
  });

  it('keeps optional attachment storage pointers in the retained source while the Ready Project redacts them', async () => {
    const { service, leads } = fixture(true);
    const result = await service.submit(
      'shop',
      'conversation',
      'x'.repeat(48),
      {
        ...baseDto,
        kitchenBath: {
          ...baseDto.kitchenBath,
          attachments: [
            {
              fileName: 'kitchen.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 12345,
              storageRef: 'opaque/internal/object/ref',
            },
          ],
        },
      },
    );

    const serverContext = leads.submitPublicHandoff.mock.calls[0][4];
    expect(JSON.stringify(serverContext)).toContain('opaque/internal/object/ref');
    expect(result.readyProject.constraints.attachments).toEqual([
      {
        fileName: 'kitchen.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12345,
      },
    ]);
    expect(JSON.stringify(result.readyProject)).not.toContain(
      'opaque/internal/object/ref',
    );
  });

  it('propagates a conflicting second structured intake instead of overwriting the retained project', async () => {
    const { service, leads } = fixture(true);
    leads.submitPublicHandoff.mockRejectedValueOnce(
      new ConflictException(
        'This conversation already has a different handoff request',
      ),
    );

    await expect(
      service.submit('shop', 'conversation', 'x'.repeat(48), baseDto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails if the atomically created handoff cannot be read back for projection', async () => {
    const { service, prisma } = fixture(true);
    prisma.db.wardLead.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.submit('shop', 'conversation', 'x'.repeat(48), baseDto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
