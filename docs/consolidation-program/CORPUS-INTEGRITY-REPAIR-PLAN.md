# Corpus Integrity Repair Plan (Phase 1.5)

**Status:** Plan only. Nothing in this document has been executed. No file outside `docs/consolidation-program/` has been moved, renamed, deleted, edited, merged, or renumbered to produce this plan.

**Source of truth:** This plan classifies every issue already recorded in `DUPLICATION-MAP.md` and `CONSTITUTION-INVENTORY.md` (Phase 1, complete). It does not repeat the inventory and introduces no new findings.

**Role:** Repository Integrity Engineer. This plan restores *integrity* (documents accurately representing what they claim to be), not *governance* (which document is supreme). Categories A–D can, in principle, be executed without touching any authority question. Category E cannot be executed by this program at all — it is a list for the Founder.

**A note on the request itself:** the "FOR EACH ISSUE / Provide: • Issue" instruction was cut off before listing the remaining fields. Rather than block on that, this plan uses: **Issue · File(s) · Evidence · Recommended Action · Reversibility · Founder Decision Required (Y/N)** — adjusted per category where a field doesn't apply (e.g., Category C has no "Recommended Action," since the instruction is explicit: document, don't resolve). Flag any correction needed and I'll re-cut the table.

---

## Category A — Safe Mechanical Repairs (10 items)

No Founder decision needed. These are hygiene fixes to content that is already unambiguous — stripping material that plainly isn't the document, or correcting a listing to match what's actually on disk. **Not executed in this pass** — listed here as an execution-ready checklist pending your go-ahead, per the phase's "plan only" instruction.

| # | Issue | File(s) | Evidence | Recommended Mechanical Action | Reversibility |
|---|---|---|---|---|---|
| A1 | Un-stripped AI-review commentary appended after "End of [doc] draft" | `docs/docs/constitution/OAS-004`, `OAS-005`, `OAS-006` | ~80–238 extra lines per file of reviewer commentary ("I'd score it 9.8–9.9/10...") pasted after the document's own closing line | Delete everything after the document's stated "End of [ID] draft" marker | Fully reversible (git) |
| A2 | Same defect, "clean" side of corpus | `docs/constitution/OAS-007`, `OAS-009`, `OAS-010`, `OAS-011` | OAS-007: ~65 lines commentary + GitHub instruction block + next-work-order (CWO-011) prompt. OAS-009: stray filename/path artifact. OAS-010: ~170 lines commentary + CWO-011 text. OAS-011: ~160 lines commentary | Same as A1 — delete content after each file's own "End of [ID] draft" marker | Fully reversible |
| A3 | Stray AI-chat artifact prefixed to constitutional text | `docs/constitution/alc/ALC-004-The-Nature-of-Human-Flourishing.md` | Opens with "Absolutely." plus a pasted file path before the real title | Delete the artifact line(s) preceding the actual `# ALC-004` heading | Fully reversible |
| A4 | Stale, inaccurate document listing | `docs/branding/README.md` | Lists titles for BRAND-011–013 that don't match the files on disk; omits BRAND-014/015/016 entirely | Regenerate the listing from what's actually present in `docs/branding/` — a factual sync, not a judgment call about which series is canonical | Fully reversible |
| A5 | Broken cross-reference: `ACR-001` lists 4 sibling files that don't exist | `docs/constitution/registers/ACR-001-Constitutional-Definitions-Register.md` | Cites `ACR-002`, `ACR-003`, `ACR-004`, `AFR-001` — none exist anywhere in the repo | *Documenting* the broken links is mechanical (done — see D-group below); *authoring* the missing files is not (see E13). No mechanical fix beyond flagging is safe here without content authorship. | N/A — see D5/E13 |
| A6 | `docs/docs/constitution/OAS-003` vs `docs/constitution/OAS-003` — exact duplicate, same filename | Both paths | Byte-identical (hash `f8b08e86fc1a`) | Once a canonical directory is chosen (Founder decision, see E12), the non-canonical copy is a pure delete — zero content risk since it's byte-identical | Fully reversible, but **blocked on E12** (which directory survives) — not truly independent of a Founder decision, listed here only because the *mechanics* of removing an exact duplicate involve no content judgment |
| A7 | Malformed/placeholder file masquerading as a document | `docs/communications/OAS-COM-002-Communications-Governance-and-Public-Engagement-Framework.md` | 92 bytes, entire "content" is the file's own path as a literal string | Regenerating real content is authorship (see E14); *removing the placeholder string* is mechanical, but leaves the file empty, which is not obviously better than the current state — recommend leaving in place with the defect documented (D-group) until E14 is resolved | N/A — see D7/E14 |
| A8 | `OAS-COM-002`'s malformed content came at the cost of leaving `OAS-COM-003`, `OAS-COM-004`, and `sops/OAS-COM-101` citing a broken authority | Same three files | They cite `OAS-COM-002` as their authority | No independent fix — resolves automatically once A7/E14 resolves | N/A |
| A9 | `docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md` filename does not match its own content | `docs/governance/protocols/ARM-001-...md` | Entire 3,500-line body is `AICP-001 — Aureus AI Collaboration Protocol` text, not risk-management content | Note: **not** purely mechanical — moving/renaming this file is explicitly prohibited this phase, and a correctly-named `AICP-001` destination already exists as a proposal in PR #49 (unmerged). Recommend cross-referencing that PR rather than independently mechanical-fixing here. | See E7 |
| A10 | Two functionally identical "AI review scorecard" contamination patterns share a detectable, consistent shape | All 8 files in A1–A3 | Every instance follows the same pattern: real content ends at an explicit "End of [ID] draft" (or equivalent) marker, everything after is foreign | Once approved, all 8 files in A1–A3 can be repaired by the same single mechanical rule (truncate at the marker) — flagging this as one coordinated batch rather than 8 separate one-off edits, to keep the eventual diff easy to review | Fully reversible |

