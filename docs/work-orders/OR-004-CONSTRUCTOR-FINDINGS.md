# OR-004 — Constructor Findings Ledger

Builder: ChatGPT  
Reviewer: Claude (not yet engaged)  
Base: `e9cc3672269d37227f9dc35f509157f97460538f`

This ledger records findings discovered by the constructor before independent review. A constructor finding is not independent assurance.

## C1 — Do not build a second People case database

**Finding:** Repository inspection found `StatedNeed`, verified City Sheet matching, `ResourceOffer`, `NeedEscalation`, and `UnresolvedNeed` already model the source-domain facts OR-004 needs.

**Resolution:** No `ResolutionPlan`, `ResolutionRoute`, case, ticket, or duplicate need table was added. Responsibility owns the durable promise/status/evidence; the resolution path is computed from existing source records.

## C2 — Resource acceptance is not outcome completion

**Finding:** Treating `ResourceOffer.ACCEPTED` as success would recreate the same false-completion problem OR-002 explicitly avoids for applications.

**Resolution:** Accepted resource routes transition to `WAITING_ON_THIRD_PARTY`. They never complete the Responsibility by themselves.

## C3 — Human escalation remains member-chosen

**Finding:** Existing Gate C policy deliberately forbids automatic human paging.

**Resolution:** OR-004 may surface Human Steward as the next route, but only `POST /people/resolutions/:id/human-steward` calls the existing escalation service.

## C4 — “No resource exists” differs from “member declined all current resources”

**Finding:** Existing `checkSafeFailure()` returns false whenever a verified resource exists, even when every currently verified route has already been declined. Inferring human reachability from that false result would be incorrect.

**Resolution:** `NeedsService.isHumanStewardReachable()` exposes the same existing reachability check. OR-004 distinguishes:
- zero currently verified resources + no human → real `UnresolvedNeed` evidence;
- current verified resources all declined + no human → real declined `ResourceOffer` evidence;
- human reachable → member may explicitly request the human route.

## C5 — Safe-failure evidence needs a stable source reference

**Finding:** `SafeFailureResponseDto` previously proved a real `UnresolvedNeed` existed but did not expose its opaque ID to internal orchestration.

**Resolution:** Added `recordId` only; no need content/internal reasoning was added. Responsibility can now reference the actual source row rather than manufacture evidence.

## C6 — Schema edit tooling must not become product infrastructure

**Finding:** The connector can replace files but cannot safely apply a one-line patch to the large Prisma schema without rewriting the whole file.

**Resolution:** A branch-only GitHub Actions helper performed one asserted string replacement, committed the schema enum addition, and was immediately deleted. It never touched main, secrets, deployments, or merge authority and is not part of the candidate product.

## Current verification state

- Prisma generation: observed green on normal CI after schema update.
- Typecheck: observed green on normal CI after schema update.
- Lint/migrations/tests/build/Docker: pending current-head evidence.
- Independent Claude review: **not started**.
- Merge/deploy: **not authorized**.
