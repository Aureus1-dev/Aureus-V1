# CIA-001 — Master Remediation Plan

**Parent protocol:** CIA-001 — Constitutional Integrity Audit (Phase 8 deliverable)
**Status:** Complete draft — awaiting Founder approval per Priority 6. **Nothing in this plan has been executed.** The only change already made to the repository is MDR-013 (AICP-001), which was the Founder's own pre-approved Immediate Exception, executed and documented separately.
**Date:** 2026-07-21

---

## How to read this plan

Each item lists: Priority (repair-order tier, see Dependency Graph), Founder Decision Required (yes/no — some items are mechanical enough that a delegated authority could execute them per ENG-001 §5, flagged where applicable), Dependencies, Estimated Effort, Risk, Files Affected, and Validation Steps. Items are grouped by the tier they belong to in the Dependency Graph, not by MDR number order.

---

## Tier 0 — Root decisions (block the most downstream items; recommend resolving first)

### R-001 (resolves MDR-015, MDR-002, MDR-001)

- **Decision needed:** (a) Ratify OAS-001 or designate a different supreme document; (b) declare whether ALC-001 or the OAS lineage is constitutionally supreme; (c) declare which of "Steward"'s three ALC-001 senses is canonical.
- **Founder Decision Required:** Yes — this is pure constitutional interpretation, cannot be delegated.
- **Dependencies:** None (this is the root).
- **Estimated effort:** Founder time only; once decided, the mechanical repair (repository-wide Authority-citation update) is small — estimated 1–2 hours of find/replace across ~40 charter files, each independently verifiable.
- **Risk:** High if skipped/rushed — an incorrect or hasty answer here propagates to every downstream document that cites constitutional authority (currently none do by number, but future documents will).
- **Files affected (once decided):** Every charter-level document currently citing "OAS-001 — Founding Charter" (~40 files across constitution/operations/technology/security/risk/data/HR/legal/finance/communications) would need their Authority line confirmed or updated.
- **Validation steps:** After the citation update, re-run a repository-wide grep for "OAS-001" and confirm every remaining reference resolves to the newly-ratified/designated document, not the draft.

## Tier 1 — Independent, low-risk, ready to execute once approved

### R-002 (MDR-006 — PC-0XX truncation, Tier 1/2 subset only)

