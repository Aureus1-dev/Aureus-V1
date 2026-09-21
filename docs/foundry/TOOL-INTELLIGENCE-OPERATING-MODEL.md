# Tool Intelligence Operating Model

**Status:** Proposed companion to `EXECUTIVE-INTELLIGENCE-STANDARD.md` and `JUST-IN-TIME-INTELLIGENCE.md`  
**Principle:** Tool discovery is continuous at the surface; tool mastery is deep at the moment of use.

## Governance inheritance

This document is a Foundry/AI tool-intelligence operating model. It does **not** create a parallel executive organization, decision lifecycle, leadership doctrine, or permanent decision register.

It inherits from and operates in service of:

- [EOS-001 — Executive Operating System](founders-office/EOS-001-executive-operating-system.md), which remains the organizational/accountability model for Aureus executive offices;
- [EDP-001 — Executive Decision Protocol](founders-office/EDP-001-executive-decision-protocol.md), which remains the authoritative lifecycle for significant Founder’s Office decisions;
- [FDR-001 — Founder Decision Register](founders-office/FDR-001-founder-decision-register.md), which remains the authoritative permanent record for significant decisions, rationale, assumptions, risks, implementation, expected outcomes, actual outcomes, and institutional learning;
- [FOD-001 — Founder Operating Doctrine](founders-office/FOD-001-founder-operating-doctrine.md), which remains the leadership/stewardship doctrine;
- [Executive Intelligence Standard](EXECUTIVE-INTELLIGENCE-STANDARD.md) and [Just-in-Time Intelligence Operating Rule](JUST-IN-TIME-INTELLIGENCE.md), which define the supporting Foundry/AI intelligence layer and its demand-driven research posture.

Tool signals, evaluations, benchmarks, and recommendations are inputs to accountable offices and decision owners. When a tool choice becomes a significant Founder’s Office decision, EDP-001 governs the decision lifecycle and FDR-001 receives the authoritative final decision record and later outcome review.

## 1. Why tools are a special case

Most knowledge can be researched when a known question appears. Tools are different because a new capability can create a question Aureus did not previously know to ask.

A new model, API, workflow, editing feature, agent runtime, browser capability, integration, or price change may:

- make a previously impossible task possible;
- collapse several workflow steps into one;
- materially reduce cost or latency;
- increase quality enough to change a product decision;
- remove a need to build something ourselves;
- create a new product surface;
- invalidate an existing vendor or architecture choice;
- create a new privacy, safety, reliability, licensing, or lock-in risk.

Therefore, tool intelligence receives a narrow exception from purely just-in-time research.

## 2. The operating model

```text
CONTINUOUS, LIGHTWEIGHT HORIZON SCAN
    -> detect capability / price / API / policy / roadmap changes
    -> store a small Change Signal
    -> ask: could this matter to Aureus?
        |
        +-- no / unclear -> retain pointer cheaply; no deep work
        |
        +-- yes -> targeted capability triage
                    -> does it unlock, replace, improve, or threaten active work?
                        |
                        +-- no -> watchlist / pointer only
                        |
                        +-- yes -> focused evaluation
                                    -> task-specific test
                                    -> adoption / rejection / defer recommendation
                                    -> accountable decision when required
                                    -> actual-use evidence
                                    -> durable lesson
```

This avoids two bad extremes:

- **blind on-demand only:** Aureus misses capabilities it never knew existed;
- **constant exhaustive benchmarking:** Aureus wastes time and money testing tools with no practical use.

## 3. Layer 1 — Continuous horizon scan

The scan should be broad but cheap.

Prefer machine-readable or low-cost official signals:

- vendor release notes / changelogs;
- model cards and capability pages;
- API changelogs;
- pricing changes;
- deprecation notices;
- official product announcements;
- SDK and integration releases;
- security advisories;
- licensing / terms changes;
- standards / protocol changes;
- major open-source releases;
- credible conference / roadmap announcements;
- important research prototypes that plausibly foreshadow near-term capability.

