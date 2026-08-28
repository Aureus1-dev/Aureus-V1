import { OpportunityStatus, VerificationStatus } from '@prisma/client';
import { PILOT_CITY_SHEET_SEEDS, PILOT_OPPORTUNITY_SEEDS } from './pilot-seed.data';
import { seedPilotData, type SeedPilotClient } from './seed-pilot-data';

describe('seedPilotData launch-opportunity synchronization', () => {
  it('refreshes seed-managed records with the researched timestamp and retires the closed LIHEAP seed', async () => {
    let sequence = 100;
    const first = PILOT_OPPORTUNITY_SEEDS[0];

    const opportunityFindFirst = jest.fn(async (args: { where: Record<string, unknown> }) => {
      const title = (args.where.title as { equals?: string } | undefined)?.equals;
      if (title === first.title) return { id: 'existing-first' };
      if (title === 'LIHEAP — Help With Heating and Utility Bills') return { id: 'old-liheap' };
      return null;
    });
    const opportunityCreate = jest.fn(async () => ({
      id: `created-${sequence}`,
      sequenceNumber: sequence++,
    }));
    const opportunityUpdate = jest.fn(async () => ({}));

    const prisma: SeedPilotClient = {
      user: {
        findFirst: jest.fn(async () => ({ id: 'seed-actor' })),
        create: jest.fn(),
      },
      citySheetEntry: {
        findFirst: jest.fn(async () => ({ id: 'existing-city-sheet' })),
        create: jest.fn(),
        update: jest.fn(),
      },
      opportunity: {
        findFirst: opportunityFindFirst,
        create: opportunityCreate,
        update: opportunityUpdate,
      },
    };

    const result = await seedPilotData(prisma);

    expect(result.citySheetSkipped).toHaveLength(PILOT_CITY_SHEET_SEEDS.length);
    expect(result.opportunitiesUpdated).toContain(first.title);
    expect(result.opportunitiesRetired).toEqual(['LIHEAP — Help With Heating and Utility Bills']);
    expect(result.opportunitiesCreated).toHaveLength(PILOT_OPPORTUNITY_SEEDS.length - 1);

    expect(opportunityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing-first' },
        data: expect.objectContaining({
          dateLastVerified: new Date(first.verifiedAt),
          confidenceScore: expect.any(Number),
          freshnessScore: expect.any(Number),
        }),
      }),
    );

    const refreshedExistingCall = opportunityUpdate.mock.calls.find(
      ([args]) => (args as { where?: { id?: string } }).where?.id === 'existing-first',
    )?.[0] as { data: Record<string, unknown> } | undefined;
    expect(refreshedExistingCall?.data).not.toHaveProperty('status');
    expect(refreshedExistingCall?.data).not.toHaveProperty('verificationStatus');
    expect(refreshedExistingCall?.data).not.toHaveProperty('createdById');
    expect(refreshedExistingCall?.data).not.toHaveProperty('submittedById');

    expect(opportunityUpdate).toHaveBeenCalledWith({
      where: { id: 'old-liheap' },
      data: {
        status: OpportunityStatus.EXPIRED,
        verificationStatus: VerificationStatus.ARCHIVED,
        lastUpdatedById: 'seed-actor',
      },
    });
  });
});