**Execution note:** A1–A3 and A10 are the only *fully* independent mechanical repairs in this list — 8 files, one consistent rule, zero content judgment. A4 is independent and trivial. A5–A9 turn out, on inspection, to not be cleanly mechanical after all (each either depends on a Founder decision or requires new authorship) — reclassified in place above rather than force-fit into "safe," per the instruction not to under- or over-classify.

---

## Category B — Content Integrity Repairs (6 items)

Documents that are damaged. Recoverability assessed per item; **none repaired in this pass**.

| # | Issue | File(s) | Damage Type | Evidence | Original Content Recoverable? |
|---|---|---|---|---|---|
| B1 | Internal duplication + missing articles | `docs/constitution/alc/ALC-011-The_Constitutional_Commitments_of_Aureus.md` | Duplicated section + missing chapters | Articles VII–XII ("Commitment to Justice" through "Commitment to Hospitality") appear twice, verbatim, at two different line ranges in the same file; immediately after, numbering jumps to "Article XIX" — Articles XIII–XVIII were never written or were overwritten | **Partially.** The duplicate-removal half is mechanical once confirmed identical (see A-adjacent note above). The missing Articles XIII–XVIII are **not recoverable from within the repo** — no other file contains them. Requires fresh authorship, which is a content decision, not a repair. |
| B2 | Incomplete/truncated ending | `docs/constitution/alc/ALC-009`, `ALC-013` | Terminate mid-series, no closing declaration (unlike sibling ALC files) | Both end abruptly relative to the pattern established by other ALC documents | **Unknown.** Could be intentionally shorter, or genuinely truncated saves. No recovery source found in-repo. Needs a determination of intent before any action — see E9. |
| B3 | Stub masquerading as a populated register | `docs/constitution/registers/ACR-001-Constitutional-Definitions-Register.md` | Placeholder content | 12-line directory-tree diagram, not actual definitions | **Not recoverable** — no definitions content exists anywhere else in the repo to restore from. Would need fresh authorship. |
| B4 | Effectively-missing document, wrong content in its place | `docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md` | Content substitution (whole different document's text under this filename) | Entire body is `AICP-001` text, not risk-management content | **Not recoverable as ARM-001** — no risk-management content exists anywhere in the repo under any name. The `AICP-001` content it currently holds *is* recoverable (it's just misfiled — see A9/E7), but real ARM-001 content does not exist and would need fresh authorship. |
| B5 | Unpopulated master index | `docs/governance/registry/AMI-001-populated-index.md` (per its own filename, "populated" — but is not) | Placeholder / not yet built | Referenced across governance docs as the master index; content not yet assembled | **N/A** — this isn't damage, it's incompleteness. Recommend building it only after the Category E supremacy/collision items are resolved (building an index of an unstable corpus would need immediate rework). |
| B6 | 92-byte stub | `docs/communications/OAS-COM-002-...md` (cross-listed from A7) | Placeholder content (literal file path as body text) | See A7 | **Not recoverable** — no source content exists elsewhere. Fresh authorship needed. |

