import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const repoRoot = resolve(appDir, '../..');

function migrationDatabaseUrl(runtimeUrl) {
  if (process.env.MIGRATION_DATABASE_URL) {
    return process.env.MIGRATION_DATABASE_URL;
  }

  if (!runtimeUrl) return runtimeUrl;

  try {
    const url = new URL(runtimeUrl);

    // Supabase transaction-pooler connections use port 6543. They are
    // appropriate for normal application traffic, but schema migrations need
    // a session-capable connection. The same shared pooler exposes session
    // mode on port 5432, so use that only for `prisma migrate deploy` while
    // leaving the running API on its original DATABASE_URL.
    if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') {
      url.port = '5432';
      return url.toString();
    }
  } catch (error) {
    console.error('DATABASE_URL is not a valid URL; refusing to run migrations.', error);
    process.exit(1);
  }

  return runtimeUrl;
}

// Native Render services do not execute render.yaml's Docker pre-deploy hook.
// Keep the native `pnpm start` path aligned with the Docker/Blueprint contract:
// production must not begin serving traffic until every committed Prisma
// migration has been applied to the configured database.
const migrationUrl = migrationDatabaseUrl(process.env.DATABASE_URL);
const migrationEnv = migrationUrl
  ? { ...process.env, DATABASE_URL: migrationUrl }
  : process.env;

const migrate = spawnSync(
  'pnpm',
  ['--dir', repoRoot, 'exec', 'prisma', 'migrate', 'deploy'],
  {
    cwd: repoRoot,
    env: migrationEnv,
    stdio: 'inherit',
  },
);

if (migrate.error) {
  console.error('Failed to launch Prisma migration command:', migrate.error);
  process.exit(1);
}
if (migrate.status !== 0) {
  console.error(`Prisma migrate deploy failed with exit code ${migrate.status ?? 'unknown'}. Refusing to start the API.`);
  process.exit(migrate.status ?? 1);
}

const server = spawn(process.execPath, [resolve(appDir, 'dist/main.js')], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

server.on('error', (error) => {
  console.error('Failed to launch Aureus API:', error);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
