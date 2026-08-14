import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "contract-package.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "valid-fixtures.json"), "utf8"));
const jsTypes = { string: "string", array: "array", object: "object", boolean: "boolean" };

function validate(name, value, at = "$") {
  const schema = pkg.schemas[name];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [`${at}: expected object`];
  const errors = [];
  const keys = new Set(Object.keys(value));
  for (const field of schema.required) if (!keys.has(field)) errors.push(`${at}: missing ${field}`);
  for (const field of keys) if (!(field in schema.properties)) errors.push(`${at}: unknown ${field}`);
  for (const [field, rule] of Object.entries(schema.properties)) {
    if (!(field in value)) continue;
    const item = value[field];
    if (rule.schema) errors.push(...validate(rule.schema, item, `${at}.${field}`));
    if (rule.type) {
      const actual = Array.isArray(item) ? "array" : typeof item;
      if (actual !== jsTypes[rule.type]) errors.push(`${at}.${field}: expected ${rule.type}`);
    }
    if ("const" in rule && item !== rule.const) errors.push(`${at}.${field}: constant mismatch`);
    if (rule.enum && !rule.enum.includes(item)) errors.push(`${at}.${field}: unsupported value`);
    if (typeof item === "string" && item.length === 0) errors.push(`${at}.${field}: empty string`);
  }
  return errors;
}

const failures = [];
for (const name of Object.keys(pkg.schemas)) failures.push(...validate(name, fixtures[name], name));
const clone = value => structuredClone(value);
const attacks = [];
let value = clone(fixtures.work_request); value.contract_version = "9.9.9"; attacks.push(["version mismatch", "work_request", value]);
value = clone(fixtures.work_request); value.tenant_id = "attacker-tenant"; attacks.push(["unknown tenant override", "work_request", value]);
value = clone(fixtures.work_request); value.context.authority = "self-approved"; attacks.push(["retrieved authority injection", "work_request", value]);
value = clone(fixtures.library_read); value.release_reference = "release-deadbeefdeadbeef"; attacks.push(["stale Library release", "library_read", value]);
value = clone(fixtures.outcome_feedback); value.candidate_only = false; attacks.push(["outcome self-promotion", "outcome_feedback", value]);
value = clone(fixtures.consent_envelope); delete value.decision; attacks.push(["missing consent decision", "consent_envelope", value]);
for (const [label, schema, candidate] of attacks) if (validate(schema, candidate).length === 0) failures.push(`adversarial case accepted: ${label}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`PASS: ${Object.keys(pkg.schemas).length} schemas and ${attacks.length} deny-path cases`);
