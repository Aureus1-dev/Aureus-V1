import { BusinessKnowledgeStatus } from '@prisma/client';
import { KitchenBathVerticalService } from './kitchen-bath-vertical.service';

describe('KitchenBathVerticalService', () => {
  const caller = { id: '11111111-1111-4111-8111-111111111111', roles: [] } as any;

  it('installs governed templates as DRAFT only and never auto-approves them', async () => {
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.title, ...data }));
    const prisma = {
      db: {
        organization: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant' }) },
        businessKnowledgeRecord: {
          findMany: jest.fn().mockResolvedValue([]),
          create,
        },
      },
    } as any;
    const service = new KitchenBathVerticalService(prisma);

    const result = await service.installDraftPack('tenant', caller);

    expect(result.createdCount).toBe(5);
    expect(create).toHaveBeenCalledTimes(5);
    for (const call of create.mock.calls) {
      expect(call[0].data.status).toBe(BusinessKnowledgeStatus.DRAFT);
      expect(call[0].data.sourceReference).toMatch(/^PF009_KITCHEN_BATH:/);
      expect(call[0].data.reviewedAt).toBeUndefined();
    }
  });

  it('is idempotent for already-installed template keys', async () => {
    const create = jest.fn();
    const prisma = {
      db: {
        organization: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant' }) },
        businessKnowledgeRecord: {
          findMany: jest.fn().mockResolvedValue([
            { sourceReference: 'PF009_KITCHEN_BATH:services|TEMPLATE:kitchen-bath-v1' },
            { sourceReference: 'PF009_KITCHEN_BATH:exclusions|TEMPLATE:kitchen-bath-v1' },
            { sourceReference: 'PF009_KITCHEN_BATH:pricing|TEMPLATE:kitchen-bath-v1' },
            { sourceReference: 'PF009_KITCHEN_BATH:qualification|TEMPLATE:kitchen-bath-v1' },
            { sourceReference: 'PF009_KITCHEN_BATH:handoff|TEMPLATE:kitchen-bath-v1' },
          ]),
          create,
        },
      },
    } as any;
    const service = new KitchenBathVerticalService(prisma);

    const result = await service.installDraftPack('tenant', caller);
    expect(result.createdCount).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps qualification transparent and labels optional budget as visitor-supplied', () => {
    const signals = KitchenBathVerticalService.intakeSignals({
      projectType: 'KITCHEN',
      rooms: ['kitchen'],
      scope: 'Replace cabinets and improve layout',
      budgetRange: 'FROM_50000_TO_100000',
    });
    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'project_type', basis: 'Visitor supplied' }),
        expect.objectContaining({ key: 'budget_range', basis: 'Visitor supplied; optional' }),
      ]),
    );
  });
});