**Pattern across Category B:** every item here that looks like "damage" turns out, on the "can it be recovered" test, to actually be **missing content that was never written**, not content that was lost and can be restored from elsewhere in the repo. None of these are safe for this program to author — that's a governance/content decision (what should the Risk Management Protocol actually say?), logged forward into Category E where applicable.

---

## Category C — Identity Conflicts (documented only, no resolution proposed)

Per instruction, these are recorded, not resolved. Grouped by conflict type rather than listed 86 times individually — full per-pair file paths are already in `DUPLICATION-MAP.md` and `CONSTITUTION-INVENTORY.md`; this table is the classification index into that detail.

| # | Conflict Type | Scope | Count | Evidence location |
|---|---|---|---|---|
| C1 | Same ID, unrelated documents, cross-directory | `FPB-000`–`016` (17), `BRAND-002`–`016` (15) | 32 | `DUPLICATION-MAP.md` §"B — Same identifier, unrelated content" |
| C2 | Same ID, unrelated documents, cross-directory (single pairs) | `EX-001`, `OC-001` | 2 | Same section |
| C3 | Same ID, unrelated documents, **same directory** (most severe form) | `OAS-ACA-007` (Community vs. Truth Ledger) | 1 | Same section |
| C4 | Same ID, diverged fork, different claimed authority level | `SC-001` (`docs/canon/steward/foundation/` vs `docs/steward/foundation/`) | 1 | `DUPLICATION-MAP.md` §"C — ...genuinely diverged draft" |
| C5 | Same ID, same base text, one side contaminated + one side mislabeled by filename | `OAS-004`, `OAS-005`, `OAS-006` (`docs/constitution/` vs `docs/docs/constitution/`) | 3 | `DUPLICATION-MAP.md` §"C — ...contaminated fork" |
| C6 | Competing canonical locations, partial non-overlapping content | `docs/docs/constitution/` as a whole vs. `docs/constitution/` | 1 (structural) | `DUPLICATION-MAP.md` (main body + Addendum §112) |
| C7 | Same ID, unrelated documents, department Charter tier, same directory | `OAS-FIN-001`, `OAS-LEG-001`, `OAS-OPS-001`, `OAS-TECH-001` | 4 | `DUPLICATION-MAP.md` Addendum §116–127 |
| C8 | Same ID, unrelated documents, department Framework tier | Finance (4), Operations (9), Technology (5) | 18 | Addendum §129–137 |
| C9 | Same ID, unrelated documents, department SOP tier | Finance (4), Legal (4), Technology (4), Operations (13) | 25 | Addendum §139–144 |
| C10 | Reference collision — same ID, different meaning, different registers | `CAP-011` (CAP-REGISTER.md's "Adaptive Communication" vs. the OAS series' entrenched-provisions amendment sense) | 1 | Addendum §191 item 11 |
| C11 | Missing-file-extends-collision-family | `BRAND-001` (only exists in `docs/canon/branding/`, but `docs/branding/README.md` lists it as its own) | 1 | Addendum §158 |
| C12 | Byte-identical content under two different IDs | `PA-004` / `PA-005` | 1 | `DUPLICATION-MAP.md` §"A — Exact byte-for-byte duplicates" |
| C13 | Different IDs, same role, same title, incompatible specifics | `OC-001` (experience) vs. `MJC-002` (member-journey) — both "Opening Ceremony Canon" | 1 | Addendum §146–148 |
| C14 | Different IDs, same title, incompatible frameworks | `MJC-001` vs. `MS-001` — both "Member Journey Canon" | 1 | Addendum §150–152 |
| C15 | Two parallel, independently-numbered series covering the same domain | `docs/canon/brand-and-identity/` (BR-*) vs. `docs/canon/branding/` (BRAND-*) | 1 (structural) | Addendum §154–156 |
| C16 | Two parallel, independently-numbered series claiming the same foundational role | `docs/frontend/canon/` (AFX-*) vs. `docs/03-member-experience/experience-canon/` (AXC-*) | 1 (structural) | Addendum §160–162 |
| C17 | Reference to a nonexistent sibling | `AICP-002` cites `AICP-001`, which does not exist under that name anywhere (see D2) | 1 | Addendum §212 |

