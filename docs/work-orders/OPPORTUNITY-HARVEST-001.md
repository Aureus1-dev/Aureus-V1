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

## Final implemented scope

The 2026 Pennsylvania rule pack is intentionally limited to regulated sportsbook and online-casino promotions. Banking and other non-gambling incentives remain ordinary Opportunity Center opportunities until they have a separately reviewed tax/economic treatment; they cannot enter Annual Harvest.

Before a runnable plan is created, a claimed member must attest age accuracy, review and exclude offers already used or otherwise unavailable, explicitly attest legal Pennsylvania gaming participation and that they are not currently self-excluded from the relevant gaming product, resolve means-tested-benefit impact, disclose whether tax-professional review is required, and accept bankroll, projected-loss, time, and hard-stop limits.

Offer selection is recalculated after each selected offer using marginal federal and Pennsylvania tax estimates. The next offer is the currently eligible positive-after-tax offer with the highest after-tax value per estimated minute, subject to the member's hard constraints. This is a deterministic exposure-aware greedy sequence, not a claim of mathematically global optimization.

Annual planning preserves history as multiple plan cycles within a tax year rather than locking the member to one immutable row. A READY, ACTIVE, or REVIEW_REQUIRED cycle must be closed before a fresh cycle is created; COMPLETED, STOPPED, and CANCELLED cycles remain auditable and do not block a later fresh plan.

Starting an offer revalidates current legal status, exact promotion-term freshness, Opportunity freshness, member age, deadline, and the exact harvest-profile version captured when the plan was built. A profile change after planning requires a fresh cycle rather than silently changing the reviewed plan.

Stop Means Stop applies to gambling activity. QUEUED and IN_PROGRESS execution is terminated. If the member had already reached REQUIREMENT_MET or WITHDRAWAL_REQUESTED, the stopped plan still permits the minimum settlement actions required to request/confirm withdrawal; it never reopens wagering. A member who stops mid-play is instructed not to continue wagering merely to preserve promotional value and to withdraw available cash when the operator permits.

Pennsylvania VERIFIED_REGULATED gaming profiles require an HTTPS license source on the official `gamingcontrolboard.pa.gov` domain. Exact promotion terms remain a separate source and must be reviewed within the 14-day freshness window.
