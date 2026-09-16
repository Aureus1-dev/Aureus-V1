import { ConflictException } from '@nestjs/common';
import { ResponsibilityContextType, ResponsibilityKind, WardLeadStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BusinessLeadTransitionService } from './business-lead-transition.service';

const caller = { id: '11111111-1111-4111-8111-111111111111', roles: [] } as unknown as AuthenticatedUser;

function harness(revenueResponsibility: { id: string } | null = null) {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    responsibility: {
      findFirst: jest.fn().mockResolvedValue(revenueResponsibility),
    },
  };
  const prisma = {
    db: {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    },
  };
  const leads = {
    transitionBusinessLead: jest.fn().mockResolvedValue({ id: 'lead-1' }),
  };
  const service = new BusinessLeadTransitionService(prisma as never, leads as never);
  return { service, prisma, leads, tx };
}

describe('BusinessLeadTransitionService OR-004 guard', () => {
  it('leaves non-terminal legacy transitions on the existing governed service', async () => {
    const { service, prisma, leads } = harness();

    await service.transition(
      'org-1',
      'lead-1',
      { status: WardLeadStatus.CONTACTED },
      caller,
    );

    expect(prisma.db.$transaction).not.toHaveBeenCalled();
    expect(leads.transitionBusinessLead).toHaveBeenCalledWith(
      'org-1',
      'lead-1',
      { status: WardLeadStatus.CONTACTED },
      caller,
    );
  });

  it('serializes an early terminal transition with the OR-004 lead lock before allowing it', async () => {
    const { service, leads, tx } = harness(null);

    await service.transition(
      'org-1',
      'lead-1',
      { status: WardLeadStatus.LOST, reason: 'Customer chose another provider.' },
      caller,
    );

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.responsibility.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: 'org-1',
          kind: ResponsibilityKind.BUSINESS_PROMISE,
        }),
      }),
    );
    expect(leads.transitionBusinessLead).toHaveBeenCalledTimes(1);
  });

  it('rejects direct CLOSED/LOST writes after Revenue Completion has started', async () => {
    const { service, leads } = harness({ id: 'revenue-responsibility' });

    await expect(
      service.transition(
        'org-1',
        'lead-1',
        { status: WardLeadStatus.CLOSED, reason: 'Done.' },
        caller,
      ),
    ).rejects.toThrow(ConflictException);

    expect(leads.transitionBusinessLead).not.toHaveBeenCalled();
  });
});