- **Founder Decision Required:** Recommend yes (constitutional-adjacent, even though PC-0XX isn't in the frozen-path list) — but this is a template-shell reconstruction, not new doctrine, so could be delegated if the Founder prefers.
- **Dependencies:** None.
- **Estimated effort:** Small — 10 files (8 Tier 1 + 2 Tier 2) need only their uniform footer reconstructed from the 30-complete-file template.
- **Risk:** Very low — footer fields (Version/Status/Approved By/Supersedes/Superseded By/Last Updated) are 100% uniform across the 30 complete PC files; no doctrine is being invented.
- **Files affected:** PC-003, 019, 020, 022, 023, 029, 033, 036, 038, 057 (10 files).
- **Validation steps:** Diff each repaired file against its pre-repair snapshot to confirm only the footer changed; confirm the reconstructed footer text is byte-identical to the shared template found in the 30 complete files.

### R-003 (MDR-006 — PC-0XX Tier 3, 20 files)

- **Founder Decision Required:** Yes — this is not reconstruction, it's new authorship (lost content cannot be recovered from repository evidence).
- **Dependencies:** None technically, but this is a much larger undertaking than R-002 and should be scoped as its own drafting work order, not a "repair."
- **Estimated effort:** Large — 20 canons, each missing an entire concluding section; likely one drafting pass per canon plus Founder review.
- **Risk:** Medium — new doctrine being written into canonical-track documents; should go through the same Founder-review status these documents already carry.
- **Files affected:** PC-007, 010, 017, 021, 024, 025, 026, 027, 031, 032, 040, 042, 044, 048, 049, 054, 055, 056, 058, 059.
- **Validation steps:** Each newly-drafted section reviewed against the canon's own stated Purpose/Definition (its surviving early sections) for thematic consistency; Founder sign-off per canon.

### R-004 (MDR-007 — AI Canon truncation)

- **Founder Decision Required:** Shell/tagline: no (mechanical). Lost content (AI-002 Levels 1–3, AI-004 stages 7–12): yes.
- **Dependencies:** None.
- **Estimated effort:** Small for the shell (7 files); Medium for the two unfulfilled-promise content gaps.
- **Risk:** Very low for shell; Medium for new content (same reasoning as R-003).
- **Files affected:** AI-001, 002, 003, 004, 007, 030, 053.
- **Validation steps:** Same diff-based approach as R-002 for the shell portion.

### R-005 (MDR-008 — PA-004/005 duplicate + Member Core/Admin&Ops gap)

- **Founder Decision Required:** Yes — this is new architecture authorship, not a mechanical fix.
- **Dependencies:** None.
- **Estimated effort:** Medium-Large — two new architecture documents (Member Core, Administration & Operations) need to be written from scratch, following the PA-006–015 template.
- **Risk:** Medium — until written, PA-005 should at minimum be annotated as a known placeholder/mismatch rather than left silently wrong.
- **Files affected:** PA-004 (no change), PA-005 (archive/annotate), two new files to be created.
- **Validation steps:** New documents reviewed against PA-001/002's original 12-system framework for completeness; confirm PA-005's mismatch is either resolved or clearly annotated.

### R-006 (MDR-014 — OC-001/MJC-002)

- **Founder Decision Required:** Recommend Founder confirm, but could be delegated (ENG-001 §5 — internal code/content organization) since it doesn't touch governance/security/pricing/business rules.
- **Dependencies:** None.
- **Estimated effort:** Very small — either an archival note on OC-001 or a cross-reference addition to both files.
- **Risk:** Very low.
- **Files affected:** OC-001, MJC-002.
- **Validation steps:** Confirm both files' content remains intact; confirm whichever relationship is declared is stated in both directions (not just one file pointing at the other).

### R-007 (MDR-020 — OAS-COM-002 void file)

- **Founder Decision Required:** Yes — requires new content authorship.
- **Dependencies:** None.
- **Estimated effort:** Medium — one new charter-level document, following the OAS-COM-001/003/004 template already established.
- **Risk:** Medium until written (7 files currently cite empty content as authoritative).
- **Files affected:** OAS-COM-002 (new content), OAS-COM-003, 004, 101, 102, 103, 104 (no change needed once 002 is populated — their citations already correctly name it).
- **Validation steps:** Confirm the 7 citing files' quoted titles now resolve to real content; confirm new content follows the established Charter template (Purpose/Mission/Scope/Guiding Principles/.../Revision History).

### R-008 (MDR-021 — broken cross-references)

- **Founder Decision Required:** No — recommend delegating, pure documentation correction.
- **Dependencies:** None.
- **Estimated effort:** Very small — one typo fix (WO-011→WO-025), and three annotation/documentation decisions (PR-001, IC-008/010, IDR series — either author or explicitly deprecate the references).
- **Risk:** Very low.
- **Files affected:** `WO-030-Pods.md`; `PR-002/003/004` (annotation only); `IC-009`, `IC-011` and successors (annotation or new IC-008/010 authorship).
- **Validation steps:** Confirm WO-030's dependency line now correctly reads WO-025; confirm PR-002/003/004 either link to a real PR-001 or clearly state it was delivered outside the repo; confirm IC citations match reality.

## Tier 2 — Requires the standing freeze to be lifted or an exception granted

### R-009 (MDR-003 — ALC-001 Appendix A dedup)

- **Founder Decision Required:** Yes (frozen path).
- **Dependencies:** Freeze must clear; independent of Tier 0's authority question (dedup doesn't touch the disputed content).
- **Estimated effort:** Trivial — fix already drafted, verified safe, held in `git stash`.
- **Risk:** Very low — diff-verified to touch only the 161 duplicate lines.
- **Files affected:** `docs/constitution/ALC-001-Aureus-Living-Constitution.md`.
- **Validation steps:** Already done — diff confirms only the second Appendix A copy is removed; all 20 definitions, the Steward contradiction (untouched, as required), and every other line remain byte-identical.

### R-010 (MDR-009 — leaked editorial commentary, OAS-007/008/009/010/011)

