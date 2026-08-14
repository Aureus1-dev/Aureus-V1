# PF-007 Acceptance — Consented Lead and Human Handoff

Status: implementation complete; merge authorization pending.

Exact base: `4dda9c73f0aa312c02fb800e6b0e62939d38c4a1` (PF-006 merged to `main`).

## Product acceptance

- The public Ward offers human follow-up only after the visitor has asked at least one question. It does not create a lead from an empty session.
- The handoff form starts blank. Aureus does not infer or prefill a name, contact detail, project summary, location, or timing from the conversation.
- Submission requires an unchecked affirmative control and the exact server-owned `lead-handoff-v1` consent copy. The client returns the displayed copy's digest; a changed business name/copy fails and requires reload rather than storing words the visitor did not see. The stored record contains the purpose, exact text, text digest, data classes, grant time, and expiry.
- The minimum required fields are name, preferred contact method and value, and a short project summary. Location and desired timing are optional.
- The visitor is told that the transfer is for this request, is not unrelated-marketing consent, includes this Ward conversation, lasts at most 90 days, and can be deleted sooner.
- One conversation can create only one idempotent handoff. A materially different retry fails instead of silently replacing the visitor's consented request.
- Qualification is a visible list of visitor-supplied facts and a system conversation-turn count. There is no lead score, hidden fit ranking, inferred trait, or persuasion state.
- Automatic assignment chooses an active `OWNER`, `ADMIN`, `MANAGER`, or `OPERATOR` within the same tenant, preferring the configured escalation email. A composite database foreign key rejects cross-tenant assignment.
- The assignee receives the existing preference-respecting organization notification. Its body contains no visitor name, contact detail, project text, or other lead PII. The lead remains in the business queue if notification delivery is skipped or fails.
- Authenticated tenant members can read their tenant's active handoffs and attributed conversations. Authorized operating roles can reassign and record the constrained human lifecycle: submitted → accepted → contacted → closed, with loss allowed only after acceptance.
- Closing or losing a handoff requires a factual outcome reason. Each assignment and state change has an append-only, tenant-scoped event; the event deliberately excludes contact PII.
- A non-member receives the same not-found response as a missing tenant. Lead lookups and assignments remain tenant-scoped in application queries and database relationships.
- The visitor sees a clear receipt, current human handoff status, preferred contact method, and scheduled deletion date. Internal assignee identity and business outcome reasons are not exposed publicly.
- While the handoff exists, the attributed Ward conversation is retained for the same bounded period and cannot continue accepting Ward messages. The ordinary conversation bearer still expires after 24 hours.
- The original bearer can be used after read expiry only on the deletion-only route. That route grants no conversation read and deletes the conversation, lead, events, messages, citations, and associated provider-ledger rows through database cascades.
- An hourly purge removes handoffs and attributed conversations at the 90-day boundary. Paused businesses still permit a bearer-authorized deletion request.
- The visitor interface remains inline, mobile-first, keyboard usable, screen-reader labeled, and free of an account gate or blocking overlay.

## Verification record

- Focused API Ward and adversarial lead suites: 19 tests passed.
- Focused web Ward consent, deletion, and accessibility suite: 5 tests passed.
- Full web suite: 138 suites and 769 tests passed.
- The full API command passed 122 suites and 1,177 tests; its 24 environment-dependent E2E/integration suites were blocked by this workspace's missing test `DATABASE_URL`/`JWT_ACCESS_SECRET` and unmigrated PostgreSQL service. Those suites remain required in GitHub Actions.
- API production TypeScript build passed.
- Web type checking and production build passed; the build retains one pre-existing unused `_model` warning in the voice client.
- Prisma schema formatted, generated, and validated locally.
- All three workspace type checks passed; Product Contract v1 validation passed all 8 schemas and 6 deny-path cases.
- `git diff --check` passed.
- Lint passed with only the pre-existing unused `_model` voice-client warning.
- Migration application, environment-dependent API suites, Docker builds, and release checks remain required GitHub Actions gates on the draft PR. This workspace has no configured PostgreSQL test service or container runtime.

## Rollback

Pause each published Ward to stop new conversations and handoffs immediately. If code rollback is required, revert the PF-007 application commit; leave the additive enums and tables dormant until a separately reviewed cleanup is authorized. Existing consented records must still follow their deletion schedule or be removed through the deletion path.

## Explicit successor

PF-008 builds the business console UI over these tenant-scoped lead APIs: inbox/pipeline, attributed conversation and sources, owner and next action, outcome view, operational configuration, knowledge freshness, provider health/spend, and correction/export paths. PF-007 does not claim that full console experience.
