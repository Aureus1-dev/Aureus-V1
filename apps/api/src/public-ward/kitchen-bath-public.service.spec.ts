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
    const prisma = {
      db: {
        organization: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant' }) },
        wardLead: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'lead',
            projectLocation: 'Philadelphia',
            desiredTiming: 'ONE_TO_THREE_MONTHS',
            consentVersion: 'lead-handoff-v1',
            submittedAt: new Date('2026-09-02T00:00:00.000Z'),
            retentionExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
            qualificationSignals: [],
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      },
    } as any;
    const vertical = {
      hasCurrentApprovedPack: jest.fn().mockResolvedValue(active),
    } as any;
    const leads = {
      submitPublicHandoff: jest.fn().mockResolvedValue({
        handoffId: 'lead',
        status: 'SUBMITTED',
        preferredContactMethod: 'EMAIL',
        submittedAt: new Date('2026-09-02T00:00:00.000Z'),
        retentionExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      }),
    } as any;
    return { prisma, vertical, leads, service: new KitchenBathPublicService(prisma, vertical, leads) };
  }

  it('hides specialized intake unless the complete current pack is approved', async () => {
    const { service } = fixture(false);
    await expect(service.submit('shop', 'conversation', 'x'.repeat(48), baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('records transparent intake in the retained lead envelope after consented handoff', async () => {
    const { service, prisma, leads } = fixture(true);
    const result = await service.submit(
      'shop',
      'conversation',
      'x'.repeat(48),
      baseDto,
    );
    expect(leads.submitPublicHandoff).toHaveBeenCalled();
    const data = prisma.db.wardLead.updateMany.mock.calls[0][0].data.qualificationSignals;
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'vertical', value: 'KITCHEN_BATH' }),
        expect.objectContaining({ key: 'budget_range', basis: 'Visitor supplied; optional' }),
        expect.objectContaining({ key: 'kitchen_bath_intake_hash' }),
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
      ]),
    );
    expect(result.readyProject).toMatchObject({
      readinessStatus: 'READY_FOR_EXPERT_REVIEW',
      customerIntent: {
        projectType: 'KITCHEN',
        priorities: ['FUNCTION_AND_LAYOUT', 'DURABILITY'],
      },
      source: { modelInferencesIncluded: false },
    });
    expect(
      result.readyProject.transactionBarriers.find(
        (barrier: { key: string }) => barrier.key === 'PRICE',
      ),
    ).toMatchObject({ status: 'BUSINESS_REQUIRED' });
  });

  it('sanitizes new customer value fields before retaining or projecting them', async () => {
    const { service, prisma } = fixture(true);
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

    const data =
      prisma.db.wardLead.updateMany.mock.calls[0][0].data
        .qualificationSignals;
    expect(data).toEqual(
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

  it('does not return a Ready Project when the retained handoff disappears before enrichment is confirmed', async () => {
    const { service, prisma } = fixture(true);
    prisma.db.wardLead.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.submit('shop', 'conversation', 'x'.repeat(48), baseDto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a second, different structured intake on the same retained handoff', async () => {
    const { service, prisma } = fixture(true);
    prisma.db.wardLead.findFirst.mockResolvedValue({
      id: 'lead',
      qualificationSignals: [
        { key: 'kitchen_bath_intake_hash', value: 'different' },
      ],
    });
    await expect(service.submit('shop', 'conversation', 'x'.repeat(48), baseDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
