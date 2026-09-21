# UI-003 — Active Work Surface

**Status:** Active — repair/requalification of PR #162  
**Production impact:** Yes — member-facing Hall / Conversation Surface  
**Source PR:** #162 (`feat/ui-slice-3-active-work-surface`)  
**Reconciled base:** current `main` at repair time; exact SHA is recorded by the repair commit and CI.

## Purpose

Consolidate the member's current work presentation into one `ActiveWorkSurface` without changing the underlying Responsibility, conversation, consent, or application-guidance truth. The surface must make the real outcome and current state legible while preserving the existing execution boundaries.

## Required behavior

1. Replace the redundant `VisibleWorkSummary` and `ResponsibilityProgressCard` presentation with one Active Work Surface.
2. Preserve the real, conversation-scoped Responsibility as authoritative once durable work exists.
3. Preserve the current-exchange conversational fallback when no durable Responsibility exists; never fabricate a Responsibility, evidence, progress, or execution state.
4. Preserve the conversation/session equality guards so Responsibility state, guide sessions, Resume actions, evidence, or member prompts can never leak across conversations while a new fetch is pending.
5. Preserve the rule that an `ACTIVE` Responsibility alone does not prove Aureus is executing; live application guidance is shown only when a real guide session exists.
6. Preserve completed/exhausted truth: terminal work must not be presented as active, and `Needs you` / next-action prompts must disappear when they are no longer real.
7. Preserve `ApplicationGuidePanel` behavior and consent/outcome controls; this slice may compose it into the Active Work Surface but does not redesign its authority or execution behavior.
8. Preserve accessibility: the real outcome remains a heading, status remains text in addition to visual tone, and evidence/last activity remain keyboard- and screen-reader-accessible.

## Founder-walkthrough invariants inherited from PR #163

This work must not regress the current Hall opening or mobile navigation behavior:

- exactly one `How can we help?` opening heading;
- exactly one short supporting line: `Tell me what you want to accomplish.`;
- no restored separate front-door promise paragraph;
- current message composer wording and behavior unchanged;
- current mobile History/New clearance unchanged;
- all existing conversation and Responsibility scoping guarantees remain intact.

## Out of scope

- New Responsibility types or backend authority.
- New application-guide execution capabilities.
- New workflow files or a second release gate.
- Fabricated progress percentages, checklists, evidence, or completion states.
- Broader Hall redesign beyond the Active Work presentation.

## Living Release Gate coverage

`release-gates/manifest.json` registers UI-003 against the permanent contracts:

- `core-deployment` — automated proof that the exact web/API commit is the deployed core system and the production front door/conversation path is live.
- `browser-first-session` — automated real-browser proof for the permanent first-session/voice regression path.
- `accountable-steward-walkthrough` — required human mobile + desktop walkthrough against that same exact deployed commit. The walkthrough must include the Active Work Surface states relevant to this slice, including no-durable-work fallback, a durable Responsibility, conversation switching, Resume-required behavior, and terminal work.

These contracts do not replace CI. The repaired PR head also requires fresh Build & Test and Docker verification because all evidence from the pre-reconciliation head is invalidated.

## Acceptance evidence required before merge

- PR branch reconciled with the then-current `main` and #163 behavior preserved.
- Fresh exact-head CI passes.
- Fresh exact-head Docker verification passes.
- Living Release Gate manifest validation passes.
- Independent reviewer verifies the exact repaired head; constructor does not self-certify.
- PR remains Draft/HOLD until that independent re-review passes.
- Final production release remains HOLD until the Living Release Gate runs against the exact deployed SHA and the Accountable Steward walkthrough is recorded.