The scan does **not** produce a full report by default.

It creates a compact `ToolChangeSignal`:

- provider / tool;
- date detected;
- source / provenance;
- change type;
- one-sentence capability delta;
- affected Aureus domain(s), if obvious;
- status: `NEW | TRIAGED | WATCH | EVALUATE | ADOPTED | REJECTED | SUPERSEDED`;
- confidence / maturity: `RELEASED | PREVIEW | ANNOUNCED | RESEARCH_SIGNAL`;
- urgency when applicable, especially deprecations / security / breaking changes.

A `ToolChangeSignal` is intelligence, not authority. It does not by itself authorize a tool adoption, migration, policy change, or executive decision.

## 4. Layer 2 — Capability triage

A new signal gets deeper attention only when it crosses a relevance threshold.

Ask:

1. Does this unlock something Aureus currently cannot do?
2. Does it materially improve an active capability?
3. Could it replace multiple tools or workflow steps?
4. Could it reduce cost, latency, failure, or human burden enough to matter?
5. Does it change a current build-versus-integrate decision?
6. Does it affect a dependency already in production?
7. Does it create a new risk, deprecation, or migration obligation?
8. Does it create an opportunity we would not otherwise have considered?

If all answers are effectively no, keep the pointer and move on.

## 5. Layer 3 — Active-tool mastery

When Aureus actually uses a tool, passive awareness is no longer enough.

For every **active** tool, Aureus should understand how to use it well.

At first meaningful use, and again after material changes:

- read the authoritative documentation relevant to our use case;
- inspect advanced / less-obvious capabilities;
- understand parameters, limits, defaults, and failure modes;
- inspect official examples and recommended patterns;
- study credible practitioner workflows where they add practical knowledge;
- test the features that matter to our real workload;
- identify common mistakes and expensive usage patterns;
- measure quality, latency, reliability, and cost for our task;
- understand privacy, retention, rights, licensing, and commercial constraints;
- document fallback / migration options where dependence is material.

The goal is not to become an encyclopedic expert in every feature. It is to become excellent at the subset that matters to Aureus.

## 6. Layer 4 — Task-time routing

Even for known tools, do not automatically reuse yesterday’s winner.

For a material task:

```text
task requirements
-> current active-tool evidence
-> horizon-scan signals that may have changed the field
-> shortlist plausible candidates
-> fetch current specs / price / constraints only for the shortlist
-> targeted test if uncertainty is material
-> route or recommend the work within existing authority
-> record actual outcome
```

This lets new entrants or newly improved tools enter consideration without requiring Aureus to benchmark the whole market continuously.

## 7. Layer 5 — Future-of-market sensing

Aureus should distinguish the **present market** from the **future edge**.

### Present market

Capabilities released or reliably available now. These may be used after normal evaluation and within the authority of the accountable office or decision owner.

### Near-future signals

Preview models, announced APIs, credible roadmaps, standards nearing adoption, important open-source projects, or research demonstrations likely to affect production workflows.

These signals are useful for:

- avoiding architecture that will soon be obsolete;
- preserving optionality;
- deciding whether to build, wait, or integrate;
- identifying experiments worth preparing;
- spotting new product possibilities early.

They are **not** treated as production capability until verified.

Never represent a roadmap, demo, benchmark claim, or research prototype as something Aureus can reliably use today.

## 8. Production House application

Production House benefits especially from this model because creative tooling evolves quickly.

Maintain lightweight awareness across:

- image generation / editing;
- video generation / editing;
- audio / music / sound design;
- voice / speech;
- animation / 3D / motion;
- design / layout;
- compositing / VFX;
- captioning / localization / dubbing;
- asset management;
- creative collaboration;
- publishing / distribution;
- measurement / experimentation.

When a real project appears:

