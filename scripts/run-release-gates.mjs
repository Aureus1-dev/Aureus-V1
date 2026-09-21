#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { loadReleaseGateManifest } from './release-gate-manifest.mjs';

const loaded = loadReleaseGateManifest();
const evidenceDirectory = resolve(
  process.env.RELEASE_EVIDENCE_DIR || join(loaded.rootDir, 'release-evidence'),
);
const startedAt = new Date().toISOString();

function conditionMatches(contract) {
  if (!contract.requiredWhen) return true;
  return String(process.env[contract.requiredWhen.env] ?? '') === contract.requiredWhen.equals;
}

function parsePayload(stdout, stderr) {
  for (const candidate of [stdout.trim(), stderr.trim()]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // A malformed runner is itself release evidence and is handled below.
    }
  }
  return null;
}

function runContract(contract) {
  return new Promise((resolveContract) => {
    const child = spawn(process.execPath, [contract.runnerPath], {
      cwd: loaded.rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      resolveContract({
        exitCode: null,
        payload: null,
        diagnostic: error instanceof Error ? error.message : String(error),
      });
    });
    child.on('close', (exitCode) => {
      const payload = parsePayload(stdout, stderr);
      resolveContract({
        exitCode,
        payload,
        diagnostic: payload
          ? null
          : `Runner did not emit one JSON result (stdout ${stdout.length} bytes, stderr ${stderr.length} bytes)`,
      });
    });
  });
}

function writeEvidence(filename, payload) {
  writeFileSync(join(evidenceDirectory, filename), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  mkdirSync(evidenceDirectory, { recursive: true });
  const contractResults = [];
  const failures = [];

  for (const contract of loaded.selectedContracts) {
    if (contract.mode === 'manual') {
      contractResults.push({
        id: contract.id,
        title: contract.title,
        mode: contract.mode,
        status: 'REQUIRED',
        evidenceFile: contract.evidenceFile,
      });
      continue;
    }

    if (!conditionMatches(contract)) {
      const skipped = {
        result: 'NOT_REQUIRED_FOR_THIS_RUN',
        contractId: contract.id,
        condition: contract.requiredWhen,
      };
      writeEvidence(contract.evidenceFile, skipped);
      contractResults.push({
        id: contract.id,
        title: contract.title,
        mode: contract.mode,
        status: 'NOT_REQUIRED_FOR_THIS_RUN',
        evidenceFile: contract.evidenceFile,
      });
      continue;
    }

    const execution = await runContract(contract);
    const passed =
      execution.exitCode === 0 &&
      execution.payload &&
      contract.passResults.includes(execution.payload.result);
    const evidence = execution.payload ?? {
      result: 'HOLD',
      failure: execution.diagnostic ?? `Runner exited ${execution.exitCode}`,
    };
    writeEvidence(contract.evidenceFile, evidence);
    contractResults.push({
      id: contract.id,
      title: contract.title,
      mode: contract.mode,
      status: passed ? 'PASSED' : 'HOLD',
      runnerResult: evidence.result ?? null,
      exitCode: execution.exitCode,
      evidenceFile: contract.evidenceFile,
    });
    if (!passed) {
      failures.push(
        `${contract.id} failed: ${execution.diagnostic ?? evidence.failure ?? evidence.failures?.join('; ') ?? evidence.result ?? 'unknown failure'}`,
      );
    }
  }

  const summary = {
    result: failures.length ? 'HOLD' : 'AUTOMATED_GATE_PASSED',
    gate: loaded.manifest.name,
    schemaVersion: loaded.manifest.schemaVersion,
    expectedCommit:
      process.env.RELEASE_EXPECTED_COMMIT ?? process.env.RELEASE_COMMIT_SHA ?? 'unrecorded',
    webOrigin: process.env.RELEASE_WEB_ORIGIN ?? null,
    apiOrigin: process.env.RELEASE_API_ORIGIN ?? null,
    startedAt,
    finishedAt: new Date().toISOString(),
    activeWorkOrders: loaded.manifest.activeWorkOrders,
    permanentContractIds: loaded.manifest.permanentContractIds,
    contractResults,
    manualDecisionRequired: contractResults.some(
      (contract) => contract.mode === 'manual' && contract.status === 'REQUIRED',
    ),
    failures,
  };
  writeEvidence('release-gate-summary.json', summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  mkdirSync(evidenceDirectory, { recursive: true });
  const failure = error instanceof Error ? error.message : String(error);
  const summary = {
    result: 'HOLD',
    startedAt,
    finishedAt: new Date().toISOString(),
    failures: [failure],
  };
  writeEvidence('release-gate-summary.json', summary);
  process.stderr.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
});
