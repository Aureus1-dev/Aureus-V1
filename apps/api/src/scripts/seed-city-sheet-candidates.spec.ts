import { CitySheetVerificationStatus, LaunchAreaScope, UserRole } from '@prisma/client';
import { seedCitySheetCandidates, SeedCitySheetClient } from './seed-city-sheet-candidates';
import { CITY_SHEET_CANDIDATE_SEEDS } from './city-sheet-candidates.data';

function makeClient(overrides: Partial<{
  userFindFirst: jest.Mock;
  userCreate: jest.Mock;
  entryFindFirst: jest.Mock;
  entryCreate: jest.Mock;
  entryUpdate: jest.Mock;
}> = {}): SeedCitySheetClient {
  return {
    user: {
      findFirst: overrides.userFindFirst ?? jest.fn().mockResolvedValue(null),
      create: overrides.userCreate ?? jest.fn().mockResolvedValue({ id: 'seed-actor-001' }),
    },
    citySheetEntry: {
      findFirst: overrides.entryFindFirst ?? jest.fn().mockResolvedValue(null),
      create:
        overrides.entryCreate ??
        jest.fn().mockImplementation(async () => ({ id: `entry-${Math.random()}`, sequenceNumber: 1 })),
      update: overrides.entryUpdate ?? jest.fn(),
    },
  };
}

describe('seedCitySheetCandidates', () => {
  it('creates a dedicated AI_SERVICE_ACCOUNT actor with no password when none exists', async () => {
    const userCreate = jest.fn().mockResolvedValue({ id: 'seed-actor-001' });
    const client = makeClient({ userCreate });

    await seedCitySheetCandidates(client);

    expect(userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'city-sheet-research@ai.aureus.internal',
        passwordHash: null,
        roles: [UserRole.AI_SERVICE_ACCOUNT],
        emailVerified: true,
      }),
    });
  });

  it('reuses an existing seed actor instead of creating a duplicate', async () => {
    const userFindFirst = jest.fn().mockResolvedValue({ id: 'existing-actor' });
    const userCreate = jest.fn();
    const client = makeClient({ userFindFirst, userCreate });

    const result = await seedCitySheetCandidates(client);

    expect(userCreate).not.toHaveBeenCalled();
    expect(result.actorId).toBe('existing-actor');
  });

  it('creates every candidate exactly once and assigns a stable ref', async () => {
    const entryCreate = jest.fn().mockImplementation(async () => ({ id: 'entry-x', sequenceNumber: 7 }));
    const entryUpdate = jest.fn();
    const client = makeClient({ entryCreate, entryUpdate });

    const result = await seedCitySheetCandidates(client);

    expect(entryCreate).toHaveBeenCalledTimes(CITY_SHEET_CANDIDATE_SEEDS.length);
    expect(result.created).toHaveLength(CITY_SHEET_CANDIDATE_SEEDS.length);
    expect(result.skippedExisting).toHaveLength(0);
    expect(entryUpdate).toHaveBeenCalledWith({ where: { id: 'entry-x' }, data: { citySheetRef: 'AUR-CS-000007' } });
  });

  it('every created candidate is inserted with verificationStatus UNVERIFIED', async () => {
    const entryCreate = jest.fn().mockImplementation(async () => ({ id: 'entry-x', sequenceNumber: 1 }));
    const client = makeClient({ entryCreate });

    await seedCitySheetCandidates(client);

    for (const call of entryCreate.mock.calls) {
      expect(call[0].data.verificationStatus).toBe(CitySheetVerificationStatus.UNVERIFIED);
    }
  });

  it('is idempotent: skips a candidate whose organizationName already exists (no duplicates)', async () => {
    const entryFindFirst = jest.fn().mockImplementation(async ({ where }) => {
      if (where.organizationName.equals === CITY_SHEET_CANDIDATE_SEEDS[0].organizationName) {
        return { id: 'already-there' };
      }
      return null;
    });
    const entryCreate = jest.fn().mockImplementation(async () => ({ id: 'entry-x', sequenceNumber: 2 }));
    const client = makeClient({ entryFindFirst, entryCreate });

    const result = await seedCitySheetCandidates(client);

    expect(result.skippedExisting).toEqual([CITY_SHEET_CANDIDATE_SEEDS[0].organizationName]);
    expect(entryCreate).toHaveBeenCalledTimes(CITY_SHEET_CANDIDATE_SEEDS.length - 1);
  });

  it('running the seed twice against a client that reports existing entries creates nothing the second time', async () => {
    const alreadySeededNames = new Set(CITY_SHEET_CANDIDATE_SEEDS.map((c) => c.organizationName));
    const entryFindFirst = jest.fn().mockImplementation(async ({ where }) => {
      return alreadySeededNames.has(where.organizationName.equals) ? { id: 'existing' } : null;
    });
    const entryCreate = jest.fn();
    const client = makeClient({ entryFindFirst, entryCreate });

    const result = await seedCitySheetCandidates(client);

    expect(entryCreate).not.toHaveBeenCalled();
    expect(result.created).toHaveLength(0);
    expect(result.skippedExisting).toHaveLength(CITY_SHEET_CANDIDATE_SEEDS.length);
  });

  it('respects launchScope from the seed data (P1 boundary enforcement)', async () => {
    const entryCreate = jest.fn().mockImplementation(async () => ({ id: 'entry-x', sequenceNumber: 1 }));
    const client = makeClient({ entryCreate });

    await seedCitySheetCandidates(client);

    for (const call of entryCreate.mock.calls) {
      expect(call[0].data.launchScope).toBe(LaunchAreaScope.CORE_LAUNCH_COUNTY);
    }
  });

  it('every seed candidate has a non-empty organizationName, description, serviceArea, and hours (schema-required fields)', () => {
    for (const candidate of CITY_SHEET_CANDIDATE_SEEDS) {
      expect(candidate.organizationName.length).toBeGreaterThan(0);
      expect(candidate.description.length).toBeGreaterThan(0);
      expect(candidate.serviceArea.length).toBeGreaterThan(0);
      expect(candidate.hours.length).toBeGreaterThan(0);
    }
  });

  it('no two seed candidates share the same organizationName (source-level duplicate check)', () => {
    const names = CITY_SHEET_CANDIDATE_SEEDS.map((c) => c.organizationName);
    expect(new Set(names).size).toBe(names.length);
  });
});
