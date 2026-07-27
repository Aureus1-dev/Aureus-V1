# Founder Decision Brief — What Document Is "The Constitution"

**Status:** Decision brief only. No corpus file has been edited. No replacement text has been drafted. This document does not decide anything — it lays out the evidence and a recommendation for you to rule on.

**Scope:** Answers the one open question left by Founder Rulings #1–3 (Phase 2A): what, if anything, occupies `FOUNDATION-003`'s Level 1 — "Constitution."

---

## 1. Every document that currently claims to be, or functions as, "the Constitution"

I screened the full corpus (this program's Phase 1 inventory, 648 files) for documents making an *institution-wide* constitutional-supremacy claim — not domain-scoped ones. Domain-scoped "constitutions" (`AEX-000` for Experience, `IC-001` for Implementation, `ENG-001`/`ENG-010` for Engineering, `SC-001` for Stewardship) explicitly limit themselves to their own domain and were already addressed in Phase 2A; none of them claims to be *the* Constitution of Aureus as a whole. Only two documents make that claim:

| | `ALC-001` | `OAS-001` |
|---|---|---|
| Full title | Aureus Living Constitution | Founding Charter of the Open Advancement System |
| Location | `docs/constitution/ALC-001-Aureus-Living-Constitution.md` | `docs/drafts/OAS-001_Draft_0.95.md` |
| Status (own header) | "Founding Draft for Founder Review" / "Pre-Activation Living Draft" | "Draft 0.95... **Not yet ratified**" |
| Length | 2,217 lines, 12 Articles (**Article XI is missing — the document jumps from Article X to Article XII; a defect I found during this brief's verification, not previously catalogued**) | 213 lines, 9 Articles, complete and consistently numbered |
| Explicit open questions | None flagged in the document itself | 9 explicit, numbered Founder-notes (N1–N9) — e.g. membership definition undecided, Founder-succession sunset mechanism undecided |
| Direct citations elsewhere in the corpus | 16 files | 33 files (not counting the ~200-file department Charter/Framework/SOP tree, which mostly cites its immediate parent rather than `OAS-001` directly — see §3) |
| Ratification clause in its own text | No explicit "takes effect upon Founder approval" article | Yes — Article IX, explicit |
| Entrenchment mechanism | Implied via Article VII, not itemized | Yes — Article VII §3, an itemized list of provisions that cannot be weakened |

Neither is ratified. Both are self-labeled drafts. This is not a contest between a finished document and an unfinished one — it's a choice between two different kinds of unfinished.

---

## 2. Historical purpose of each

I could not establish reliable original-authorship dates from git history — the repository's commit history for both files traces back to a single bulk "repo-integrity restore" commit, which appears to be a history-rewriting/consolidation event, not organic authorship. Dates below come from the documents' own internal self-description, not git blame.

**`ALC-001`** presents itself as the founding, comprehensive constitutional statement of Aureus as an institution: identity, mission, the "Laws of Aureus," human dignity and rights, a "Stewardship Covenant" (a voluntary, opt-in relational identity for members — the "Mark"), governance structure, an "Open Stewardship Ledger," justice and due process, and general provisions. Its register is aspirational and ceremonial throughout — it includes a Founding Declaration, a Founder's Declaration, an Institutional Blessing, a Constitutional Seal and Motto. It reads as the document meant to be *felt*, not just complied with.

**`OAS-001`** presents itself as a tightly-scoped founding charter in the classical constitutional-instrument sense: establishment, mission, founding principles, human-AI stewardship, governance, accountability, amendment, continuity/dissolution, ratification. It explicitly positions itself as the root of a much larger subordinate document tree — `OAS-002` through `OAS-011` each exist specifically to elaborate one article of `OAS-001` in operative detail, and a separate ~200-file department Charter/Framework/SOP tree (Communications, Data, Finance, HR, Legal, Operations, Risk, Security, Technology) was built citing `OAS-001` as its root authority. Its own changelog (Draft 0.9 → 0.95) shows a document under active, disciplined revision against a stated set of "canonical principles," with every change justified against them.

A prior content-coverage comparison exists in the repository's history that bears directly on this question — **`FDB-001-Addendum-Content-Coverage-Comparison.md`**, dated 2026-07-21, produced during the earlier governance-audit chain (currently sitting unmerged on the `claude/aureus-v1-governance-audit` branch, PR #49 — not yet part of this program's frozen baseline, but directly relevant and worth reading in full). It was commissioned by an earlier Founder instruction ("perform a content-coverage comparison between OAS-001 and ALC-001 to ensure nothing unique would be lost") and did a rigorous, side-by-side reading of both documents' operative content. I've incorporated its findings below rather than re-deriving them, since its comparative reading was deeper than what's proportionate to redo here.

---

## 3. Scope, overlap, and conflicts

### Where they cover the same ground, one is dramatically more developed

This is the single most important finding, and it comes from the FDB-001 addendum's direct side-by-side reading, corroborated by my own read of `OAS-001` in full and `ALC-001`'s structure:

| Subject | `ALC-001` | `OAS-001` lineage |
|---|---|---|
| Justice / due process | Article X, 13 principle-level Sections ("shall **strive to be** impartial... **where reasonably possible**") — no defined adjudicative body, no jurisdiction rule, no evidentiary standard, no appeal mechanism | `OAS-011`, 18 Articles across 7 Parts — names the Tribunal, gives it jurisdiction, recusal rules, evidentiary standards, a remedy taxonomy, an appeal mechanism, finality rules |
| Rights | Article IV, ~10 principle-level Sections | `OAS-006`, 20 Articles across 4 Parts, each right individually entrenchment-flagged |
| Duties | Not a separate Article | `OAS-007`, 23 Articles across 6 Parts, including a load-bearing rule that no duty may ever offset a right |
| Membership | Article V ("Stewardship Covenant") — a voluntary identity framework, ~10 Sections | `OAS-008`, 23 Articles — a full tiered system (Guest→Participant→Contributor→Member) with entry/suspension/removal/restoration procedures |
| Governance / separation of powers | Article VI, ~10 Sections, First Steward + Council | `OAS-009`, 18 Articles across 6 Parts — three coequal bodies, non-delegable authorities, jurisdictional-dispute rules, an explicit Founder-succession mechanism |
| Amendment | Article VII, ~10 Sections | `OAS-010`, 18 Articles across 5 Parts — a full lifecycle (Draft→Under Review→Approved→Canonized/Rejected/Withdrawn/Archived), Tribunal entrenchment review, non-retroactivity |

In every row where the two documents address the identical subject, `ALC-001` states values and `OAS-001`'s lineage builds a working mechanism. This is not a close call, and it isn't just my read — it's the finding of a dedicated prior audit that read both in full.

### Where `ALC-001` is genuinely stronger or unique

The comparison is not one-sided. `ALC-001` has real, distinct strengths the `OAS-001` lineage does not have at all:
- **Ceremonial and covenant content** — the Founding Declaration, Founder's Declaration, Institutional Blessing, Constitutional Seal, Motto — with no counterpart anywhere in `OAS-001`'s lineage, which is written in a purely legal-instrument register throughout.
- **The Stewardship Covenant / "the Mark"** (Article V) — a voluntary, opt-in relational identity for members, with an apprenticeship progression. `OAS-001`'s lineage has a membership *tier* system (functional/legal) but nothing with this aspirational, relational framing.

### A genuine naming/identity question, not previously flagged

`OAS-001` and its lineage consistently name the institution "the Open Advancement System (OAS)," not "Aureus." I read `OAS-003` (Identity, Mission, Vision, Purpose) directly: *"The Open Advancement System is a perpetual, self-governing constitutional institution..."* — OAS is presented as the institution itself, not a subsystem within Aureus, but the name itself doesn't match what every other document (including `FOUNDATION-001/002/003` and this entire program) calls the institution: "Aureus." `ALC-001` consistently uses "Aureus" throughout. Whichever document becomes canonical, this naming mismatch needs a decision of its own — either OAS-001 is understood as "Aureus operating under its formal/legal name," or its Article I, Section 1 needs a conforming amendment.

### Conflicts with the now-decided Foundation layer

Both documents currently claim unqualified self-supremacy — `ALC-001` in two places (Article I §2 and Article XII §2, which restates its own hierarchy with itself at the top) and `OAS-001` in Article I §3 ("This Charter is the supreme governing instrument of the System"). Neither currently mentions `FOUNDATION-001`, which is expected — both predate the Foundation layer. Whichever is chosen, its supremacy language needs the same kind of Phase 2A treatment already applied to `AEX-000`, `AI-016`, `PC-041`, `ENG-010`, and `GV-003` — this brief does not do that drafting, per your instruction.

### A discipline signal worth naming plainly

`OAS-001` and every document in its immediate series (`OAS-003`–`OAS-011`, all 9) carry the identical status: **"Draft for Founder Review."** `OAS-001` itself goes further, itemizing exactly which 9 questions still need your decision before it could be ratified. `ALC-001` carries a different status ("Founding Draft for Founder Review") and its 12 subordinate articles are all marked "Living Draft" — a status that reads as already-operative-and-evolving rather than explicitly-awaiting-approval, despite `ALC-001` itself not yet being ratified either, and despite real unresolved defects in that series: `ALC-011` has internal corruption (Articles VII–XII duplicated verbatim, XIII–XVIII never written), `ALC-009` and `ALC-013` end abruptly with no closing declaration, and — newly found while preparing this brief — `ALC-001` itself skips Article XI entirely. The `OAS-001` lineage is not defect-free (the `docs/constitution/` vs `docs/docs/constitution/` duplicate-location problem for `OAS-004`/`005`/`006` is still open, and `OAS-ACA-007` has an internal same-directory ID collision), but it does not have missing or internally-corrupted articles of the kind found in `ALC-011` and the gap in `ALC-001` itself.

---

## 4. Which document is most appropriate for `FOUNDATION-003`'s Level 1

On the evidence above, **`OAS-001` and its lineage is the more appropriate candidate for the operative "Constitution" role** — the one that actually functions as governing law (rights with remedies, duties with limits, a working amendment process, a working justice system) rather than a statement of values. It is also structurally intact (no missing or duplicated articles) and has already been built out to nine operative daughter documents plus a ~200-file adopted department tree, representing substantial existing institutional investment.

But "most appropriate" is not the same as "ready." `OAS-001` explicitly says it is not: 9 named open questions, no ratification. Choosing it as the answer to "what occupies Level 1" is a different act than ratifying it today — this brief recommends the former, not the latter (see §7).

---

## 5–6. Options, and the repository impact of each

**Option A — `OAS-001`'s lineage becomes "the Constitution."**
`ALC-001` is explicitly preserved, not deleted, as a subordinate document carrying what `OAS-001` lacks: mission framing with ceremonial and covenant weight (its Article V, and its ceremonial closing material). *Impact:* Low-to-moderate. `OAS-001`'s 9 open questions need Founder answers before ratification. The `docs/constitution/` vs `docs/docs/constitution/` duplicate-location problem for `OAS-004/005/006` needs resolving as part of the same pass (already flagged, Repair Plan E5/E12). The department Charter tier (~200 files) needs no structural change — it already cites `OAS-001` correctly; only `OAS-001` itself needs a `FOUNDATION-001`-subordination clause, the same Phase 2A treatment already given to six other documents. `ALC-001`'s own supremacy language needs the same treatment, reframed as "subordinate, but preserved for its distinct ceremonial/covenant content" rather than retired outright.

**Option B — `ALC-001` becomes "the Constitution."**
This is the option the FDB-001 addendum was originally asked to validate, and its own finding was that the precondition — "if ALC-001 fully subsumes OAS-001" — does not hold: `ALC-001` does not contain equivalents of `OAS-006`'s entrenchment-flagged rights, `OAS-007`'s duties, `OAS-009`'s three-body separation of powers, `OAS-010`'s full amendment lifecycle, or `OAS-011`'s working justice system. *Impact:* High. Choosing this option without first authoring that missing operative substance would mean canonizing a Constitution that states rights without remedies and permits amendment without a defined process — the institution would have a values statement at its apex with no working mechanism beneath it. The ~200-file department Charter tree, all built citing `OAS-001`, would need to be re-rooted or explicitly bridged to `ALC-001` instead — a much larger footprint of change than Option A's.

**Option C — Merge one into the other.**
Genuinely possible given the two documents' complementary strengths (`OAS-001`'s operative rigor, `ALC-001`'s ceremonial/covenant register), but this is explicitly the FDB-001 addendum's "most work, most architecturally clean" option. *Impact:* Highest of the four — a new document would need fresh drafting and fresh ratification, and every one of the ~220+ documents currently citing either `ALC-001` or `OAS-001` would eventually need to be re-pointed. Not a small-footprint option, and not something to decide casually given how much is already built on the current citation structure.

**Option D — Retire one, author something new.**
Not supported by the evidence. Both documents contain real, non-duplicated institutional content (Option B's table above, plus `ALC-001`'s covenant material) — retiring either outright without first preserving what's unique to it would be a "silent loss" of exactly the kind Founder Decision 1 (2026-07-21) was originally trying to avoid when it commissioned the FDB-001 comparison in the first place.

---

## 7. Recommendation

**Option A** — `OAS-001`'s lineage occupies `FOUNDATION-003`'s Level 1 as the operative Constitution; `ALC-001` is explicitly preserved as a subordinate document carrying the mission/covenant/ceremonial dimension the `OAS-001` lineage doesn't have.

**Reasoning, briefly:** This is a "smallest defensible change" recommendation, consistent with the discipline this whole program has tried to hold to. `OAS-001`'s lineage is structurally intact, already has the larger real-world adoption footprint (33 direct citations plus a ~200-file department tree already built against it), and — on a dedicated prior audit's own side-by-side reading, not just my judgment — is the one that actually *governs* rather than merely *states*. `ALC-001` has real, valuable content that Option A does not throw away; it just stops being "the" Constitution and becomes what it's actually strongest at being: the document that makes the institution's mission and covenant felt, not just legal.

This does not mean `OAS-001` is ready to ratify today. Its own 9 open Founder-notes (N1–N9) — chiefly membership definition, the Founder-succession sunset mechanism, and confirming the entrenchment scope — are real, substantive, and are the next decision after this one, not resolved by it.

---

## What this brief does not do

No file has been edited. No replacement authority-statement text has been drafted for `ALC-001`, `OAS-001`, or `FOUNDATION-003`'s Level 1. If you approve Option A (or a different option), the next step is a Phase 2A-style impact analysis for that specific choice — the same review process already used for the other six documents — before any drafting begins.