1. define the creative and production requirements;
2. check current signals for newly available capabilities;
3. shortlist the tools that plausibly fit;
4. learn the relevant features deeply enough to use them well;
5. run targeted samples when quality is uncertain;
6. select or recommend the workflow within existing authority based on output quality, cost, speed, rights, reliability, and controllability;
7. save what we learn from real production.

## 9. Engineering / business / people application

The same model applies outside media.

Examples:

- a new browser / computer-use capability may change how much Business Steward can execute;
- a new voice model may simplify the member voice architecture;
- a new document or spreadsheet capability may replace custom generation work;
- a new integration platform may eliminate a connector we planned to build;
- a new evaluation / observability system may improve Foundry;
- a new payments / identity / communications API may unlock a workflow;
- a new research or retrieval system may improve a stewardship skill.

The radar should classify changes by the Aureus capability they may affect, not merely by vendor category.

## 10. Active tool card

For tools Aureus actually depends on, maintain a compact `ActiveToolCard` rather than a giant dossier.

Minimum fields:

- tool / provider;
- jobs Aureus currently uses it for;
- version / model / endpoint where material;
- current best-known usage pattern;
- important advanced capabilities we use;
- known weaknesses / failure modes;
- price / unit-cost pointer;
- privacy / rights / licensing notes;
- operational limits;
- fallback / substitute;
- last material-change check;
- Aureus evidence: quality / latency / cost / failure observations;
- unresolved experiments.

Refresh it when we use the tool materially or receive a relevant change signal.

An `ActiveToolCard` is operational intelligence. It is not a substitute for EOS-001 office accountability, EDP-001 decision authority, or FDR-001 decision history.

## 11. Adoption rule

A new tool or capability is not adopted because it is new.

Adopt or recommend adoption when it produces a meaningful improvement in one or more of:

- member / customer outcome;
- quality;
- reliability;
- completion rate;
- human burden removed;
- speed;
- cost;
- controllability;
- privacy / trust;
- accessibility;
- maintainability;
- strategic optionality.

The gain must justify switching cost, migration risk, added complexity, and dependence.

Adoption remains subject to the accountable office and existing authority. If adoption constitutes a significant Founder’s Office decision, follow EDP-001 and record the authoritative final decision in FDR-001.

## 12. Retirement rule

Tool intelligence also identifies tools that should be removed.

When a tool becomes redundant, inferior, unsafe, too expensive, deprecated, unreliable, or unnecessarily duplicative:

- identify what depends on it;
- verify the replacement;
- migrate safely;
- preserve required records / provenance;
- remove unnecessary integration and cost;
- update routing so Aureus no longer chooses it.

Retirement remains subject to the accountable office and existing authority. If retirement constitutes a significant Founder’s Office decision, follow EDP-001 and record the authoritative final decision and later outcome review in FDR-001.

The desired state is not the largest toolset. It is the **smallest current toolset that gives Aureus access to the best capabilities it responsibly needs.**

## 13. Cost-control rule

Continuous scanning should remain inexpensive.

Prefer:

- change feeds over crawling whole documentation sites;
- metadata / diff detection over repeated deep summaries;
- official sources over broad speculative searches;
- deduplication before model analysis;
- relevance classification before expensive research;
- task-triggered benchmarking rather than universal benchmark suites.

Spend intelligence budget where it can alter a real decision.

## 14. Learning rule

Real usage is the most valuable benchmark.

For meaningful tool use, capture:

- task type;
- configuration / workflow used;
- quality result;
- latency;
- actual cost where measurable;
- retries / failure modes;
- human corrections required;
- outcome / downstream performance;
- whether another tool would be tested next time.

This gradually turns the tool registry from vendor claims into **Aureus first-party capability evidence**.

For significant Founder’s Office decisions, the authoritative expected outcome, actual outcome, and institutional learning remain in FDR-001; this tool-intelligence evidence may be referenced by that record rather than creating a competing permanent decision store.

## 15. Governing shorthand

**Watch broadly. Investigate selectively. Master what we use. Test what could matter. Learn from reality. Retire what no longer earns its place.**
