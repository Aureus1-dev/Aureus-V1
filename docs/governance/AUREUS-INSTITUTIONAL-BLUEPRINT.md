# AUREUS — INSTITUTIONAL BLUEPRINT v1.0

**Role of this document:** This is not a constitution, a vision document, or an experience document. It is the architectural map of the institution — how every accepted document in this repository fits together, who owns what, and where the genuine, still-open questions are. Nothing in it is new philosophy, new canon, or a new institution. Every claim below traces to a document that already exists and was already accepted into the repository; where this Blueprint recommends a structure rather than simply stating a fact, that recommendation is built entirely from evidence those existing documents already produced (chiefly `CIA-001-Constitutional-Integrity-Audit.md` and its nine registers, `CAR-001-Constitutional-Architecture-Report.md`, `CAP-001-Constitutional-Architecture-Proposal.md`, and `AMI-001-Aureus-Master-Index.md`'s populated index).

**Status:** Living Draft — Discovery synthesis. No file has been moved, merged, renamed, or deleted in producing this document. Where a genuine contradiction exists in the corpus (see §1), it is stated plainly and left for the Founder to resolve — not silently resolved by this document.

**Date:** 2026-07-25

**Method:** Read `docs/00-foundation/` in full; read all nine `CIA-001` registers, `CAR-001`, both Founder Decision Briefs, `CAP-001`, the ALC Values Consolidation proposal, `AMI-001` and its populated index, `AQP-001`, and `docs/ai/REPOSITORY_STEWARD.md` in full; cross-checked git history (`git log --follow`) for every document whose sequencing mattered to an ownership or authority question. Family-level, not individual-document, granularity is used for the ~510-document corpus (see §3's note on why) — this matches the granularity the repository's own prior discovery work (`AMI-001-populated-index.md`) already settled on as the practical unit, and is not a shortcut invented here.

---

## 1. The one finding this Blueprint leads with

Before any hierarchy can be presented as "discovered," one sequencing fact has to be stated plainly, because it changes how everything below should be read.

**`docs/00-foundation/FOUNDATION-001`, `-002`, and `-003` were created on 2026-07-23** (commits `2a9b729`, `41ec599`, `66da513`/`e0a44e2`-adjacent — confirmed via `git log --follow`). **The entire constitutional-audit chain — `CIA-001` (started 2026-07-20), `CAR-001`, both Founder Decision Briefs, and `CAP-001` (2026-07-21 to 07-22) — was produced *before* FOUNDATION-001/002/003 existed, and none of those documents mention the `00-foundation/` family at all.**

That audit chain spent its entire effort on one question: *is `ALC-001` or `OAS-001` constitutionally supreme?* Both self-declare supremacy; neither is ratified; `CAP-001` (still "Draft — Under Review," never approved) proposed resolving this by designating `OAS-001`, once ratified, as its Tier 0.

`FOUNDATION-001` answers a different, higher question, unconditionally, in force already (`Status: Eternal`, `Authority: Highest`):

> *"If any future document, product, policy, feature, process, or decision conflicts with this Foundation, this Foundation prevails. Everything else must change. Never this."*

`FOUNDATION-003` ("Canon Hierarchy," `Status: Permanent`, `Authority: Constitutional`) then lays out an explicit, generic 8-level order (Level 0 Foundation → Level 1 Constitution → Level 2 Governance → Level 3 Member Experience → Level 4 Product Architecture → Level 5 Engineering → Level 6 Operations → Level 7 Execution), with its own Conflict Rule: *"Whenever two documents disagree: the higher authority governs. If uncertainty remains: return to FOUNDATION-001."* `FOUNDATION-002` ("The Great Purification Charter") supplies the actual reconciliation method for everything below Level 0: every document, policy, design, feature, and workflow receives exactly one of **KEEP / REPAIR / REMOVE** against FOUNDATION-001, with "the Foundation always outranks implementation" as its first rule.

**What this means, stated plainly:**

- Neither `ALC-001` nor `OAS-001` can be "supreme" in the unqualified sense either currently claims — both would, at most, occupy Level 1 ("Constitution") of FOUNDATION-003's structure, subordinate to Level 0. This isn't a new ruling by this Blueprint; it's what FOUNDATION-001/003 already say, in force, right now.
- `CAP-001`'s six-tier proposal is not wrong, but it was scoped as a competing top-level hierarchy under the premise that OAS-001-once-ratified would sit at the very top. It hasn't been approved, and its Tier 0–5 structure reads cleanly as a **candidate refinement of FOUNDATION-003's Level 1 through Level 7** — not a replacement for it. That remapping is presented as a recommendation in §2, not asserted as decided.
- Every finding in the Master Defect Register that assumes "which of ALC-001/OAS-001 wins" is the live question (MDR-001, MDR-002, MDR-015) is now better read as: *a Level-1 internal-consistency question, to be settled by running FOUNDATION-002's Great Purification (KEEP/REPAIR/REMOVE) across the ALC and OAS lineages against FOUNDATION-001's seven First Principles and Seven Questions* — not by picking a winner on the lineages' own terms.
- **Task #280 in this session's own tracker — "Constitutional Reconciliation & V1.0 Freeze," still pending — is very likely exactly this: applying FOUNDATION-002's Great Purification to the whole corpus.** It has not been executed. Nothing past 2026-07-23 in this repository's git history touches `docs/00-foundation/`, `CAP-001`, or the ALC/OAS lineages again before this Blueprint.

This is a genuine contradiction in the technical sense the operating directive uses the word — not an invented one, not a stylistic disagreement, and not something this Blueprint resolves. It is stated here because every section below has to be read against it.

---

## 2. The discovered hierarchy

### 2.1 The permanent structure (in force now, unconditionally)

This is `FOUNDATION-003` verbatim, not a Blueprint invention:

| Level | Name | Contains |
|---|---|---|
| **0** | Foundation | `FOUNDATION-001`'s seven First Principles and Seven Questions, `FOUNDATION-002`'s reconciliation method. Highest authority. |
| **1** | Constitution | Mission, Identity, Purpose, Vision, Eternal Laws, Institutional Covenant |
| **2** | Governance | Stewardship, Leadership, Voting, Transparency, Economics, Trust, Organizations, "Our Father's House" |
| **3** | Member Experience | AI Steward, Opportunity Center, Academy, Pods, Support, Journey, Design Language |
| **4** | Product Architecture | Product specifications, UX, Features, Interaction models, Business workflows |
| **5** | Engineering | Frontend, Backend, Infrastructure, Database, Security, API, Testing, Deployment |
| **6** | Operations | Policies, Playbooks, Incident response, Quality assurance, Documentation, Support |
| **7** | Execution | Work Orders, Implementation plans, Tasks, Issues, Pull Requests, Sprint planning |

Conflict rule (verbatim): *higher authority governs; if uncertainty remains, return to FOUNDATION-001.*

### 2.2 Recommended mapping of the existing corpus onto that structure

This is the synthesis step — placing what already exists into the levels above. Where a placement is contested (Level 1 specifically), that is flagged, not resolved.

| Level | Families that live here | Contested? |
|---|---|---|
| 0 | `FOUNDATION-001`, `FOUNDATION-002`, `FOUNDATION-003` | No — self-consistent, newest, only family with zero internal defects found. |
| 1 (Constitution) | `ALC-001`/`002`–`013` (`docs/constitution/`, `alc/`); `OAS-001` (draft, `docs/drafts/`) + `OAS-002`–`011` (`docs/constitution/`) | **Yes.** Both lineages claim unqualified supremacy on their own terms (§1). `CAP-001` proposed OAS-once-ratified as supreme with ALC as a subordinate "Tier 2" values layer; that proposal is un-approved and pre-dates FOUNDATION-00X. Recommendation: run FOUNDATION-002's Great Purification on both lineages against FOUNDATION-001 before deciding internal Level-1 precedence — see §8. |
| 2 (Governance) | AICP family (`docs/canon/ai/AICP-001/002`); Governance infrastructure (`AMI-001`, `AQP-001`, `CIA-001`); `docs/ai/REPOSITORY_STEWARD.md`; Engineering Constitution (`docs/canon/engineering/ENG-001`–`010`, insofar as ENG-001 §3 defines Order of Authority — a governance-of-engineering function) | Not contested in content, but none of these five families currently state their Level-2 placement in their own text (this is `MDR-012`, still open). |
| 2/3 (Governance / Member Experience, split by subject) | Production Canons (`docs/production-canons/PC-001`–`060`); AI Canon (`docs/canon/ai/AI-001`–`058`); Member Journey Canon (`docs/canon/member-journey/MJC-001`–`007`); Experience Canon (`docs/canon/experience/OC-001`) | `OC-001`/`MJC-002` overlap is real and open (`MDR-014`) — see §5. |
| 3–4 (Member Experience / Product Architecture) | Branding + Emotional Foundations + Experience Architecture (`docs/canon/branding/`, `emotional-foundations/`, `experience-architecture/`); Product Architecture (`docs/product-architecture/PA-001`–`020`) | `PA-005` duplicate + Member Core/Admin&Ops gap is open (`MDR-008`). |
| 4–5 (Product Architecture / Engineering) | Frontend Canon (`docs/frontend/canon/AFX-001`–`006`); Frontend Blueprints (`docs/frontend/blueprints/FPB-000`–`016`, the cleanest family in the repository) | None found. |
| 6 (Operations) | Operations, Technology, Security, Risk, Data, Human Resources, Legal, Finance, Communications Canons (`docs/operations/`, `docs/technology/`, `docs/security/`, `docs/risk/`, `docs/data/`, `docs/human-resources/`, `docs/legal/`, `docs/finance/`, `docs/communications/`) | Every charter in this band cites `OAS-001 — Founding Charter` as its authority (`MDR-015`) — resolved the same way as the Level-1 question (§8), not independently. Several families also have internal ID-collision (see §5). |
| 7 (Execution) | Work Orders (`docs/work-orders/`), ADRs (`docs/architecture/ADR-003`–`017`), Verification Reports (`docs/verification/`), Implementation Constitution/Standards (`docs/implementation/IC-001`–`020`), Release Readiness (`docs/releases/`), the `docs/launch/` execution track (`WORKORDERS.md`, `SCOREBOARD.md`, `EXECUTION-AUTHORITY.md`) | None found — this is the healthiest band in the repository by a wide margin. |
| Historical / non-canonical | `docs/docs/constitution/` (stray duplicate directory); `docs/sessions/`; `docs/drafts/` (other than `OAS-001`, which is live-cited) | Frozen pending Founder review; archival recommended, not deletion (§6). |

**A note on `docs/launch/`'s own hierarchy note:** `EXECUTION-AUTHORITY.md` already states a four-document precedence for the LAUNCH-001 track specifically (`LAUNCH-001` → `WORKORDERS.md` → `SCOREBOARD.md` → `version-1-readiness.md`, historical). That is a correct, narrower application of Level 7 (Execution) and does not conflict with anything above — FOUNDATION-003 itself says "lower documents may expand upon higher documents," which is exactly what `EXECUTION-AUTHORITY.md` does for its one track.

---

## 3. Document family register

**Why family-level, not per-document:** `AMI-001-Aureus-Master-Index.md` itself defines a 20-field per-document schema and its own populated index (`AMI-001-populated-index.md`) explicitly states that a full ~510-row population "is a separate, mechanical follow-on task, not yet done." Repeating that table here at individual-document grain would (a) not add synthesis value beyond what already exists, (b) risk becoming exactly the kind of duplicate documentation `IC-014, Article IV` ("each subject shall have one canonical source") already flags as a repository-wide problem, and (c) not be verifiable at the quality level the rest of this corpus was built to. The family level is the grain at which ownership, authority, and dependency questions actually resolve; per-document metadata (Author, exact dates, individual Review Notes) remains a tracked, mechanical, lower-priority task.

Fields, per family, mapped to the required schema (**Purpose · Scope · Authority · Owner · Depends On · Referenced By · Repository Location · Status · Constitutional Layer**):

| Family | Purpose | Scope | Authority | Owner | Depends On | Referenced By | Location | Status | Layer |
|---|---|---|---|---|---|---|---|---|---|
| Foundation | State Aureus's permanent first principles and the repository's canon order | Whole institution | Highest / Constitutional | Founder | None | Every other family, by construction | `docs/00-foundation/` | Eternal / Permanent | 0 |
| ALC constitutional family (2 + 11 files) | Establish supreme governing authority, values, covenant, ceremonial framing | Whole institution | Constitution (contested, see §1/§8) | Founder | Foundation (per §1) | Downstream canons by convention, not citation | `docs/constitution/`, `docs/constitution/alc/` | Founding/Living Draft, never approved | 1 |
| OAS constitutional lineage (1 draft + 10 files) | Operative rights/duties/membership/governance/amendment/justice system | Whole institution | Constitution (contested, see §1/§8) | Founder | Foundation (per §1) | Every domain canon's Authority line (`MDR-015`) | `docs/drafts/` (OAS-001), `docs/constitution/` (OAS-002–011) | Draft, never ratified | 1 |
| Stray duplicate constitution tree | None — accidental artifact | N/A | None (non-canonical) | N/A | N/A | N/A | `docs/docs/constitution/` | Stray/frozen, pending archival | Historical |
| CAP register | Track Constitutional Amendment Proposals | Amendment tracking | Register | Founder | Constitution | Cites 13 non-existent companion docs (`MDR-011`) | `docs/constitutional/register/` | Draft | 1-adjacent |
| Production Canons | Institutional production standards (60 subjects) | Production practice | Production Canon | Founder (none yet approved) | Constitution (by convention) | Engineering/Operations work | `docs/production-canons/` | Founder Review, 0/60 approved | 2/6 |
| AI Canon | AI governance across 58 subjects | AI systems | AI Governance | Founder | Constitution (by convention) | Product/Engineering AI work | `docs/canon/ai/AI-001`–`058` | Mixed | 2 |
| AICP family | Repository-wide AI collaboration + constitutional-audit protocol | AI collaborators, audits | Repository Governance | Founder | Constitution (undeclared, `MDR-012`) | This Blueprint; every AI session | `docs/canon/ai/AICP-001/002` | Living Draft | 2 |
| Engineering Canon | Engineering constitution + Order of Authority | Engineering practice | Engineering Constitution | Founder | Constitution, Canon | Product/Frontend architecture | `docs/canon/engineering/ENG-001`–`010` | Draft for Approval | 2/5 |
| Branding + Emotional Foundations + Experience Architecture | Brand voice, emotional design principles | Brand/product surface | Brand Canon | Founder | Constitution | Frontend, Product Architecture | `docs/canon/branding/`, `emotional-foundations/`, `experience-architecture/` | Living Draft | 3/4 |
| Member Journey Canon | Institution-wide member-journey phases | Member experience | Institution-wide Canon | Founder | Constitution | Frontend, product implementation | `docs/canon/member-journey/MJC-001`–`007` | Living Draft (Foundational) | 3 |
| Experience Canon | Opening Ceremony specification | Member arrival | Product Canon | Founder | Undeclared (see `MDR-014`) | Overlaps `MJC-002` | `docs/canon/experience/OC-001` | Living Draft | 3 |
| Product Architecture | 12-system product architecture | Whole product | Canonical Architecture | Founder | Constitution, Canon | Frontend, Engineering | `docs/product-architecture/PA-001`–`020` | Canonical (2 gaps, `MDR-008`) | 4 |
| Frontend Canon | Governing frontend standards | Frontend | Governing Frontend Standard | Founder | Constitution, Canon, PA | Frontend Blueprints, code | `docs/frontend/canon/AFX-001`–`006` | Canonical | 4/5 |
| Frontend Blueprints | Production blueprints per surface | Frontend | Production Blueprint | Founder | AFX, PA | Frontend code directly | `docs/frontend/blueprints/FPB-000`–`016` | Canonical — cleanest family in the repository | 4/5 |
| Governance infrastructure | Index, audit, quality protocol | Whole repository | Repository Governance | Founder | Undeclared vs. Constitution (`MDR-012`) | This Blueprint | `docs/governance/` | Living Draft / Founder Review | 2 |
| Operations Canon | Operational procedures (incl. SOPs) | Operations | Operations Canon | Founder | Constitution (`MDR-015`) | Downstream SOPs | `docs/operations/` | Canonical Draft v1.0, internal duplication open (`MDR-016`) | 6 |
| Technology Canon | Technology governance | Technology practice | Technology Canon | Founder | Constitution (`MDR-015`) | Engineering practice | `docs/technology/` | Canonical Draft v1.0, ID-collision open (`MDR-019`) | 6 |
| Security / Risk / Data Canons | Security, risk, data governance | Respective domains | Domain Canon | Founder | Constitution (`MDR-015`) | Engineering, Legal | `docs/security/`, `docs/risk/`, `docs/data/` | Canonical Draft v1.0 — cleanest of the domain canons | 6 |
| Human Resources Canon | HR governance | HR | HR Canon | Founder | Constitution (`MDR-015`) | Operations | `docs/human-resources/` | Canonical Draft v1.0 | 6 |
| Legal Canon | Legal governance | Legal | Legal Canon | Founder + legal review | Constitution (`MDR-015`) | Every member-facing surface | `docs/legal/` | Canonical Draft v1.0 — **zero implementable legal text, launch blocker** (`MDR-017`) | 6 |
| Finance Canon | Finance governance | Finance | Finance Canon | Founder | Constitution (`MDR-015`) | Operations | `docs/finance/` | Canonical Draft v1.0, duplication open (`MDR-018`) | 6 |
| Communications Canon | Communications governance | Communications | Communications Canon | Founder | Constitution (`MDR-015`) | Operations, Member-facing comms | `docs/communications/` | Canonical Draft v1.0 — one void charter file (`MDR-020`) | 6 |
| Work Orders | Implementation delivery record | Delivered engineering work | Implementation Delivery Record | Engineering | Product Architecture, Engineering Canon | This Blueprint, ADRs | `docs/work-orders/` | Complete (delivered) | 7 |
| Architecture Decision Records | Accepted engineering decisions | Engineering | Architecture Decision | Engineering | Engineering Canon | Work Orders | `docs/architecture/ADR-003`–`017` | Accepted | 5/7 |
| Operational Verification Reports | Verification evidence | Delivered features | Verification Record | Engineering | Work Orders | This Blueprint | `docs/verification/` | Operationally Verified | 7 |
| Implementation Constitution/Standards | Engineering implementation standards | Engineering | Implementation Constitution | Engineering | Engineering Canon | Work Orders, ADRs | `docs/implementation/IC-001`–`020` (2 gaps) | Canonical | 5 |
| Release Readiness | Living release-readiness tracker | Release status | Living Release Tracker | Engineering | Everything below Level 4 | Founder review | `docs/releases/` | Living, current (historical snapshot as of RS-001) | 7 |
| `docs/launch/` execution track | LAUNCH-001 execution registry + scoreboard | The First Members launch | Execution registry (Level 7, scoped) | Engineering + Founder | `LAUNCH-001-First-Members.md` | Every session working this track | `docs/launch/` | Living, actively maintained (24/50 work orders complete as of this writing) | 7 |
| Governance recovery/audit records | This session's own audit trail | Repository governance | Audit Record | Founder (session-produced) | Everything it audited | This Blueprint | `docs/governance/audits/`, `decisions/`, `proposals/`, `repairs/`, `registry/` | In progress / Draft — Under Review | 2 |

**Total families: 29 (including Foundation and this Blueprint's own home). Total documents indexed: ~510 at family granularity**, consistent with `AMI-001-populated-index.md`'s own count.

---

## 4. Ownership map — one concept, one home

Per `CAP-001 §7.3` and `IC-014, Article IV` ("each subject shall have one canonical source"), the rule going forward for every concept below:

| Concept | Owning family | Everything else may reference, never redefine |
|---|---|---|
| Rights (person-held, enforceable) | OAS-006 (once the Level-1 question resolves) | All domain canons |
| Duties | OAS-007 | All domain canons |
| Membership tiers, lifecycle | OAS-008 | Product Architecture, Frontend |
| Governance branches, separation of powers | OAS-009 | Governance infrastructure |
| Constitutional amendment process | OAS-010 | CAP register |
| Justice / due process / Tribunal | OAS-011 | Legal Canon |
| Values, character, virtue (expressive, non-operative) | ALC-003–013 today; **the single consolidated "Aureus Constitutional Values Canon" proposed in `ALC-Values-Consolidation-Design-Proposal.md`, once approved** | ALC-001's ceremonial content, all domain canons |
| Ceremonial/covenant framing | ALC-001 | Member Journey Canon (Opening Ceremony phase) |
| "Steward" (bare term, unqualified) | ALC-001 §5 / Article V — **contested even within itself** (`MDR-001`); "Human Steward" and "AI Steward" (qualified forms) are already the single most consistently defined terms in the repository and are not in question | Every family that uses the qualified forms |
| Human–AI stewardship boundary | FOUNDATION-001 Principle 5 ("Agency"); OAS-001; ALC-001 Article on AI/Technology | AI Canon, AICP family |
| Member-journey phase structure | MJC-001 (parent), MJC-002–007 | Experience Canon (`OC-001`, overlap open — `MDR-014`) |
| Opening Ceremony specifically | **Undeclared — MJC-002 and OC-001 both claim it** | See §5 |
| Product system architecture | PA-001/002 (the 12-system map) | Frontend Canon, Engineering Canon |
| Frontend standards | AFX-001–006 | Frontend Blueprints |
| Frontend production specs per surface | FPB-000–016 | Code directly |
| Repository governance / AI collaboration | AMI-001, AQP-001, CIA-001, AICP-001/002, `REPOSITORY_STEWARD.md` | This Blueprint |
| Operations, Technology, Security, Risk, Data, HR, Legal, Finance, Communications procedures | Each domain's own Charter + SOP family | Nothing outside that domain |
| Launch execution (LAUNCH-001 track specifically) | `WORKORDERS.md` (registry) / `SCOREBOARD.md` (status) / `LAUNCH-001-First-Members.md` (scope) | `EXECUTION-AUTHORITY.md` states this precedence already; unchanged here |
| Engineering practice, ADRs, implementation standards | ENG-001–010, IC-001–020, ADR-003–017 | Work Orders |

---

## 5. Known, real, unresolved contradictions

Per the Discovery Rule: these are the genuine contradictions found. None are invented; all are already documented in full, with evidence, in `CIA-001-07-Master-Defect-Register.md`. This section is a compact index into that register — not a restatement of it, to avoid exactly the duplication this repository has already learned costs it (see `D-25`).

| ID | One-line summary | Severity | Reframed by §1? | Full detail |
|---|---|---|---|---|
| MDR-015 | Every domain canon (~40 charter files, 9 domains) cites unratified `OAS-001` as authority | Critical | Yes — now a Level-1/6 mechanical repointing question, resolved together with MDR-002 via Great Purification | `CIA-001-07` |
| MDR-002 | `ALC-001` and the `OAS-001` lineage both claim unqualified supremacy | Critical | Yes — see §1; neither is actually supreme under FOUNDATION-003 | `CIA-001-07`, `FDB-001`, `FDB-001-Addendum`, `CAR-001` |
| MDR-001 | `ALC-001`'s bare "Steward" is defined three incompatible ways internally | Critical | No — self-contained to `ALC-001`, independent of the Level-1 question; `FDB-001` already recommends Option A | `CIA-001-07`, `FDB-001` |
| MDR-003, 004, 005, 009, 010, 011 | Constitutional-family duplication/truncation/stray-directory defects (frozen path) | High/Medium | No | `CIA-001-07`, `CIA-001-11` |
| MDR-006, 007 | Production Canon / AI Canon truncation (37 files) | High/Medium | No | `CIA-001-07` |
| MDR-008 | `PA-004`/`PA-005` duplicate; Member Core + Admin&Ops architecture never written | High | No | `CIA-001-07` |
| MDR-012 | New governance-infrastructure layer's Level-2 placement undeclared in its own text | Medium | Partially — this Blueprint's §2.2/§3 now states the recommended placement | `CIA-001-07` |
| MDR-014 | "Opening Ceremony Canon" exists twice (`OC-001`/`MJC-002`), undeclared relationship | Low | No | `CIA-001-07`, `CIA-001-11`, `CIA-001-12` |
| MDR-016, 018, 019 | Operations/Finance/Technology Canon internal ID-collisions (dozens of files) | High/Medium | No | `CIA-001-07`, `CIA-001-11` |
| MDR-017 | Legal Canon: zero implementable Terms of Service / Privacy Policy / consent text anywhere — **launch blocker, independent of everything else in this list** | High | No | `CIA-001-07` |
| MDR-020 | `OAS-COM-002` is a 92-byte void file with 7 dangling references | High | No | `CIA-001-07`, `CIA-001-11` |
| MDR-021 | Broken cross-references (`WO-030`, missing `PR-001`, missing `IC-008/010`, missing IDR series) | Low-Medium | No | `CIA-001-07`, `CIA-001-11` |

**Full remediation ordering, effort estimates, and validation steps for every item above already exist in `CIA-001-08-Master-Remediation-Plan.md` (18 items, R-001 through R-018) — this Blueprint does not re-derive them.**

---

## 6. Repository organization

`docs/implementation/IC-013-Repository-Organization-Standard.md` already defines the intended top-level structure and explicitly prohibits documentation duplication "unless expressly required." The repository does not yet fully conform to its own standard, per the Repository Health Register. The known deviations, already fully catalogued (not repeated here):

- `docs/docs/constitution/` — stray, accidentally-nested directory. Recommended: archive (not delete) once the standing freeze is addressed — already scoped as `R-013`.
- Operations/Technology/Legal/Finance internal duplication — recommended: archive non-canonical variants per number once a lineage decision is made — already scoped as `R-015`–`R-018`.
- Everything else audited (Security, Risk, Data, HR, Communications, Work Orders, ADRs, Verification, Implementation, Frontend Canon/Blueprints, Product Architecture bar 2 files) is clean and needs no structural change.

No new folders are proposed by this Blueprint. The repository's existing top-level structure already maps cleanly onto FOUNDATION-003's Levels 0–7 as shown in §2.2 — the work remaining is cleanup within families, not reorganization across them.

---

## 7. Growth rule — how the institution adds without losing itself

This is not new policy. It is `CAP-001 §7.3`–`§7.5` and `AMI-001`'s own AI-collaboration obligations, restated as the one rule every future addition must follow:

1. **Before drafting anything constitutional-adjacent, check `AMI-001` (or this Blueprint's §3/§4) for an existing owner.** If one exists, extend it; do not create a parallel document. This is the single mechanism that would have prevented `ALC-003`–`013`'s nine-fold redundancy and the Operations/Technology/Legal/Finance ID-collisions.
2. **Declare which Level (0–7) a new document belongs to, in its own header, before it is written.** No document audited in this corpus currently does this cleanly except the Frontend Blueprint family (`FPB-000`) — the model to copy.
3. **A new Level-1 (Constitution) document is an amendment, not a freestanding draft.** Once the Level-1 question in §1/§8 resolves, it flows through whichever amendment process that resolution designates (`OAS-010`'s CAP lifecycle is the only one that already exists in fully-specified form).
4. **A new Level 2–6 canon must state its parent authority and its Level, and must be checked against every existing family in that Level for subject overlap first** — the check `MDR-014`, `MDR-016`, `MDR-018`, `MDR-019` all show was skipped.
5. **Supersession is never silent.** Per `AMI-001`'s own Supersession Rules — not yet met by a single pre-existing document in the corpus except the one clean `OAS-002-old → ALC-002` git-history event (and even that wasn't documented inside the surviving file) — any document that replaces another must say so, in its own header, with the replaced document archived (not deleted).
6. **`FOUNDATION-002`'s Great Purification method (KEEP / REPAIR / REMOVE, evaluated against `FOUNDATION-001`) is the standing reconciliation process**, not a one-time event — this is what closes §1's open question and should be the process any future full-corpus review uses again.

---

## 8. What remains for the Founder

In recommended order (root-most first, matching the Dependency Graph's own logic in `CIA-001-10`, updated for §1's discovery):

1. **Confirm or correct this Blueprint's central finding (§1):** does `FOUNDATION-001`/`002`/`003` supersede the entire supremacy question `CIA-001`/`CAR-001`/`CAP-001` was built to answer? If yes (as the documents' own unconditional language states), the remaining Level-1 work is running Great Purification on the ALC and OAS lineages, not choosing a winner between them.
2. **Execute (or explicitly defer) Task #280, "Constitutional Reconciliation & V1.0 Freeze"** — very likely the concrete execution of item 1.
3. **`MDR-001` (Steward definition)** — independent of item 1, already has a recommended resolution in `FDB-001` (Option A) awaiting execution behind the standing freeze.
4. **The standing freeze itself** (`docs/constitution/`, `docs/docs/constitution/`, `docs/constitutional/`, `docs/sessions/`, `docs/drafts/`) — lift, extend an exception, or keep it; several already-drafted, zero-risk fixes (`R-009`, `R-010`) are waiting only on this.
5. **`CAP-001` and the ALC Values Consolidation proposal** — both still "Draft — Under Review," and per §1 should be re-read as proposed refinements of FOUNDATION-003's Levels 1–2, not as a competing top-level hierarchy, before approval.
6. **Tier-3-equivalent domain-canon duplication** (Operations, Technology, Finance, Legal) — independent of 1–5, ready to execute once a canonical-lineage decision is made per number (`R-015`–`R-018`).
7. **`MDR-017`'s missing legal text** — a launch blocker, on its own track requiring qualified legal review, independent of every governance question above.
8. **Independent, zero-dependency items** (`MDR-006`–`008`, `014`, `020`, `021`) — can proceed in parallel with anything above; already fully scoped in `CIA-001-08`.

Nothing in this list is new. Every item already exists, evidenced, in the documents this Blueprint synthesizes.

---

## 9. How to use this document

A steward — human or AI — arriving at this repository for the first time should read in this order: `FOUNDATION-001` (what Aureus is for), `FOUNDATION-003` (the order everything else sits in), this Blueprint (the map of what exists and where), then `AMI-001` and the specific family's own documents for detail. This Blueprint does not replace any of those — it is the layer that lets a reader find them without guessing.

This document should be revisited whenever: a Founder decision in §8 is made (update the affected row in §2.2/§3/§5, don't create a new Blueprint); a new document family is added (per §7); or the repository's structure changes in a way §6 doesn't already describe. It is not expected to grow — a Blueprint that keeps growing is itself a sign the institution stopped being simple enough to hold in one map.
