## People Step 4 — Human Steward Operations

Implements PEOPLE-STEWARD-001 on top of the existing canonical People/Stewardship primitives.

### What this slice does

- exposes one open Human Steward operations queue from existing `NeedEscalation` rows;
- makes ACTIVE `StewardshipRelationship` the current human owner/caseload source;
- keeps unassigned work visible to administrators while unrelated stewards see nothing;
- derives the canonical Personal Need `Responsibility` link without exposing private Responsibility payloads;
- reuses existing steward role + capacity enforcement for assignment;
- preflights target capacity before reassignment so a failed handoff does not abandon the current owner;
- supports acknowledge, T0–T3 triage, supervised handoff request, and Human Steward-step resolution;
- records triage/handoff supervision through existing staff-only `StewardshipEscalation` records;
- preserves Step 1 truth: resolving the human step does not complete the underlying Responsibility.

### Explicit non-goals

No new case/CRM table, no new authority model, no raw conversation access, no documents/deadline engine, no institution queue, no parent/minor workflow.

### Validation

Constructor validation is in progress. This PR stays draft until exact-head CI + Docker are green and constructor evidence is frozen. Independent review follows on the exact head before merge.
