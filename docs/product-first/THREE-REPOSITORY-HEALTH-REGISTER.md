# Three-Repository Health Register

**Audit date:** 2026-08-13  
**Audit basis:** exact default-branch SHAs, repository trees, current open PRs, current workflows, production configuration, and principal runtime/knowledge contracts.

## 1. Exact baseline

| Repository | Default branch SHA | Files | Latest main workflow | Open PR disposition |
|---|---|---:|---|---|
| Aureus-V1 | `ae43a844581e572ad5fa0752f562002e3b152f6b` | 2,253 | CI passed at exact SHA | PR #73 is constitutional closure work and is deferred by the product-first direction |
| Aureus-Foundry | `0b90f3a9dd8ea079634f5eb43e57fbca1d63e2d5` | 61 | Foundry CI passed at exact SHA | None |
| Aureus-Library | `e42f3dab006f37fa6942da5206cc82534e1d22ec` | 98 | Library validation passed at exact SHA | PR #8 is stale against current main and must not merge as written |

Branches are not a merge queue. V1 has many preserved historical implementation branches, Foundry has three unmerged Dependabot branches, and Library has preserved working branches. Only an open, reviewed PR against current main may enter a merge order.

## 2. Aureus-V1

### Healthy

- The monorepo has a real Next.js frontend, NestJS API, PostgreSQL schema, Redis option, migrations, tests, Dockerfiles, Render configuration, environment validation, health endpoints, and a production release canary.
- Main is green at the exact audited SHA.
- CI covers dependency audit, Prisma generation, type checking, lint, migrations, API unit/integration/e2e tests, web tests, production builds, both Docker images, and container liveness/readiness.
- Guest help-first entry, Hall continuity, current OpenAI Realtime WebRTC endpoint, voice brokerage, provider resilience, budgets, moderation, verified-only resource behavior, and release-gate protections have been merged.
- The backend includes organizations, representatives, conversations, consent, needs, resources, opportunities, voice, orchestration, institutional memory, stewardship, Academy, communication, and operational health domains.

### Incorrect or stale

- The root README still names the First Members launch track as the sole active execution track.
- The launch scoreboard was last updated 2026-07-27 and contains historical voice-test failures and readiness statements superseded by later merges and current green CI.
- `.env.example` advertises the obsolete Realtime defaults `gpt-4o-realtime-preview` and `alloy`, while the current production runbook and implementation require `gpt-realtime` and `marin`.
- A successful exact-deployment canary tied to current public origins is not yet recorded. Repository CI proves buildability, not current Render deployment identity or complete live usability.

### Product gaps

The existing “Business Portal” is an organization-profile and representative-membership backend. It is not yet the Business Steward product.

Missing:

- business-facing web console;
- explicit tenant boundary on conversations, knowledge, leads, and handoffs;
- business onboarding and configuration;
- approved business knowledge ingestion and retrieval;
- public tenant-specific Ward experience;
- consented lead model and lifecycle;
- assignment and human handoff;
- conversation-to-lead continuity;
- business pipeline and outcome view;
- tenant-specific policies, hours, services, service areas, pricing boundaries, and escalation targets;
- integration with Foundry and Library;
- billing/plan enforcement for the commercial offer;
- business-specific observability and operational support.

### Health judgment

- Repository engineering health: **strong**
- Member/public product baseline: **functional but not walkthrough-certified**
- Business product readiness: **foundation only**
- Production operations: **credible single-instance pilot, not mature operations**

## 3. Aureus-Foundry

### Healthy

- Main contains a coherent offline governed baseline rather than a placeholder.
- Tenant-scoped persistence, idempotency, audit events, consequence classification, data classification, routing, cost ceilings, retries, circuit breaking, kill switches, review checkpoints, scoped approval, outcomes, feedback, correction candidates, replay, and recovery are implemented and tested.
- Red-consequence approval is bound to tenant, plan, action, policy, nonce, expiry, and role.
- Library integration is read-only and revision-pinned.
- Learning data cannot mutate live policy, prompts, routing, or thresholds.