- **Founder Decision Required:** Yes (frozen path).
- **Dependencies:** Freeze must clear.
- **Estimated effort:** Trivial — fix already drafted, held in `git stash`.
- **Risk:** Very low — diff-verified.
- **Files affected:** `docs/constitution/OAS-007/008/009/010/011-*.md`.
- **Validation steps:** Already done — diff confirms governing text (through "End of draft" marker) is byte-identical; only trailing contamination removed.

### R-011 (MDR-004 — ALC-002 Article XL/XLIII/XXX)

- **Founder Decision Required:** Yes (frozen path + judgment call on Article XXX renumbering).
- **Dependencies:** Freeze must clear.
- **Estimated effort:** Small for XL/XLIII (mechanical); Medium for XXX (requires deciding where the renumbering boundary falls).
- **Risk:** Low for XL/XLIII; Medium for XXX (touches more of a 5,912-line document).
- **Files affected:** `docs/constitution/ALC-002-Preamble-to-the-Constitution.md`.
- **Validation steps:** Diff against pre-repair snapshot; for XXX, confirm every Article after the renumbering point shifted consistently with no new gaps or collisions.

### R-012 (MDR-005 — ALC-011 dedup; XIII–XVIII gap NOT filled)

- **Founder Decision Required:** Yes (frozen path). The dedup itself is mechanical; whether to author Articles XIII–XVIII is a separate, larger decision.
- **Dependencies:** Freeze must clear.
- **Estimated effort:** Trivial for dedup; Large (new authorship) if the gap is to be filled — recommend treating gap-filling as out of scope for this remediation pass.
- **Risk:** Low for dedup; not applicable for the gap (not being touched).
- **Files affected:** `docs/constitution/alc/ALC-011-The_Constitutional_Commitments_of_Aureus.md`.
- **Validation steps:** Diff confirms only the duplicate VII–XII block removed; confirm the Article XIII–XVIII gap is explicitly documented as a known, unfilled gap (not silently left ambiguous).

### R-013 (MDR-010 — `docs/docs/constitution/` archival)

- **Founder Decision Required:** Yes (frozen path).
- **Dependencies:** Freeze must clear.
- **Estimated effort:** Small — `git mv` the 9-file directory to an archive location with a manifest, per the Founder's own "archive, don't delete" instruction.
- **Risk:** Very low — confirmed via repository-wide search that no code or document references this directory's paths.
- **Files affected:** All 9 files in `docs/docs/constitution/`.
- **Validation steps:** Confirm the 9 files are preserved (not deleted) at the new archive path with hashes matching pre-move; confirm the old path no longer exists or contains only a pointer note.

### R-014 (MDR-011 — CAP-REGISTER broken references)

- **Founder Decision Required:** Yes (frozen path — `docs/constitutional/`).
- **Dependencies:** Freeze must clear.
- **Estimated effort:** Small — either locate/author the 13 missing referenced documents, or annotate the register to mark them as aspirational/not-yet-authored.
- **Risk:** Very low.
- **Files affected:** `docs/constitutional/register/CAP-REGISTER.md`.
- **Validation steps:** Confirm every reference in the register either resolves to a real document or is explicitly marked as not-yet-authored.

## Tier 3 — Domain-canon duplication (not frozen, but per PD-000's framing, treated as a Founder-review gate)

### R-015 (MDR-016 — Operations Canon: two parallel lineages + 1 truncated file)

- **Founder Decision Required:** Recommend yes given scope, though could delegate the *mechanical* archival once a canonical-lineage decision is made.
- **Dependencies:** Depends on which lineage is designated canonical per number (Founder or delegated content-authority decision); independent of Tier 0.
- **Estimated effort:** Medium — 17 pairs/triplets in the main directory, 13 SOP numbers, plus reconstructing the one truncated file (`OAS-OPS-102`) once its lineage is confirmed canonical.
- **Risk:** Low-Medium — archiving (not deleting) the non-canonical variant per number preserves history; the truncated file's missing content (Steps 4+ of its procedure) may not be reconstructable and could need new authorship.
- **Files affected:** ~30 files across `docs/operations/` and `docs/operations/sops/`.
- **Validation steps:** Confirm exactly one file per number remains as "canonical" post-repair, with the other(s) archived (not deleted) and cross-referenced; confirm the truncated file either gets its missing sections authored or is explicitly flagged as incomplete.

### R-016 (MDR-018 — Finance canon duplication)

