import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { bootstrapAdmin } from '../src/scripts/bootstrap-admin';
import { seedCitySheetCandidates } from '../src/scripts/seed-city-sheet-candidates';
import { seedCitySheetChecklistItems } from '../src/scripts/seed-city-sheet-checklist-items';

/** Thin CLI entrypoint — see `src/scripts/bootstrap-admin.ts`, `src/scripts/seed-city-sheet-checklist-items.ts`, and `src/scripts/seed-city-sheet-candidates.ts` for the tested logic. */
async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await runAdminBootstrap(prisma);
    await runCitySheetChecklistItemSeed(prisma);
    await runCitySheetCandidateSeed(prisma);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function runAdminBootstrap(prisma: PrismaClient): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      'Skipping admin bootstrap: BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are not both set. ' +
        'Set both environment variables and re-run `npx prisma db seed` to create the first administrator.',
    );
    return;
  }

  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const result = await bootstrapAdmin(prisma, email, password);
  console.log(result.message);
}

/**
 * WO A3 (docs/launch/WORKORDERS.md): loads the initial Launch City Sheet
 * candidate referral list for Chester/Delaware County, PA. Unlike admin
 * bootstrap, this always runs — it needs no credentials — and is
 * idempotent, so repeated `prisma db seed` runs never duplicate entries.
 * Every entry lands as verificationStatus UNVERIFIED; a human steward must
 * still phone-verify each one (A4) before it may be relied upon.
 */
async function runCitySheetCandidateSeed(prisma: PrismaClient): Promise<void> {
  const result = await seedCitySheetCandidates(prisma);
  console.log(
    `City sheet candidates: ${result.created.length} created, ${result.skippedExisting.length} already present. ` +
      'All entries are UNVERIFIED — pending A4 human phone verification.',
  );
}

/**
 * A4-PREP (docs/launch/WORKORDERS.md): loads the default verification
 * checklist. Also always runs and is idempotent. This is only the starting
 * configuration — Operations can add, reorder, or retire items afterward
 * via the checklist-items API (PLATFORM_ADMINISTRATOR only) without an
 * engineering deploy or touching this seed again.
 */
async function runCitySheetChecklistItemSeed(prisma: PrismaClient): Promise<void> {
  const result = await seedCitySheetChecklistItems(prisma);
  console.log(
    `City sheet checklist items: ${result.created.length} created, ${result.skippedExisting.length} already present.`,
  );
}

main().catch((error: unknown) => {
  console.error('Admin bootstrap failed:', error);
  process.exitCode = 1;
});
