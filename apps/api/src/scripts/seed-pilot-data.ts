import {
  CitySheetVerificationStatus,
  OpportunityStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import type { CitySheetCandidateSeed } from './city-sheet-candidates.data';
import {
  PILOT_CITY_SHEET_SEEDS,
  PILOT_OPPORTUNITY_SEEDS,
  type PilotOpportunitySeed,
} from './pilot-seed.data';

const SEED_ACTOR_EMAIL = 'city-sheet-research@ai.aureus.internal';

/** The narrow slice of PrismaClient this seed needs — kept minimal so it can be exercised with a plain mock, without a real database connection. */
export interface SeedPilotClient {
  user: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  citySheetEntry: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string; sequenceNumber: number }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  opportunity: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string; sequenceNumber: number }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
}

export interface SeedPilotResult {
  actorId: string;
  citySheetCreated: string[];
  citySheetSkipped: string[];
  opportunitiesCreated: string[];
  opportunitiesSkipped: string[];
}

/** Reuses the same non-interactive AI_SERVICE_ACCOUNT the A3 candidate seed attributes its work to, rather than minting a second system identity. */
async function ensureSeedActor(prisma: SeedPilotClient): Promise<string> {
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
 * Founder Pilot seed. Fills the two City Sheet categories the pilot's own
 * acceptance case matches but WO A3 left empty (HOUSING_UTILITIES,
 * EMPLOYMENT_JOB_SEARCH), and adds the public-benefit opportunities that
 * give the Coordinated Plan supporting steps to offer alongside them.
 *
 * Without this, a member saying "I lost my job and I'm worried about
 * paying rent" reached "Nothing to coordinate yet" — the plan had no
 * candidates in either source.
 *
 * Idempotent by name, exactly like `seedCitySheetCandidates`, so repeated
 * `prisma db seed` runs never duplicate. City Sheet rows are inserted
 * UNVERIFIED and this function has no path to mark them otherwise; only a
 * human contact check (WO A4) may verify a referral.
 */
export async function seedPilotData(prisma: SeedPilotClient): Promise<SeedPilotResult> {
  const actorId = await ensureSeedActor(prisma);

  const citySheetCreated: string[] = [];
  const citySheetSkipped: string[] = [];

  for (const candidate of PILOT_CITY_SHEET_SEEDS) {
    const existing = await prisma.citySheetEntry.findFirst({
      where: { organizationName: { equals: candidate.organizationName, mode: 'insensitive' } },
    });
    if (existing) {
      citySheetSkipped.push(candidate.organizationName);
      continue;
    }

    const entry = await prisma.citySheetEntry.create({ data: toCitySheetData(candidate, actorId) });
    await prisma.citySheetEntry.update({
      where: { id: entry.id },
      data: { citySheetRef: `AUR-CS-${entry.sequenceNumber.toString().padStart(6, '0')}` },
    });
    citySheetCreated.push(candidate.organizationName);
  }

  const opportunitiesCreated: string[] = [];
  const opportunitiesSkipped: string[] = [];

  for (const seed of PILOT_OPPORTUNITY_SEEDS) {
    const existing = await prisma.opportunity.findFirst({
      where: { title: { equals: seed.title, mode: 'insensitive' } },
    });
    if (existing) {
      opportunitiesSkipped.push(seed.title);
      continue;
    }

    const opportunity = await prisma.opportunity.create({ data: toOpportunityData(seed, actorId) });
    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: { opportunityRef: `AUR-OPP-${opportunity.sequenceNumber.toString().padStart(6, '0')}` },
    });
    opportunitiesCreated.push(seed.title);
  }

  return { actorId, citySheetCreated, citySheetSkipped, opportunitiesCreated, opportunitiesSkipped };
}

function toCitySheetData(candidate: CitySheetCandidateSeed, createdById: string): Record<string, unknown> {
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
    // Never anything but UNVERIFIED here — see the note in pilot-seed.data.ts.
    verificationStatus: CitySheetVerificationStatus.UNVERIFIED,
    sourceNotes: candidate.sourceNotes,
    createdById,
  };
}

function toOpportunityData(seed: PilotOpportunitySeed, actorId: string): Record<string, unknown> {
  return {
    title: seed.title,
    shortDescription: seed.shortDescription,
    fullDescription: seed.fullDescription,
    category: seed.category,
    tags: seed.tags,
    provider: seed.provider,
    officialSourceUrl: seed.officialSourceUrl,
    state: seed.state,
    country: 'US',
    eligibilityRules: seed.eligibilityRules,
    benefitType: seed.benefitType,
    // `OpportunitiesService.findAll` returns only VERIFIED rows, so a
    // DRAFT seed would be invisible and the plan would stay empty. The
    // claim being verified is narrow and checkable: the program exists
    // and `officialSourceUrl` is its real home.
    status: OpportunityStatus.ACTIVE,
    verificationStatus: VerificationStatus.VERIFIED,
    // Provenance: the official government page this was taken from, and
    // the same non-interactive system actor the A3 candidate seed uses.
    sourceName: seed.provider,
    sourceUrl: seed.officialSourceUrl,
    dateLastVerified: new Date(),
    submittedById: actorId,
    createdById: actorId,
    lastUpdatedById: actorId,
  };
}