**Total documented identity conflicts: 86 same-ID collisions (C1–C3, C5, C7–C10 numerically) + 8 structural/reference-level conflicts (C4, C6, C11–C17) that don't share a literal ID but are the same underlying defect.** No resolution, renumbering, merge, or canonical-copy selection is proposed for any item above — that is explicitly Category E territory.

---

## Category D — Missing Authority References (9 items)

Documented only. Every dependency is listed; none are authored or resolved here.

| # | Issue | Citing File(s) | Missing/Invalid Target | Impact |
|---|---|---|---|---|
| D1 | Missing governing document | 26 files across `docs/03-member-experience/experience-canon/` and `frontend-blueprints/` | `AXC-000 — Experience Constitution` | Every file in that tree cites a governing document that doesn't exist |
| D2 | Missing sibling document | `docs/canon/ai/AICP-002` | `AICP-001` | AICP-002 has no parent to be subordinate to (note: `docs/governance/protocols/ARM-001` contains what appears to be intended AICP-001 content, misfiled — see B4/A9/E7; PR #49 proposes a rename that would resolve this) |
| D3 | Missing register entries | `docs/constitution/registers/ACR-001` | `ACR-002`, `ACR-003`, `ACR-004`, `AFR-001` | The definitions register's own stated structure points at documents that don't exist |
| D4 | Missing CAP entry | `docs/constitution/OAS-004`'s drafting notes | `CAP-019` | Cited amendment proposal not in `CAP-REGISTER.md`'s 14 recorded CAPs |
| D5 | Missing document, README overclaims | `docs/branding/README.md` | `BRAND-001` (not present in `docs/branding/`; only exists in `docs/canon/branding/`) | README lists a document that isn't in its own directory |
| D6 | Broken authority chain | `docs/communications/OAS-COM-003`, `OAS-COM-004`, `sops/OAS-COM-101` | `OAS-COM-002` (exists but is a 92-byte stub — functions as missing) | Three real documents cite an authority that has no actual content |
| D7 | Undefined placement in the stated hierarchy | `FOUNDATION-003 — Canon Hierarchy`'s own Canon Order | `docs/foundry/founders-office/*` (7 files) and `docs/foundry/personal-steward/PS-001` | These 8 specialized-constitution documents are never mentioned by the one document whose job is to place everything in a hierarchy — not a conflict (they don't contradict it), a gap |
| D8 | Self-declared supreme authority with no cited superior | `docs/architecture/experience/AEX-000 — Experience Constitution.md` | (none cited) | Every department Charter at least nominally cites something (OAS-001, or in one case a body); AEX-000 cites nothing above itself at all |
| D9 | ~100+ documents cite an authority whose own status contradicts how it's cited | 9 constitutional articles (`OAS-006`–`011`) + 12-of-13 department Charters + their Framework/SOP descendants | `OAS-001` — exists only as `docs/drafts/OAS-001_Draft_0.95.md`, self-labeled "Not yet ratified" | This is the single largest dependency chain in the corpus; logged here as a D-pattern (invalid citation — citing something as settled that its own text says isn't) and cross-referenced to E2, which is where the actual ratification question lives |

---

## Category E — Needs Founder Decision (18 items)

Nothing in this category is decided, attempted, or defaulted here. Ranked roughly by how many other items depend on it, not by discovery order.

