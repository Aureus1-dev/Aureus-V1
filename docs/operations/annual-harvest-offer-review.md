# Annual Harvest Offer Review Runbook

## Purpose

Keep the Annual Harvest catalog usable without ever confusing a regulated operator with a currently safe, valuable promotion.

The harvest planner is intentionally fail-closed. An operator may be legally regulated while a specific promotion is stale, expired, unavailable to the member, economically negative after tax, or otherwise unsuitable. Those facts are reviewed separately.

## Authority

Only PLATFORM_ADMINISTRATOR and SYSTEM_ADMINISTRATOR roles may create or update a HarvestOfferProfile.

Stewards may help a member understand the Opportunity Center, but they do not certify gambling-promotion legality or economics.

## Official Pennsylvania operator sources

Use the Pennsylvania Gaming Control Board as the primary operator-regulation source:

- Interactive gaming operators: https://gamingcontrolboard.pa.gov/interactive-gaming-operators
- Online sports wagering operators: https://gamingcontrolboard.pa.gov/online-sports-wagering-licensed-operators
- Responsible gaming resources: https://responsibleplay.pa.gov/

Do not infer that a promotion exists from an operator appearing on a PGCB list.

## Promotion review procedure

For every promotion candidate:

1. Confirm the underlying Opportunity is VERIFIED + ACTIVE and has a current verification timestamp.
2. Confirm the operator is regulated for the relevant Pennsylvania product using the PGCB source.
3. Open the operator's exact current promotion terms from the official operator domain.
4. Record the terms URL and the actual review timestamp. Never backdate or fabricate termsVerifiedAt.
5. Record any explicit expiration date.
6. Record minimum age and whether the promotion is new-customer-only.
7. Model the promotion economics in cents:
   - advertised value;
   - bankroll required at one time;
   - projected cash in;
   - projected cash out;
   - projected taxable gambling winnings;
   - projected deductible gambling losses;
   - playthrough requirement;
   - expected execution time.
8. Add concise execution instructions and material risk notes.
9. Mark VERIFIED_REGULATED only when both the legal source and exact terms support the profile. Otherwise leave REVIEW_REQUIRED or BLOCKED.
10. Never add referral economics to member-first ranking.

## Freshness policy

- Promotion terms become ineligible 14 days after review unless re-reviewed sooner because the terms changed or expired.
- The underlying Opportunity must also have been verified within the last 365 days.
- Starting an offer rechecks both freshness gates. A plan built earlier does not grandfather stale terms.
- The administrator review queue exposes stale, expired, unverified, deleted, or otherwise non-runnable profiles and explains why they need review.

## Member eligibility

Before planning, the member must:

- attest their age;
- review the current fresh candidate list;
- mark every offer already used or otherwise unavailable to them;
- resolve means-tested-benefit impact or remain blocked;
- flag any tax situation needing professional review;
- accept bankroll, projected-loss, time, and stop limits.

A new-customer promotion is never assumed to be available merely because the member has not told Aureus otherwise.

## Execution rule

Aureus does not place wagers.

The member is shown one instruction at a time:

Plan -> Start -> Record operator progress -> Operator progress reaches zero -> Confirm requirement -> Stop playing -> Request withdrawal -> Confirm receipt -> Next offer.

If Aureus or the member stops the plan, open items are stopped and execution cannot resume.

## Tax rule-pack scope

The installed deterministic rule pack supports Pennsylvania, tax year 2026 only. Unsupported years or jurisdictions fail closed.

Tax estimates are planning reserves, not a promise of a final tax return. If the member marks their tax situation for professional review, execution remains blocked.

## Daily operator workflow

1. Open GET /harvest/profiles/review-queue as an authorized administrator.
2. Re-review each surfaced profile against the official operator and PGCB sources.
3. Update the profile through PATCH /harvest/profiles/:opportunityId.
4. Leave uncertain profiles REVIEW_REQUIRED or BLOCKED.
5. Do not manufacture a runnable catalog to satisfy inventory targets.

No fresh verified promotion means no harvest offer. That is a valid system state.
