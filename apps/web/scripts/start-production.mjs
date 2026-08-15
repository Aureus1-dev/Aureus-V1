import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const standaloneAppDir = resolve(appDir, '.next/standalone/apps/web');
const serverPath = resolve(standaloneAppDir, 'server.js');

if (!existsSync(serverPath)) {
  console.error(`Next standalone server not found at ${serverPath}. Refusing to fall back to next start.`);
  process.exit(1);
}

// Next standalone output does not copy public or .next/static automatically.
// Docker copies them explicitly; native Render needs the same layout before
// launching the traced server bundle.
function linkRuntimeAsset(source, destination) {
  mkdirSync(dirname(destination), { recursive: true });
  if (existsSync(destination)) rmSync(destination, { recursive: true, force: true });
  symlinkSync(relative(dirname(destination), source), destination, 'dir');
}

linkRuntimeAsset(resolve(appDir, 'public'), resolve(standaloneAppDir, 'public'));
linkRuntimeAsset(resolve(appDir, '.next/static'), resolve(standaloneAppDir, '.next/static'));

// Render's proxy reaches the service through the container/network interface,
// so the standalone Next server must bind to all interfaces rather than the
// instance hostname. Preserve Render's injected PORT and every other env var.
const serverEnv = {
  ...process.env,
  HOSTNAME: '0.0.0.0',
};

const server = spawn(process.execPath, [serverPath], {
  cwd: standaloneAppDir,
  env: serverEnv,
  stdio: 'inherit',
});

server.on('error', (error) => {
  console.error('Failed to launch Aureus web server:', error);
  process.exit(1);
});
server.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