| # | Decision Needed | Scope / Files | Why It Can't Be Mechanical | Blocks |
|---|---|---|---|---|
| E1 | Which document is the actual apex constitutional authority of Aureus | `ALC-001`, the OAS-001-dependent series, `FOUNDATION-001/003`, `GV-003`, `AI-016`/`AI-050`/`AI-052`/`AI-056`, `ENG-001`, `ENG-010` — 7 independent, uncoordinated supremacy statements | This is the definition of a constitutional-authority question | E4, E5, E6, E15, E16, E17, and indirectly nearly everything else |
| E2 | Ratify `OAS-001`, or formally relabel every document that already treats it as ratified | `docs/drafts/OAS-001_Draft_0.95.md` + ~100 downstream documents | Ratification is a Founder act by definition | D9, and by extension most of the department-Charter tier's legitimacy |
| E3 | Renumbering rulings for all 86 confirmed same-ID collisions (C1–C3, C5, C7–C10) | See Category C table | Deciding which document "keeps" an ID and which is renumbered is a judgment about which document is the real one | Any future consolidation/reorg phase |
| E4 | Reconcile `GV-003` and the 3 other hierarchy schemes (`AI-016`, `ENG-001`, `ENG-010`) once E1 resolves | `docs/canon/governance/GV-003`, `docs/canon/ai/AI-016`, `docs/canon/engineering/ENG-001`, `ENG-010` | Downstream of E1 by construction | — |
| E5 | Canonical source for `OAS-004`/`005`/`006` | `docs/constitution/` vs. `docs/docs/constitution/` | Choosing which directory's version is "the" document is a canon decision, even though both copies need the same mechanical cleanup (A1/A2) either way | A6, C6, C5 resolution |
| E6 | Canonical draft for `SC-001` (Steward Constitution) | Two forks, different claimed authority levels ("Constitutional" vs. "Supreme Steward Document") | Reconciling philosophy/authority-level differences is not mechanical | C4 resolution |
| E7 | Real Risk Management Protocol content | `ARM-001` — currently contains zero risk-management content | There is currently no Risk Management Protocol anywhere in the repo; someone has to decide what it says, and whether the misfiled AICP-001 content should relocate per PR #49's proposal | A9, B4, D2 (partially) |
| E8 | Author (or accept as intentionally incomplete) `ALC-011` Articles XIII–XVIII | `docs/constitution/alc/ALC-011` | No recoverable source text exists | B1 |
| E9 | Determine whether `ALC-009`/`013` are intentionally short or truncated | Both files | No recoverable source text exists to compare against | B2 |
| E10 | Approve the A1/A2/A3/A10 commentary-stripping batch | 8 files listed in Category A | Even though the *mechanics* are safe, this phase's charter says no corpus document is edited without explicit go-ahead | A1, A2, A3, A10 (currently sitting ready, unexecuted) |
| E11 | Resolve `CAP-011`'s two meanings; author or dismiss `CAP-019` | `docs/constitutional/register/CAP-REGISTER.md`, `docs/constitution/OAS-006`–`011` | Requires judgment about which "CAP-011" is legitimate | C10, D4 |
| E12 | Disposition of `docs/docs/constitution/` as a whole | 9 files | It's a partial, non-overlapping parallel drafting track, not a simple mirror to delete — requires reviewing what's uniquely there (e.g. its `OAS-002`/ACA numbering) before any decision | A6, C6 |
| E13 | Author or formally retire `ACR-002`/`003`/`004`, `AFR-001` | Referenced by `ACR-001` | No content exists to recover | D3, B3 |
| E14 | Regenerate real `OAS-COM-002` content | `docs/communications/OAS-COM-002` | No content exists to recover | A7, A8, B6, D6 |
| E15 | `AEX-000`'s uncited supremacy claim | `docs/architecture/experience/AEX-000` | Part of the broader E1 question, but distinct enough to flag: this document claims supremacy within its domain while citing no superior at all, unlike every department Charter | D8, E1 |
| E16 | `IC-001`'s "Implementation Constitution" self-declaration | `docs/implementation/IC-001` | Self-declared "Canonical" with no ratification trail; needs either retitling away from "Constitution" or formal ratification against a named document | E1 |
| E17 | Cross-check `PC-001`/`PC-041`/`PC-053` for contradiction with constitutional material | `docs/production-canons/` | Requires the supremacy question (E1) settled first to know what to check against | E1 |
| E18 | AFX vs. AXC, BR vs. BRAND, OC-001 vs. MJC-002, MJC-001 vs. MS-001 — which series (if either) is authoritative | C13–C16 | Each is a genuine parallel-authorship situation requiring a content/ownership call, not a mechanical merge | C13, C14, C15, C16 |

---

## What this plan recommends happening next (still no execution without your go-ahead)

1. **Category A (A1–A4, A10)** is genuinely ready — 9 files, one consistent rule for the commentary-stripping batch, one trivial README sync. If you want this executed, say so explicitly (E10 exists precisely because this phase's charter says not to assume that).
2. **Category B and D** are fully documented; nothing to execute until the relevant E-item(s) they're chained to are resolved.
3. **Category C** is complete as a documentation exercise — 86 collisions + 8 structural conflicts, zero resolutions proposed.
4. **Category E** is the actual decision packet — 18 items, ranked, with dependencies shown so you can see which few decisions (chiefly E1 and E2) unlock the most downstream work.

Nothing on `main` has changed. This plan lives only in `docs/consolidation-program/CORPUS-INTEGRITY-REPAIR-PLAN.md` on the `docs/repository-consolidation` branch (PR #50, still draft).
