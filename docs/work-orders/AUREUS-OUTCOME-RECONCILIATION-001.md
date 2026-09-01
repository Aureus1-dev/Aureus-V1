# AUREUS-OUTCOME-RECONCILIATION-001 — Preserve, Reconcile, and Sequence Aureus V2

**Status:** Architecture reconciliation candidate  
**Founder approval:** 2026-08-30 — approved the proposed Aureus outcome/responsibility architecture and authorized build continuation  
**Repository:** Aureus-V1  
**Original base:** `68232e91485d8b8a802712afc301e2d24515ff1b`  
**Current review base:** `a43375b85de2dd6424e124c9aed79c4b4b77f2ab`  
**Branch:** `docs/aureus-outcome-architecture-v2`  
**Architecture:** `docs/product-architecture/PA-021-outcome-and-responsibility-architecture.md`

## 1. Objective

Reconcile the already-built Aureus product with PA-021 without discarding working product, duplicating sources of truth, or turning the redesign into a rewrite.

The output of this work order is an exact migration map and ordered experience-slice build sequence.

No production behavior changes in this work order.

## 2. Governing build rule

For every existing capability, classify it as exactly one of:

- **KEEP** — already correct and reusable.
- **UPGRADE** — sound foundation; extend or reframe.
- **MERGE** — duplicate/adjacent concepts should become one composition boundary.
- **REPLACE** — current behavior conflicts with the approved experience.
- **ADD** — genuinely missing primitive.

Prefer reuse over new persistence. Before adding a new model/table/service, prove that existing `Journey`, `Goal`, `Task`, conversation, consent, opportunity, organization, business lead/handoff, knowledge, or connected-experience state cannot safely carry the needed semantics.

## 3. Current foundation map

### KEEP

| Existing capability | Why it survives |
|---|---|
| Auth/users/member identity | Required identity and permission foundation. |
| Organization + tenant boundaries | Required Business isolation and authority context. |
| Conversation persistence | Durable conversation history remains useful; transcript is not the primary work object. |
| Consent domain | Required for bounded authority, privacy, screen guidance, lead capture, and later completion cases. |
| Opportunity domain + verified link registry | Existing verified/active fail-closed action path remains the trusted source for actionable opportunities. |
| Business knowledge workspace | Remains the tenant-owned grounded knowledge source. |
| Public business conversation route | Remains the account-free entry surface; public identity shifts toward one Aureus, not a separate character architecture. |
| Communication/phone/SMS continuity scaffolding | Becomes channel continuity for one Aureus relationship. |
| Existing provider-neutral AI request layer | Reused rather than replaced by a new model stack. |
| See → Guide consent/safety boundary | Becomes a human-required-step primitive; must remain bounded and non-actuating until separately approved. |
| Library governance boundary | Durable institutional knowledge remains separate from runtime/product state. |
| Foundry producer/reviewer/evidence/evaluation architecture | Remains the governed learning/evaluation factory; not forced into the live request path prematurely. |

### UPGRADE

| Existing capability | Upgrade |
|---|---|
| Hall/conversation UI | From conversation display to conversation-as-home with adaptive visible work. PR #106 is an aligned precursor, not the full responsibility architecture. |
| Journey/Goal/Task | Evaluate as the first reusable substrate for responsibility objectives, milestones, commitments, dependencies, and completion before adding competing models. |
| Needs | Reframe as intent/problem signals feeding outcome understanding, not a separate place the user must navigate. |
| Opportunities | Expand from catalog/action discovery toward opportunity leverage within a responsibility; retain verification/source rules. |
| Public Ward | Ward becomes an internal sales/Business role; the human-facing conversational identity is Aureus. |
| Lead + handoff | Expand toward Ready Project + outcome/completion chain while preserving explicit consent and tenant boundaries. |
| Business console | Evolve from CRM-like inbox toward “what Aureus handled / what needs you / what is blocked / verified outcomes.” |
| Member experience | Evolve from module/dashboard navigation toward ongoing conversation + carried responsibilities. |
| Voice | Same Aureus, same work state, same permissions; voice is a channel, not a separate product. |
| Connected experiences | Expand into system/capability stewardship and cross-system continuation. |
| Outcome/feedback contracts | Expand into canonical outcome events and value/evidence joins. |

### MERGE / COMPOSE BEFORE DUPLICATING

These concepts may remain separate implementation modules, but their user-facing semantics should compose into one responsibility layer:

- Goal + Journey + Task + Milestone → objective / plan / commitment / progress.
- Need + Opportunity + Resource → intent / leverage / available path.
- Conversation + Communication + Connected Experience → one ongoing Aureus relationship across channels.
- Lead + project intake + handoff + business operations → Ready Project and revenue responsibility stages.
- Foundry outcome/evidence + V1 runtime outcome data → shared versioned learning/event contract, not shared persistence.

### REPLACE

| Current/legacy assumption | Replacement |
|---|---|
| Module-first user navigation as the main mental model | Outcome-first conversation with adaptive work surfaces. |
| Transcript as the primary continuity object | Durable responsibility/work state; transcript remains history/evidence. |
| Separate public AI identities for each function | One public Aureus; specialized roles remain internal. |
| Generic “create an Aureus account / let Aureus remember you” conversion inside a client website | Business continuity first; personal Aureus continuation emerges only when the person explicitly asks Aureus to carry separate work. |
| “Here are steps/links” as successful help | Help-to-completion where authority and capability permit. |
| Build proprietary replacement software by default | Use/teach/configure/wrap/connect/automate/consolidate before replacement; replace only on demonstrated net benefit. |
| Large task dashboards handed to the user | Aureus absorbs work and surfaces only required decisions/actions. |

### ADD

The following primitives are not yet proven as complete product capabilities and require explicit design/implementation:

1. **Responsibility contract** — objective, party/context, success criteria, authority envelope, privacy envelope, state, plan, commitments, dependencies, evidence, outcome.
2. **Commitment semantics** — Aureus-owned accepted work that cannot silently disappear.
3. **Completion evidence** — domain-appropriate proof before a responsibility/action is called complete.
4. **Adaptive work-surface contract** — structured server-owned work payloads that the Hall/business surface can render without exposing model chain-of-thought or raw untrusted tool arguments.
5. **Capability/System Steward registry** — capability-before-tool representation and USE/TEACH/CONFIGURE/WRAP/CONNECT/AUTOMATE/CONSOLIDATE/REPLACE/BUILD/REMOVE decisions.
6. **Canonical external-system mapping** — vendor events mapped into Aureus concepts with source provenance.
7. **Outcome Graph event model** — intent → action → system/resource → intermediate result → outcome/value.
8. **Value Ledger** — attributable value/evidence without reducing flourishing to a single score.
9. **Learning Fabric contract** — privacy-scoped events and evaluation candidates; no silent live self-modification.
10. **Ready Project** — Kitchen & Bath distilled project state and unresolved expert decisions, separate from raw transcript.
11. **Completion Case transition** — business-context work may become personal Aureus work only after explicit user request and correct data-boundary split.

12. **Responsibility Passport** — machine-readable responsibility, authority, privacy, resource, budget/freshness, and evidence envelope.
13. **Authority/Policy Gateway** — non-model enforcement for every consequential action; denial cannot be reinterpreted by a model.
14. **Responsible Continuation** — preserve the underlying Responsibility and select an authorized alternative when a route fails, is denied, or is unavailable.
15. **Independent Execution Assurance** — executor evidence is necessary but cannot self-certify important completion.
16. **Hospitality and service-recovery standard** — one coherent Aureus relationship, prepared handoffs, ownership, proven repair, and privacy-safe continuous plussing.

## 4. Hard boundaries

This reconciliation does not authorize:

- rewriting the database before reuse analysis;
- autonomous consequential sales closing;
- browser/computer control;
- credential, SSN, bank, card, signature, attestation, or terms actions by Aureus;
- cross-tenant or business-private → personal data transfer;
- personal-private → business data transfer without explicit authority;
- replacing Salesforce/HubSpot/Buildertrend/QuickBooks/etc. merely for product ownership;
- live Foundry dependency before Foundry production blockers are closed;
- Library canonical admission by code/tooling alone;
- affiliate/commercial ranking influence;
- deploy/merge without the existing human gates.
- treating Make.com, a model, a tool response, or executor self-report as Aureus authority or independent completion proof;
- abandoning an accepted Responsibility merely because the first route failed when an authorized continuation exists;

## 5. Ordered implementation slices after reconciliation

### Slice 0 — One Aureus / living conversation
Use the current living-conversation work as the precursor. Preserve its hard scope. Do not expand PR #106 into PA-021 implementation.

Acceptance: conversation feels like one Aureus and useful work remains visible without transcript-first UI.

### Slice 1 — Responsibility Core, reuse-first
Prove whether existing Journey/Goal/Task/Milestone state can carry the minimum responsibility semantics.

Minimum vertical slice:

`intent → accepted bounded responsibility → current state → one Aureus commitment → human-needed marker → completion evidence → terminal outcome`

No generalized workflow-builder UI.

### Slice 2 — People help-to-completion proof
Use a real verified opportunity/help flow already present in V1.

`conversation → verified opportunity → “help me finish this” → carried responsibility → See/Guide where needed → return/resume → verified outcome`

This is the first proof that transferable conversation becomes transferable work.

### Slice 3 — Kitchen & Bath Ready Project
Upgrade current Ward/lead/vertical-pack behavior into:

`fuzzy intent → conversational discovery → visual/project state → Ready Project → business needs-you surface`

Do not require CRM replacement.

### Slice 4 — Revenue completion
Extend Ready Project through the existing business path:

`Ready Project → validation → proposal → follow-up → decision → contract/deposit boundary → operations handoff → outcome`

Autonomy is authority-tiered; human approval remains where required.

### Slice 5 — External system stewardship
Introduce one real adapter pattern using an existing connected system or representative integration:

`outcome intent → Aureus canonical action → external system → evidence/result → canonical outcome event`

Prove USE/WRAP/CONNECT before native replacement.

### Slice 6 — Opportunity + counterfactual leverage
Make opportunity search a responsibility behavior in both People and Business contexts.

### Slice 7 — Outcome Graph + Value Ledger + learning candidate
Join runtime events into attributable outcome evidence; send only governed learning/evaluation candidates to Foundry.

### Slice 8 — Founder golden walkthrough
One exact deployed SHA must pass:

- Kitchen & Bath customer journey.
- Business-owner “what needs me?” journey.
- People help-to-completion journey.
- Employee/system-orchestration journey.
- voice/text continuity and mobile acceptance where in scope.

## 6. Builder/reviewer roles

- **Founder:** product truth, irreversible approvals, real-world walkthrough.
- **ChatGPT:** lead integrator/constructor; cannot self-certify.
- **Claude:** independent adversarial reviewer first; may perform bounded repair only after findings are frozen and must not certify its own repair.
- **CI:** mechanical evidence only.
- **Gemini:** visual/mobile evaluator when appropriate; not an independent Steward.
- **Foundry:** build/evaluation factory and later runtime intelligence service only after its production blockers close.

## 7. Reconciliation acceptance

This work order is complete when:

- PA-021 exists as the explicit candidate higher-level architecture;
- every major existing product capability is classified KEEP/UPGRADE/MERGE/REPLACE/ADD;
- no current active PR is silently scope-expanded;
- an ordered successor-slice sequence exists;
- the current repository truth is recorded accurately;
- Claude receives an independent architecture-review packet;
- unresolved architecture/governance conflicts are visible rather than guessed;
- exact-head CI passes for the docs-only candidate.

## 8. Repository truth and reconciliation

### At creation

- Aureus-V1 main: `68232e91485d8b8a802712afc301e2d24515ff1b` — CI success run `33327836951`.
- Aureus-Library main: `ea9887c50550e466411742c3f3fc53a3de7f264f`.
- Aureus-Foundry main: `e6c0a4558145c6f00d5e7734be95af08daf8241a`.

### Current reconciliation — after PR #106 merge

- Aureus-V1 PR #103 remains closed unmerged as superseded.
- Aureus-V1 PR #106 was independently reviewed at exact head `3e238328e22f4495b36a2edf3e161930c6f5db54` with no blocking findings and merged. Current V1 `main` is `a43375b85de2dd6424e124c9aed79c4b4b77f2ab`.
- Aureus-V1 PR #107 is the architecture/reconciliation candidate. Its branch has been synchronized with current `main`; fresh exact-head CI and a separate independent architecture review are required after these repository-truth repairs.
- Aureus-Foundry PR #7 current head is `14e24c758780e2272cb443664f6e8e14bea37822`; exact-head Foundry CI run `33451635553` succeeded. The active reviewer path is Claude Pro/Claude Code; Anthropic-API automation is optional and is not a dependency.
- Aureus-Library `main` remains `ea9887c50550e466411742c3f3fc53a3de7f264f`.
- The operational bridge remains provider-neutral GitHub evidence plus governed Claude Pro/Claude Code review. Make.com may route evidence and state, but it is not Aureus intelligence or authority.

## 9. Next action

Fresh exact-head CI and independent review of this repaired reconciliation from the Founder requirement and current repository state, then return for explicit Founder merge approval at the exact reviewed SHA.

Implementation Slice 1 starts on a fresh branch from the then-current `main`; it does not piggyback on this docs branch.
