# Steward-Ready Release Evidence Standard

**Status:** Approved operating standard, effective 2026-08-11.

## Rule

No Aureus build may be offered to any person outside the internal-only test boundary until the exact deployed candidate has passed every automated gate below and the accountable steward has completed and recorded the human walkthrough. A green build is necessary evidence; it is not release approval.

## Required evidence

Every release candidate must have one evidence packet tied to one immutable commit and one deployed URL. The packet must record:

1. the commit SHA, web origin, API origin, deployment identifier, and test timestamp;
2. dependency audit, type checks, lint, unit, integration, API end-to-end, web tests, production builds, migrations, and container health;
3. deployed API liveness and database readiness;
4. a real deployed guest or test-account journey that creates a conversation and receives a non-placeholder Steward response;
5. a real deployed voice brokerage check for every enabled provider, plus the real-device microphone matrix before voice is released;
6. every destination advertised in the Hall index opening successfully with no placeholder, dead-end, false capability, or unexplained error;
7. the critical intent matrix: urgent safety language, rent/money help, employment, documents, permissions, account lifecycle, retry paths, and safe failure;
8. desktop and mobile checks, keyboard-only operation, reduced motion, screen-reader labels, permission denial, slow network, provider outage, and expired session;
9. Accountable steward walkthrough result, defects found, fixes made, retest evidence, and explicit accountable steward decision: `HOLD` or `RELEASE`.

Screenshots are supporting evidence only. The gate requires assertions against behavior and data, not screenshots alone.

## Blocking rules

A release is automatically `HOLD` when any of the following is true:

- the deployed web origin or API origin is missing, confused, or points to the wrong service;
- either health endpoint fails or cold-start behavior exceeds the recorded operating threshold;
- signup, login, guest entry, conversation, voice, or a required business journey fails;
- a provider silently falls back to a stub, a credential is missing, or the configured model cannot complete a live canary;
- an advertised destination is unfinished, misleading, inaccessible, or stuck in loading;
- a high/critical security finding is unresolved;
- evidence belongs to a different commit or deployment than the candidate under review;
- a known release-blocking defect is waived without a written accountable steward decision.

Retries may distinguish a transient incident from a deterministic defect, but a retry never erases the first failure from the evidence packet.

## Triple-check sequence

1. **Build check:** CI proves code, schema, tests, containers, and provider configuration.
2. **Deployed-system check:** the release gate probes the exact web/API deployment and performs real external-provider canaries.
3. **Accountable steward check:** the accountable steward completes the same critical journeys as a human, records results, and is the only release authority during the internal-only pilot.

No step may substitute for another.

## Accountable steward walkthrough minimum

The accountable steward must personally verify:

- first arrival, guest continuity, registration, verification, login, logout, password reset, and expired-session recovery;
- “How can we help?” by text, including rent/money help and an ambiguous request;
- voice start, microphone permission, listening, response, interruption, mute, transcript continuity, denial recovery, and provider failure;
- every Hall-index destination and every visible primary action;
- upload, download, delete/revoke, approval, retry, and cancellation wherever shown;
- mobile layout, keyboard-only use, reduced motion, and one screen-reader pass;
- exact wording of every promise, error, empty state, and “coming soon” state.

The accountable steward signs only after every blocker is fixed and the exact deployment is retested.

## Recurrence

This standard applies to every production release, provider/model change, authentication change, schema migration, permission change, and re-enabling of a previously gated surface. Any defect found by the accountable steward becomes a permanent automated regression test whenever technically possible and a permanent manual checklist item when it is not.
