# PEOPLE-FOLLOW-001 — Constructor Evidence

**Base:** `ff94fb532497a4e514222eb45b8a9109f6e4f1e8`  
**Branch:** `people-step5-obligation-follow-through`

## Constructor disposition

This candidate implements People Step 5 as the first PA-023 / RME-001 sourced Obligation proof and deliberately does not introduce a generalized Obligation table.

### Reuse decisions

- canonical `PERSONAL_NEED_RESOLUTION` Responsibility remains the accepted-work root;
- `Responsibility.dueAt` is reused as the current due projection for the deliberately one-obligation proof;
- `Responsibility.successCriteria.step5FollowThrough` carries the bounded typed contract until repeated domains justify generalized persistence;
- the contract exposes a monotonic revision and every external mutation requires the caller's last-read revision, while the database compare-and-set also checks that JSON revision so concurrent writers cannot silently overwrite one another;
- `ResponsibilityEvent.ACTION_EVIDENCED` carries append-only source references for reported/verified satisfaction and staff verification;
- existing `StewardshipRelationship` remains Human Steward ownership truth;
- existing `NotificationsService` provides dedupe-keyed reminder/retry/review communication;
- the assigned queue and staff verification mutation responses share one minimum-necessary response shape and never serialize the member's private `requiredAction` text;
- the sweep re-reads persisted truth before every missed-notice attempt, including an already-`MISSED` retry, so concurrent satisfaction/rescheduling cannot emit a stale missed or review notice;
- `Task`, `StewardshipTask`, `NeedEscalation`, and `StewardshipEscalation` are not repurposed into a second obligation/case truth.

### First proof

One canonical housing/utilities StatedNeed -> one Personal Need Responsibility -> one sourced housing Obligation -> due/owner/attempt/retry/waiting -> reported or verified satisfaction -> underlying Personal Need Responsibility remains open until its own canonical source-domain outcome evidence proves resolution.

### Mechanical gate

This file records constructor intent only. The exact final candidate SHA must separately prove TypeScript, lint, Prisma, migrations, API/web tests, build, Docker, focused Step-5 adversarial tests, independent review, and Founder merge authorization.
