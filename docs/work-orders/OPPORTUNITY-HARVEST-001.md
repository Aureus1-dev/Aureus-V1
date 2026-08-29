# OPPORTUNITY-HARVEST-001 — Responsible Annual Harvest

Status: implementation candidate
Parent execution ledger: GitHub Issue #95
Authority: existing Opportunity Center canon and ADR-004. This work order does not amend canon.

## Outcome

Build a member-first annual value-harvest machine that can sequence freshly verified promotions while minimizing gambling exposure and stopping when responsible limits, tax/benefit gates, or member choice say stop.

## Non-negotiable behavior

- Only VERIFIED + ACTIVE Opportunities with a separate fresh VERIFIED_REGULATED harvest profile may enter a runnable plan.
- License status and current promotion terms are separate verification facts.
- Promotion economics are snapshots; deployment or seeding may not fabricate verification dates.
- 2026 Pennsylvania federal tax estimation applies the statutory 90% limit on deductible gambling losses and compares itemizing with the standard deduction.
- Unknown means-tested-benefit impact or a tax situation flagged for professional review blocks execution.
- Negative after-tax expected value is never selected.
- Member bankroll, projected-loss, and time limits are hard constraints.
- No affiliate economics participate in selection.
- Plan execution is one offer at a time.
- Operator progress is authoritative. Aureus records evidence/progress but never invents completion.
- After the reviewed requirement is complete, the next action is withdrawal.
- A stopped plan rejects further execution. Stop means stop.
- Guests may browse opportunities but must claim/create an account before persisting a harvest plan.
- No wager is placed automatically.

## Current rule-pack scope

The deterministic tax engine intentionally supports only tax year 2026 and Pennsylvania. Any other year/state fails closed until reviewed rules are added.

Sources reviewed 2026-08-29:
- IRS 2026 Form 1040-ES tax-rate schedules.
- IRS Publication 505: beginning in 2026 gambling-loss deduction is limited to the lesser of 90% of losses or winnings.
- Pennsylvania Department of Revenue gambling/lottery guidance: same-year wager costs may reduce Pennsylvania gambling winnings when substantiated.
- Pennsylvania Gaming Control Board licensed online operator lists.

## Review gates

Constructor may implement and prepare evidence. An independent reviewer must inspect the full diff, exact SHA, migration, state-machine behavior, tax tests, member boundaries, and CI. Merge and deploy remain Founder-gated.
