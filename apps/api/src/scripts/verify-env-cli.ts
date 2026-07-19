import { config as loadDotenv } from 'dotenv';
import { verifyEnv } from './verify-env';

/**
 * Thin CLI entrypoint — see `verify-env.ts` for the tested validation
 * logic. Usage:
 *
 *   pnpm verify:env                    # validates process.env as-is
 *   pnpm verify:env .env.production    # loads a file first, then validates
 */
function main(): void {
  const envFile = process.argv[2];
  if (envFile) {
    const result = loadDotenv({ path: envFile });
    if (result.error) {
      console.error(`Could not read ${envFile}: ${result.error.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Loaded ${envFile}`);
  }

  const { ok, errors } = verifyEnv(process.env);
  if (ok) {
    console.log(`Environment is valid for NODE_ENV=${process.env.NODE_ENV ?? 'development'}.`);
    return;
  }

  console.error('Environment validation failed:');
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exitCode = 1;
}

main();
