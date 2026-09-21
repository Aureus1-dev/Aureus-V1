# LRG-001 — Living Release Gate

**Status:** Candidate implementation; independent review required before merge.

**Repository:** Aureus-V1

**Authority:** `docs/releases/steward-ready-release-standard.md`

## Founder direction

Aureus should have one durable release gate. It must carry the current work orders and every permanent regression check forward so a new release workflow is not created for every slice.

## Outcome

One unchanged GitHub workflow discovers its release obligations from a versioned registry:

`current work orders + permanent contracts → exact deployed candidate → automated evidence packet → Accountable Steward decision`

The workflow is infrastructure. Work orders contribute release contracts; they do not create replacement workflows.

## Required behavior

1. `release-gates/manifest.json` is the single active-work-order and permanent-contract registry.
2. Every active work order names its repository document and every release contract needed to accept it.
3. Every released capability regression becomes a permanent contract rather than disappearing when its work order closes.
4. The runner discovers automated contracts from the registry and executes them without workflow edits.
5. Manual contracts remain visible and required, but automation must never self-certify them.
6. The web and API each publish non-secret deployment identity. The gate compares both identities with the exact candidate commit and holds on drift.
7. One evidence packet records the active work orders, selected contracts, origins, exact commit, timestamps, individual results, and final automated result.
8. A missing work-order document, missing runner, duplicate identifier, unsafe path, unrecognized mode, invalid condition, or active work order without both automated and manual coverage fails closed in CI and in the deployed gate.

## How the next work order joins the same gate

The constructor updates `release-gates/manifest.json` to name the current work order and its contract IDs. If the slice needs a new production proof, it adds one contract descriptor under `release-gates/contracts/` and one focused runner; descriptors are discovered automatically. The constructor does not copy or replace `.github/workflows/release-gate.yml`.

When that capability ships, its regression contract moves into `permanentContractIds`. Closing a work order removes it from `activeWorkOrders`; it does not remove the permanent regression.

## Acceptance

- registry validation tests cover valid, missing, duplicate, unsafe, and under-covered work orders;
- CI validates the registry on every branch and pull request;
- the one workflow invokes the registry-driven runner;
- exact deployed web and API SHAs are proven independently;
- voice remains required by default;
- evidence is preserved even when a contract fails;
- the existing guest, Steward, voice-brokerage, and browser-continuity checks remain active;
- no merge or release is performed by this constructor work;
- exact-head CI and a fresh independent review are required before Founder merge decision.

## Explicit non-goals

- no autonomous release approval;
- no weakening of CI, the Accountable Steward walkthrough, or exact-head review;
- no claim that a work-order acceptance criterion is automated unless a contract actually proves it;
- no new member-facing product capability;
- no deployment from this work order.
