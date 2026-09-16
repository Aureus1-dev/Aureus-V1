# Aureus People Step 1 — Constructor Evidence

**Status:** Step 1 merged; bounded post-merge hardening candidate awaiting exact-head CI + independent review  
**Repository:** `Aureus1-dev/Aureus-V1`  
**Merged Step 1 PR:** #123 — Aureus People Step 1: Universal Need to Resolution  
**Merged Step 1 commit:** `1154cdce7ffb9a947ec7477fead934cea7952604`  
**Hardening branch:** `people/step1-hardening-followups`  
**Hardening base:** `1154cdce7ffb9a947ec7477fead934cea7952604`

## Single proof

`owned StatedNeed → one PERSONAL_NEED_RESOLUTION Responsibility → truthful currently permitted route → verified resource and/or explicit accountable human attention → Responsible Continuation → explicit underlying-need outcome evidence → truthful terminal state`

## Constructor reconciliation completed in merged Step 1

- Ported the valid OR-004 orchestration onto current shared Responsibility and Authority foundations instead of merging historical PR #113 wholesale.
- Preserved Business `BUSINESS_PROMISE` behavior and generalized Authority/Trust infrastructure.
- Added `PERSONAL_NEED_RESOLUTION` with database constraints enforcing Personal/member/no-organization/no-opportunity/GUIDANCE_ONLY/PERSONAL_PRIVATE shape.
- Added database race protection for one open Personal Need Responsibility in the existing conversation/StatedNeed V1 scope.
- Reused `StatedNeed`, verified resource matching, `ResourceOffer`, `NeedEscalation`, and safe-failure sources rather than creating a People CRM/case/ticket system.

## Constructor red-team repairs already merged

1. **Human handoff truth:** `NeedEscalation.RESOLVED` does not complete the underlying life need. A callback or steward handoff can finish without the member's requested outcome being achieved.
2. **Underlying outcome evidence:** append-only `NeedOutcomeReport` records explicit underlying-need outcome evidence. Explicit member outcome reports remain `REPORTED` unless another independent source verifies them.
3. **No phantom humans:** Human Steward is never auto-paged; unavailable human attention is not represented as reachable, and Aureus retains the Responsibility rather than silently abandoning it.
4. **Projection consistency:** current read state and continuation use the same newest human-escalation and outcome truth.
5. **Retry identity:** repeated acceptance of the same canonical StatedNeed returns the same Responsibility even after terminal state; it does not reopen or duplicate the work.
6. **Concurrent provenance:** concurrent acceptance with different StatedNeed provenance fails closed rather than returning another request's Responsibility.
7. **Authority boundary:** creating a Personal Need Responsibility does not create or widen AuthorityGrants.
8. **Evidence boundary:** resource offer/acceptance, human callback, model output, notification state, and API copy do not upgrade life-outcome evidence.
9. **Durable responsible exhaustion:** `RESPONSIBLY_EXHAUSTED` is reachable only after a canonical persisted `UnresolvedNeed` no-route record, a later explicit `STILL_UNRESOLVED` member report, and a fresh reconciliation that still finds no verified resource or reachable Human Steward. Temporary unavailability, a bare retry, a predating/tied outcome, an open escalation, or a newly available route does not exhaust the Responsibility.

## Bounded post-merge hardening in this branch

This branch closes the non-blocking findings from the final independent Step 1 review without changing the frozen People Step 1 product contract:

1. **Reachability copy/source alignment:** a non-triggered Gate C safe-failure result is no longer treated as proof that a Human Steward is reachable. Reachability is checked directly before member copy or a Human Steward route is projected.
2. **Complete exhaustion provenance:** the terminal exhaustion ledger keeps `UnresolvedNeed` as the primary terminal source and writes the later `NeedOutcomeReport(STILL_UNRESOLVED)` as its own `ACTION_EVIDENCED` supporting record. The two source records remain separate and auditable.
3. **DB-backed exhaustion proof:** a dedicated E2E test uses real Postgres-backed Needs/Responsibility persistence to prove `UnresolvedNeed → later STILL_UNRESOLVED report → RESPONSIBLY_EXHAUSTED`, including both evidence events.
4. **Ordering regression:** focused unit coverage proves a member report that predates the no-route record cannot terminally exhaust the Responsibility.
5. **No architecture expansion:** no schema migration, new workflow/case/ticket domain, authority expansion, People UI, household model, billing model, or steward-operations surface is added.

## Verification expectations for this hardening candidate

Before this follow-up is merged:

1. product/constructor gates must remain green;
2. Prisma generation, typecheck, lint, clean migrations, API unit/integration/e2e, web tests/build, seed, and Docker verification must pass on the exact candidate head;
3. the exact candidate SHA must receive a fresh independent Claude audit, focused on the five closed findings and regressions, with no blocking/high finding;
4. any material repair after that audit requires a fresh exact-head verification/review cycle;
5. Founder separately authorizes merge.

This document is evidence, not self-certification.
