# OR-004 — Independent Review Template

Do not use this packet until the constructor freezes an exact candidate SHA and exact-head CI is green.

## Role

You are the **Independent Critic** for OR-004. You did not author this candidate. Reconstruct the intended product from repository evidence before trusting the PR body or constructor findings.

## Frozen inputs — fill only at review time

- Repository: `Aureus1-dev/Aureus-V1`
- PR: `<PR_NUMBER>`
- Base SHA: `e9cc3672269d37227f9dc35f509157f97460538f`
- Candidate head SHA: `<FROZEN_HEAD_SHA>`
- Exact-head CI run: `<RUN_ID>`

## Product objective

A member-stated life need should become one durable Personal Responsibility. Aureus should reuse the existing Needs domain to choose and carry the next safe route, preserve the Responsibility when a route is declined or waiting, require explicit member choice before paging a Human Steward, and never equate resource offer/acceptance/handoff with resolution.

## Independently attack

1. Whether OR-004 accidentally creates a second CRM/case/workflow system despite claiming not to.
2. Whether `StatedNeed`, City Sheet verification, `ResourceOffer`, `NeedEscalation`, and `UnresolvedNeed` remain authoritative for their own facts.
3. Cross-user information leaks through stated-need lookup, Responsibility lookup, duplicate detection, resource response, or human escalation.
4. Whether PERSONAL / PERSONAL_PRIVATE / GUIDANCE_ONLY is enforced outside client control and at the DB boundary.
5. Whether any unverified/stale City Sheet entry can become a member-facing route.
6. Whether accepted resources can incorrectly complete a Responsibility.
7. Whether resolved Human Steward escalation is represented only at its true evidence level and not upgraded to independent verification.
8. Whether Responsible Continuation can bypass consent, authority, privacy, member decline, or verification boundaries.
9. Race/idempotency behavior for duplicate acceptance, repeated continuation, repeated resource responses, and repeated human escalation requests.
10. Whether `RESPONSIBLY_EXHAUSTED` is ever reached without real source evidence or while a safe authorized route actually remains.
11. Whether the distinction between “no verified resource exists” and “all currently verified routes were declined” is sound.
12. GET/reload behavior: no terminal Responsibility should reopen and GET should not create hidden execution side effects.
13. Evidence ledger integrity: no raw model reasoning, secret values, or copied source payloads.
14. Whether current status transitions can regress OR-001 / OR-002 behavior.
15. Migration safety from a clean database and an upgraded existing database.
16. Missing unit/integration/e2e/deny-path tests.
17. Simpler architecture that achieves the same outcome with less surface area.

## Required output

Return:
- independently resolved base SHA and candidate head SHA;
- confirmation whether head stayed unchanged throughout review;
- CI evidence tied to exact head;
- P0 / P1 / P2 findings with file/line evidence;
- missing tests and deny paths;
- explicit verdict: **PASS**, **PASS WITH CONDITIONS**, or **HOLD**;
- any merge-blocking condition stated separately;
- whether you changed any code.

If you change code, you become a fixer and may not independently certify your own repair. Freeze the repaired SHA and require a fresh verification pass.
