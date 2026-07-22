import { CitySheetVerificationStatus, UserRole } from '@prisma/client';
import { CITY_SHEET_CANDIDATE_SEEDS, CitySheetCandidateSeed } from './city-sheet-candidates.data';

const SEED_ACTOR_EMAIL = 'city-sheet-research@ai.aureus.internal';

/** The narrow slice of PrismaClient this seed needs — kept minimal so it can be exercised with a plain mock in tests, without a real database connection. */
export interface SeedCitySheetClient {
  user: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  citySheetEntry: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string; sequenceNumber: number }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
}

export interface SeedCitySheetResult {
  actorId: string;
  created: string[];
  skippedExisting: string[];
}

/**
 * Ensures a dedicated, non-interactive system actor exists to attribute
 * automated candidate compilation (WO A3) to, distinct from any human
 * Steward or Founder account. AI_SERVICE_ACCOUNT (not MEMBER) so it never
 * appears in member-facing counts; passwordHash is left null, which
 * AuthService.login() treats as "cannot authenticate" — this account can
 * never sign in.
 */
async function ensureSeedActor(prisma: SeedCitySheetClient): Promise<string> {
  const existing = await prisma.user.findFirst({ where: { email: SEED_ACTOR_EMAIL } });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      email: SEED_ACTOR_EMAIL,
      passwordHash: null,
      roles: [UserRole.AI_SERVICE_ACCOUNT],
      emailVerified: true,
    },
  });
  return created.id;
}

/**
 * Loads the WO A3 candidate referral list into the City Sheet (A1 schema /
 * A2 storage layer). Idempotent: re-running skips any organization whose
 * name already exists (case-insensitive), so repeated `prisma db seed` runs
 * never create duplicates. Every entry is inserted with verificationStatus
 * left at its schema default (UNVERIFIED) — this function never marks
 * anything VERIFIED; only a real human check (A4, via CitySheetService.verify)
 * may do that.
 */
export async function seedCitySheetCandidates(prisma: SeedCitySheetClient): Promise<SeedCitySheetResult> {
  const actorId = await ensureSeedActor(prisma);

  const created: string[] = [];
  const skippedExisting: string[] = [];

  for (const candidate of CITY_SHEET_CANDIDATE_SEEDS) {
    const existing = await prisma.citySheetEntry.findFirst({
      where: { organizationName: { equals: candidate.organizationName, mode: 'insensitive' } },
    });
    if (existing) {
      skippedExisting.push(candidate.organizationName);
      continue;
    }

    const entry = await prisma.citySheetEntry.create({
      data: toCreateData(candidate, actorId),
    });

    const citySheetRef = `AUR-CS-${entry.sequenceNumber.toString().padStart(6, '0')}`;
    await prisma.citySheetEntry.update({ where: { id: entry.id }, data: { citySheetRef } });

    created.push(candidate.organizationName);
  }

  return { actorId, created, skippedExisting };
}

function toCreateData(candidate: CitySheetCandidateSeed, createdById: string): Record<string, unknown> {
  return {
    organizationName: candidate.organizationName,
    category: candidate.category,
    description: candidate.description,
    address: candidate.address,
    serviceArea: candidate.serviceArea,
    launchScope: candidate.launchScope,
    phone: candidate.phone,
    website: candidate.website,
    hours: candidate.hours,
    eligibilityRequirements: candidate.eligibilityRequirements,
    cost: candidate.cost,
    referralRequired: candidate.referralRequired,
    isEmergencyService: candidate.isEmergencyService,
    verificationStatus: CitySheetVerificationStatus.UNVERIFIED,
    sourceNotes: candidate.sourceNotes,
    createdById,
  };
}