### Production blockers

- Provider adapters are deterministic mocks; no live provider is claimed.
- The HTTP API trusts caller-provided identity headers and has no production authentication boundary.
- Approval is currently Founder-role-specific rather than integrated with V1's operational role and permission model.
- SQLite is a single-node baseline and not suitable as the unexamined production persistence choice.
- Library integration reads synthetic fixtures, not an approved Library release service or vendored release.
- There is no deployed service, secrets/key-management plan, production queue, distributed concurrency model, retention/export/deletion integration, or real-provider quality/latency evaluation.
- Foundry is not called by V1.

### Health judgment

- Internal architecture: **good offline baseline**
- Production readiness: **not production-ready**
- Cross-repository usefulness today: **not connected**

## 4. Aureus-Library

### Healthy

- Main contains 31 admitted, supported Knowledge Objects with contiguous identifiers.
- Validation covers schema, ledger integrity, relationship targets, supersession reciprocity, candidate authority fabrication, and generated views.
- Retrieval Contract v1 is implemented as a read-only local Python API/CLI.
- Founder-ready release evidence and the CAP-015 direction are admitted as objects 31 and 30.
- Main validation is green at the exact audited SHA.

### Incorrect or stale

- The README and several architecture documents still present Bootstrap-era current-state language even though Layer 3 is open and 31 objects are admitted.
- Open PR #8 correctly attempted release manifests, Retrieval v2, access policy, consumer pins, and conformance, but it is based on `a57ff527…`, contains only 29 objects, and pins a pre-current corpus. Main now has objects 30 and 31.
- PR #8 therefore must not merge merely because GitHub reports it mergeable.

### Product gaps

- No production retrieval service or package is consumed by V1 or Foundry.
- No current release manifest covers the 31-object main corpus.
- No approved access/entitlement implementation exists beyond public-only reference behavior.
- The corpus is overwhelmingly constitutional and institutional. It does not yet contain the business knowledge needed for a kitchen-and-bath Steward: services, qualification boundaries, geography, pricing rules, policies, FAQs, escalation rules, source evidence, and freshness schedules.
- There is no automated candidate path from observed product outcomes into governed human review.

### Health judgment

- Integrity/governance tooling: **strong**
- Current-state presentation: **stale**
- Runtime consumption: **not connected**
- Business-product knowledge coverage: **not started**

## 5. Cross-repository system

The repository boundaries are conceptually correct but operationally disconnected.

| Contract | Current reality | Required product state |
|---|---|---|
| V1 → Foundry | No runtime call | Authenticated, tenant-bound, time/budget-bounded work request and attributable result |
| Foundry → Library | Synthetic fixture reader | Exact approved release and revision pins; fail closed on drift or integrity failure |
| V1 → Library | No runtime consumption | Read-only approved business/member knowledge retrieval with access filtering |
| Outcomes → Foundry | Separate V1/Foundry records | Versioned outcome/feedback event without raw unnecessary personal data |
| Foundry → Library candidate | Local authority-none proposal only | Governed candidate package; never direct admission |
| Release evidence | Per-repository CI | One manifest recording all three SHAs, contract versions, deployment identity, automated gates, and Founder walkthrough |

### Overall judgment

The three repositories are not corrupt and do not require wholesale replacement. The architecture should be extended, not restarted. The principal problem is **convergence**: stale execution truth, no cross-repository contracts in use, and no complete business vertical.

## 6. Immediate dispositions

- Preserve all merged safeguards.
- Defer and close V1 PR #73 without deleting its branch or record.
- Do not merge Library PR #8; supersede it with a current-main product-consumer PR.
- Do not merge Dependabot branches without PRs and passing review.
- Do not delete historical branches during product construction.
- Use V1 as the product program's execution home.
- Make every subsequent work order end in one draft PR with exact acceptance evidence and an explicit next PR.

