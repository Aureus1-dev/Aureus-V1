import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const repoRoot = resolve(appDir, '../..');

// Native Render services do not execute render.yaml's Docker pre-deploy hook.
// Keep the native `pnpm start` path aligned with the Docker/Blueprint contract:
// production must not begin serving traffic until every committed Prisma
// migration has been applied to the configured DATABASE_URL.
const migrate = spawnSync(
  'pnpm',
  ['--dir', repoRoot, 'exec', 'prisma', 'migrate', 'deploy'],
  {
    cwd: repoRoot,
    env: process.env,
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
