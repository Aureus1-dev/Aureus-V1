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
    },
  } as any;

  function fixture(active = true) {
    const prisma = {
      db: {
        organization: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant' }) },
        wardLead: {
          findFirst: jest.fn().mockResolvedValue({ id: 'lead', qualificationSignals: [] }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      },
    } as any;
    const vertical = {
      hasCurrentApprovedPack: jest.fn().mockResolvedValue(active),
    } as any;
    const leads = {
      submitPublicHandoff: jest.fn().mockResolvedValue({ handoffId: 'lead' }),
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
    await service.submit('shop', 'conversation', 'x'.repeat(48), baseDto);
    expect(leads.submitPublicHandoff).toHaveBeenCalled();
    const data = prisma.db.wardLead.updateMany.mock.calls[0][0].data.qualificationSignals;
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'vertical', value: 'KITCHEN_BATH' }),
        expect.objectContaining({ key: 'budget_range', basis: 'Visitor supplied; optional' }),
        expect.objectContaining({ key: 'kitchen_bath_intake_hash' }),
      ]),
    );
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
