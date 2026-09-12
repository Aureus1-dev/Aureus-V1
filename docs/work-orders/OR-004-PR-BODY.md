## Purpose

Turn an ordinary member-stated life need into one durable Personal Responsibility that Aureus can carry across verified resources and human handoffs without creating a second CRM, case-management system, or duplicate People database.

## First proof

`member-stated need → existing owned StatedNeed → explicit Aureus acceptance → PERSONAL_NEED_RESOLUTION Responsibility → verified resource route → member choice → Responsible Continuation → explicit Human Steward route when requested/reachable → source-domain evidence → truthful COMPLETED or RESPONSIBLY_EXHAUSTED`

## Reuse

This PR deliberately reuses:

- OR-001 Responsibility / ResponsibilityEvent;
- OR-002 status/evidence discipline;
- existing StatedNeed and conversation provenance;
- verified City Sheet matching;
- ResourceOffer history and member responses;
- NeedEscalation and its explicit member-choice boundary;
- UnresolvedNeed safe-failure evidence.

It does **not** create ResolutionPlan/ResolutionRoute/Case/Ticket tables or a generic workflow engine.

## Product rules

- the route is not the Responsibility;
- resource OFFERED/ACCEPTED is not outcome completion;
- Human Steward is never auto-paged;
- resolved human escalation is REPORTED evidence, not automatically independent verification;
- Responsible Continuation cannot bypass authority, privacy, verification, consent, or member decline;
- one open Personal Need Responsibility per member/conversation;
- terminal work is not reopened by GET/retry.

## Authority / privacy

`PERSONAL_NEED_RESOLUTION` is DB- and server-constrained to:

- PERSONAL context;
- authenticated member Principal;
- PERSONAL_PRIVATE privacy;
- GUIDANCE_ONLY authority;
- no organization principal;
- no Business/shared transition;
- no Opportunity provenance.

## Builder / reviewer separation

- **Builder:** ChatGPT
- **Independent critic:** Claude, reserved until the exact candidate SHA is frozen and constructor gates are green
- **Merge authority:** Founder only

Claude has not reviewed this candidate yet.

## Base

Exact starting main: `e9cc3672269d37227f9dc35f509157f97460538f`

## Current status

**CONSTRUCTION — draft only.**

Prisma generation and TypeScript typecheck have already been observed green on an intermediate normal-CI head after the schema/runtime wiring. Final exact-head migration, lint, unit/integration/e2e, web, build, Docker, and independent-review evidence are not yet frozen.

No merge or deployment is authorized by this PR.
