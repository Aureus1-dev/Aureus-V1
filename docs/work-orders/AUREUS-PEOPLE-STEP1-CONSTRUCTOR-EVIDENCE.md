# Aureus People Step 1 — Constructor Evidence

**Status:** exact-head constructor candidate; independent review not yet satisfied  
**Repository:** `Aureus1-dev/Aureus-V1`  
**PR:** #123 — Aureus People Step 1: Universal Need to Resolution  
**Frozen base:** `67e175a8eb1b46ea33bbe15b801e281611ac7751`  
**Implementation parent before this evidence-only freeze commit:** `e887d2e7c311a641d63b005c025be5a966caa983`

## Single proof

`owned StatedNeed → one PERSONAL_NEED_RESOLUTION Responsibility → truthful currently permitted route → verified resource and/or explicit accountable human attention → Responsible Continuation → explicit underlying-need outcome evidence → truthful terminal state`

## Constructor reconciliation completed

- Ported the valid OR-004 orchestration onto current shared Responsibility and Authority foundations instead of merging historical PR #113 wholesale.
- Preserved Business `BUSINESS_PROMISE` behavior and generalized Authority/Trust infrastructure.
- Added `PERSONAL_NEED_RESOLUTION` with database constraints enforcing Personal/member/no-organization/no-opportunity/GUIDANCE_ONLY/PERSONAL_PRIVATE shape.
- Added database race protection for one open Personal Need Responsibility in the existing conversation/StatedNeed V1 scope.
- Reused `StatedNeed`, verified resource matching, `ResourceOffer`, `NeedEscalation`, and safe-failure sources rather than creating a People CRM/case/ticket system.

## Constructor red-team repairs

1. **Human handoff truth:** `NeedEscalation.RESOLVED` no longer completes the underlying life need. A callback or steward handoff can finish without the member's requested outcome being achieved.
2. **Underlying outcome evidence:** added append-only `NeedOutcomeReport` in the existing Needs domain. Explicit member outcome reports remain `REPORTED` unless another independent source verifies them.
3. **No phantom humans:** no Human Steward is auto-paged; unavailable human attention is not represented as reachable, and Aureus retains the Responsibility rather than silently abandoning it.
4. **Projection consistency:** current read state and continuation use the same newest human-escalation and outcome truth.
5. **Retry identity:** repeated acceptance of the same canonical StatedNeed returns the same Responsibility even after terminal state; it does not reopen or duplicate the work.
6. **Concurrent provenance:** if concurrent acceptance collides with different StatedNeed provenance, the service fails closed rather than returning another request's Responsibility.
7. **Authority boundary:** creating a Personal Need Responsibility does not create or widen AuthorityGrants.
8. **Evidence boundary:** resource offer/acceptance, human callback, model output, notification state, and API copy do not upgrade life-outcome evidence.

## Test coverage added

- focused People resolution unit coverage;
- real-Postgres concurrent acceptance and database shape constraints;
- HTTP deny paths for unauthenticated access, foreign StatedNeed, foreign Responsibility, caller-supplied context, and authority non-escalation;
- explicit STILL_UNRESOLVED and RESOLVED outcome paths;
- REPORTED evidence preservation;
- terminal retry/no-reopen behavior;
- regressions for newer-open-vs-older-resolved human escalation history.

## Remaining gates

This document records constructor evidence only. It does not self-certify the candidate.

Before merge:

1. full exact-head CI must pass, including clean migrations, unit/integration/e2e/web/build checks;
2. exact-head Docker Build Verification must pass;
3. the exact candidate SHA must receive a fresh independent Claude review with no blocking/high finding;
4. any material repair after independent review requires a new exact-head verification/review cycle;
5. Founder separately authorizes merge.