- **Founder Decision Required:** Same pattern as R-015.
- **Dependencies:** Same pattern as R-015.
- **Estimated effort:** Medium — 5 top-level pairs + 4 SOP pairs + 2 title-collisions.
- **Risk:** Low-Medium.
- **Files affected:** ~18 files across `docs/finance/`.
- **Validation steps:** Same pattern as R-015.

### R-017 (MDR-019 — Technology canon duplication)

- **Founder Decision Required:** Same pattern as R-015.
- **Dependencies:** Same pattern as R-015.
- **Estimated effort:** Large — this is the widest single collision problem found (31 of 42 files).
- **Risk:** Low-Medium.
- **Files affected:** ~31 files across `docs/technology/` and `docs/technology/sops/`.
- **Validation steps:** Same pattern as R-015.

### R-018 (MDR-017 — Legal canon: duplication track only; legal-text track handled separately)

- **Founder Decision Required:** Duplication: same pattern as R-015. Missing legal text: yes, plus legal review — explicitly out of scope for this audit or any AI system to originate as binding policy.
- **Dependencies:** Duplication track independent; legal-text track depends on securing qualified legal review, entirely outside this remediation plan's scope.
- **Estimated effort:** Duplication: Medium (1 + 4 pairs + 1 title-collision). Legal text: Large, and not estimable by this audit (depends on legal counsel's process).
- **Risk:** Duplication: Low-Medium. Missing legal text: High from a launch-readiness standpoint if not tracked as its own priority item.
- **Files affected:** ~11 files across `docs/legal/` for duplication; new Terms of Service / Privacy Policy / consent-tracking documents (none currently exist) for the legal-text track.
- **Validation steps:** Duplication: same pattern as R-015. Legal text: sign-off from qualified legal review, not something this plan can validate on its own.

---

## Summary table

| Item | MDR | Tier | Founder Decision Required | Effort | Risk | Files |
|---|---|---|---|---|---|---|
| R-001 | 001, 002, 015 | 0 | Yes | Decision + small mechanical follow-up | High if rushed | ~40 |
| R-002 | 006 (Tier 1/2) | 1 | Recommend yes | Small | Very low | 10 |
| R-003 | 006 (Tier 3) | 1 | Yes | Large | Medium | 20 |
| R-004 | 007 | 1 | Shell: no; content: yes | Small/Medium | Very low/Medium | 7 |
| R-005 | 008 | 1 | Yes | Medium-Large | Medium | 2 existing + 2 new |
| R-006 | 014 | 1 | Recommend, delegable | Very small | Very low | 2 |
| R-007 | 020 | 1 | Yes | Medium | Medium | 1 new + 6 |
| R-008 | 021 | 1 | No, delegable | Very small | Very low | ~5 |
| R-009 | 003 | 2 | Yes (frozen) | Trivial | Very low | 1 |
| R-010 | 009 | 2 | Yes (frozen) | Trivial | Very low | 5 |
| R-011 | 004 | 2 | Yes (frozen) | Small/Medium | Low/Medium | 1 |
| R-012 | 005 | 2 | Yes (frozen) | Trivial (dedup only) | Low | 1 |
| R-013 | 010 | 2 | Yes (frozen) | Small | Very low | 9 |
| R-014 | 011 | 2 | Yes (frozen) | Small | Very low | 1 |
| R-015 | 016 | 3 | Recommend yes | Medium | Low-Medium | ~30 |
| R-016 | 018 | 3 | Recommend yes | Medium | Low-Medium | ~18 |
| R-017 | 019 | 3 | Recommend yes | Large | Low-Medium | ~31 |
| R-018 | 017 | 3 | Yes + legal review | Medium + Large (untracked) | Low-Medium / High | ~11 + new legal docs |

**Total items: 18 (covering 20 open defects; MDR-012 is folded into R-001's resolution and MDR-013 is already resolved).**

---

## Recommendation

Per Priority 6, this plan now returns for Founder approval. Nothing above has been executed. Suggested approval granularity: the Founder may approve tiers independently (e.g., approve Tier 1 to proceed immediately since it touches no frozen paths and needs no freeze decision, while Tier 0/2 await the authority-question decision, and Tier 3 awaits a decision on whether domain-canon duplication needs the same review rigor as the constitutional family).
