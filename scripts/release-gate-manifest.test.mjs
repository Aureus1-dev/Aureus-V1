import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { loadReleaseGateManifest } from './release-gate-manifest.mjs';

const temporaryRoots = [];

function write(root, path, value) {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(
    destination,
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'aureus-release-gate-'));
  temporaryRoots.push(root);
  write(root, 'docs/work-orders/TEST-001.md', '# TEST-001\n');
  write(root, 'scripts/automatic.mjs', 'console.log(JSON.stringify({ result: "PASS" }));\n');
  write(root, 'release-gates/contracts/automatic.json', {
    id: 'automatic',
    order: 10,
    title: 'Automatic proof',
    mode: 'automated',
    runner: 'scripts/automatic.mjs',
    evidenceFile: 'automatic.json',
    passResults: ['PASS'],
    description: 'Runs an automatic proof.',
  });
  write(root, 'release-gates/contracts/manual.json', {
    id: 'manual',
    order: 100,
    title: 'Manual proof',
    mode: 'manual',
    evidenceFile: 'manual.json',
    description: 'Requires a human decision.',
  });
  write(root, 'release-gates/manifest.json', {
    schemaVersion: 1,
    name: 'Test gate',
    activeWorkOrders: [
      {
        id: 'TEST-001',
        path: 'docs/work-orders/TEST-001.md',
        contractIds: ['automatic', 'manual'],
      },
    ],
    permanentContractIds: ['automatic', 'manual'],
  });
  return root;
}

test.afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop(), { recursive: true, force: true });
});

test('loads one living gate with current work orders and permanent contracts', () => {
  const loaded = loadReleaseGateManifest({ rootDir: fixture() });
  assert.deepEqual(
    loaded.selectedContracts.map((contract) => contract.id),
    ['automatic', 'manual'],
  );
  assert.equal(loaded.manifest.activeWorkOrders[0].id, 'TEST-001');
});

test('fails closed when the current work-order document is missing', () => {
  const root = fixture();
  const manifestPath = join(root, 'release-gates/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.activeWorkOrders[0].path = 'docs/work-orders/MISSING.md';
  write(root, 'release-gates/manifest.json', manifest);
  assert.throws(() => loadReleaseGateManifest({ rootDir: root }), /does not exist/);
});

test('fails closed on duplicate contract identifiers', () => {
  const root = fixture();
  const manualPath = join(root, 'release-gates/contracts/manual.json');
  const manual = JSON.parse(readFileSync(manualPath, 'utf8'));
  manual.id = 'automatic';
  write(root, 'release-gates/contracts/manual.json', manual);
  assert.throws(() => loadReleaseGateManifest({ rootDir: root }), /duplicate value automatic/);
});

test('fails closed when a registry path attempts to escape the repository', () => {
  const root = fixture();
  const contractPath = join(root, 'release-gates/contracts/automatic.json');
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  contract.runner = '../automatic.mjs';
  write(root, 'release-gates/contracts/automatic.json', contract);
  assert.throws(() => loadReleaseGateManifest({ rootDir: root }), /must not escape/);
});

test('requires both automated proof and a manual acceptance boundary for every active work order', () => {
  const root = fixture();
  const manifestPath = join(root, 'release-gates/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.activeWorkOrders[0].contractIds = ['automatic'];
  write(root, 'release-gates/manifest.json', manifest);
  assert.throws(
    () => loadReleaseGateManifest({ rootDir: root }),
    /has no manual acceptance contract/,
  );
});
