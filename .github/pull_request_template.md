## Change and risk

- What member/business outcome changes?
- Which critical journeys can this affect?
- What can fail safely, and how?

## Required evidence

- [ ] Type checks, lint, tests, production builds, and dependency audit pass.
- [ ] Every defect fixed here has a regression test.
- [ ] Auth, permission, migration, provider, and rollback effects were reviewed.
- [ ] No unfinished or placeholder capability is newly advertised.
- [ ] Current work order and its automated/manual contracts are registered in `release-gates/manifest.json` (or this change declares no release impact with a truthful reason).
- [ ] Any shipped capability regression is promoted into `permanentContractIds`; the living workflow is not copied or replaced.
- [ ] Exact-deployment Living Release Gate evidence is planned or attached.
- [ ] Accountable steward walkthrough is planned or attached.

Release decision: `HOLD` until the deployed-system gate and Accountable steward walkthrough both pass.
