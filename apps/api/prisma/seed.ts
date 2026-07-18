import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { bootstrapAdmin } from '../src/scripts/bootstrap-admin';

/** Thin CLI entrypoint — see `src/scripts/bootstrap-admin.ts` for the tested bootstrap logic. */
async function main(): Promise<void> {
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

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await bootstrapAdmin(prisma, email, password);
    console.log(result.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Admin bootstrap failed:', error);
  process.exitCode = 1;
});
