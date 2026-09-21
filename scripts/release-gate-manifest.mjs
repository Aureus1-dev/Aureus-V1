#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE_GATE_SCHEMA_VERSION = 1;

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  throw new Error(`Release gate manifest: ${message}`);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string`);
  return value;
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array`);
  value.forEach((entry, index) => requireString(entry, `${label}[${index}]`));
  return value;
}

function resolveRepositoryPath(rootDir, value, label) {
  const repositoryPath = requireString(value, label);
  if (isAbsolute(repositoryPath) || repositoryPath.includes('\\')) {
    fail(`${label} must be a repository-relative POSIX path`);
  }

  const normalized = normalize(repositoryPath);
  if (normalized === '..' || normalized.startsWith(`..${sep}`) || normalized !== repositoryPath) {
    fail(`${label} must not escape or normalize outside its declared path`);
  }

  const absolutePath = resolve(rootDir, repositoryPath);
  const fromRoot = relative(rootDir, absolutePath);
  if (!fromRoot || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    fail(`${label} must resolve to a file inside the repository`);
  }
  if (!existsSync(absolutePath)) fail(`${label} does not exist: ${repositoryPath}`);
  return absolutePath;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`${label} is not valid JSON: ${message}`);
  }
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label} contains duplicate value ${value}`);
    seen.add(value);
  }
}

function validateCondition(condition, label) {
  if (condition === undefined) return;
  const value = requireObject(condition, label);
  const env = requireString(value.env, `${label}.env`);
  requireString(value.equals, `${label}.equals`);
  if (!/^[A-Z][A-Z0-9_]*$/.test(env)) fail(`${label}.env must be an uppercase environment key`);
}

function validateContract(rootDir, descriptorPath) {
  const contract = requireObject(readJson(descriptorPath, descriptorPath), descriptorPath);
  requireString(contract.id, `${descriptorPath}.id`);
  if (!Number.isSafeInteger(contract.order) || contract.order < 0) {
    fail(`${descriptorPath}.order must be a non-negative integer`);
  }
  requireString(contract.title, `${descriptorPath}.title`);
  requireString(contract.description, `${descriptorPath}.description`);
  requireString(contract.evidenceFile, `${descriptorPath}.evidenceFile`);

  if (contract.evidenceFile.includes('/') || contract.evidenceFile.includes('\\')) {
    fail(`${descriptorPath}.evidenceFile must be a filename, not a path`);
  }
  if (!contract.evidenceFile.endsWith('.json')) {
    fail(`${descriptorPath}.evidenceFile must end in .json`);
  }

  if (contract.mode !== 'automated' && contract.mode !== 'manual') {
    fail(`${descriptorPath}.mode must be automated or manual`);
  }

  if (contract.mode === 'automated') {
    const runnerPath = resolveRepositoryPath(rootDir, contract.runner, `${descriptorPath}.runner`);
    if (!contract.runner.startsWith('scripts/') || !contract.runner.endsWith('.mjs')) {
      fail(`${descriptorPath}.runner must be an .mjs file below scripts/`);
    }
    requireStringArray(contract.passResults, `${descriptorPath}.passResults`);
    assertUnique(contract.passResults, `${descriptorPath}.passResults`);
    validateCondition(contract.requiredWhen, `${descriptorPath}.requiredWhen`);
    return { ...contract, descriptorPath: relative(rootDir, descriptorPath), runnerPath };
  }

  if (
    contract.runner !== undefined ||
    contract.passResults !== undefined ||
    contract.requiredWhen !== undefined
  ) {
    fail(
      `${descriptorPath} manual contracts may not declare a runner, passResults, or requiredWhen`,
    );
  }
  return { ...contract, descriptorPath: relative(rootDir, descriptorPath) };
}

export function loadReleaseGateManifest({ rootDir = defaultRoot } = {}) {
  const resolvedRoot = resolve(rootDir);
  const manifestPath = join(resolvedRoot, 'release-gates', 'manifest.json');
  if (!existsSync(manifestPath)) fail('release-gates/manifest.json does not exist');

  const manifest = requireObject(readJson(manifestPath, 'release-gates/manifest.json'), 'manifest');
  if (manifest.schemaVersion !== RELEASE_GATE_SCHEMA_VERSION) {
    fail(`schemaVersion must be ${RELEASE_GATE_SCHEMA_VERSION}`);
  }
  requireString(manifest.name, 'manifest.name');
  const contractsDirectory = join(resolvedRoot, 'release-gates', 'contracts');
  if (!existsSync(contractsDirectory)) fail('release-gates/contracts does not exist');
  const descriptorNames = readdirSync(contractsDirectory)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (descriptorNames.length === 0) fail('release-gates/contracts contains no JSON contracts');
  const contracts = descriptorNames
    .map((name) => validateContract(resolvedRoot, join(contractsDirectory, name)))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  assertUnique(
    contracts.map((contract) => contract.id),
    'contract identifiers',
  );
  assertUnique(
    contracts.map((contract) => contract.evidenceFile),
    'contract evidence filenames',
  );
  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));

  requireStringArray(manifest.permanentContractIds, 'manifest.permanentContractIds');
  assertUnique(manifest.permanentContractIds, 'manifest.permanentContractIds');
  for (const id of manifest.permanentContractIds) {
    if (!contractsById.has(id)) fail(`permanent contract ${id} is not registered`);
  }

  if (!Array.isArray(manifest.activeWorkOrders) || manifest.activeWorkOrders.length === 0) {
    fail('manifest.activeWorkOrders must contain at least one current work order');
  }
  const workOrderIds = [];
  for (const [index, rawWorkOrder] of manifest.activeWorkOrders.entries()) {
    const workOrder = requireObject(rawWorkOrder, `manifest.activeWorkOrders[${index}]`);
    const id = requireString(workOrder.id, `manifest.activeWorkOrders[${index}].id`);
    workOrderIds.push(id);
    const documentPath = requireString(workOrder.path, `manifest.activeWorkOrders[${index}].path`);
    if (!documentPath.startsWith('docs/work-orders/') || !documentPath.endsWith('.md')) {
      fail(`active work order ${id} must reference a Markdown file below docs/work-orders/`);
    }
    resolveRepositoryPath(resolvedRoot, documentPath, `active work order ${id} path`);
    requireStringArray(workOrder.contractIds, `active work order ${id} contractIds`);
    assertUnique(workOrder.contractIds, `active work order ${id} contractIds`);

    const workOrderContracts = workOrder.contractIds.map((contractId) => {
      const contract = contractsById.get(contractId);
      if (!contract) fail(`active work order ${id} references unregistered contract ${contractId}`);
      return contract;
    });
    if (!workOrderContracts.some((contract) => contract.mode === 'automated')) {
      fail(`active work order ${id} has no automated release contract`);
    }
    if (!workOrderContracts.some((contract) => contract.mode === 'manual')) {
      fail(`active work order ${id} has no manual acceptance contract`);
    }
  }
  assertUnique(workOrderIds, 'active work order identifiers');

  const selectedIds = new Set(manifest.permanentContractIds);
  for (const workOrder of manifest.activeWorkOrders) {
    for (const contractId of workOrder.contractIds) selectedIds.add(contractId);
  }
  const selectedContracts = contracts.filter((contract) => selectedIds.has(contract.id));

  return {
    rootDir: resolvedRoot,
    manifestPath,
    manifest,
    contracts,
    selectedContracts,
  };
}

function runCli() {
  const loaded = loadReleaseGateManifest();
  process.stdout.write(
    `${JSON.stringify(
      {
        result: 'RELEASE_GATE_MANIFEST_VALID',
        schemaVersion: loaded.manifest.schemaVersion,
        activeWorkOrders: loaded.manifest.activeWorkOrders.map(({ id, path, contractIds }) => ({
          id,
          path,
          contractIds,
        })),
        permanentContractIds: loaded.manifest.permanentContractIds,
        selectedContractIds: loaded.selectedContracts.map((contract) => contract.id),
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${JSON.stringify({ result: 'HOLD', failure: message }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
