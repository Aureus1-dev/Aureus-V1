# CIA-001 — Master Defect Register

**Parent protocol:** CIA-001 — Constitutional Integrity Audit (Phase 7 deliverable)
**Status:** Complete — all domain-inventory passes returned (constitution/canon/architecture/frontend; work-orders/ADRs/verification/implementation/releases; operations/HR; technology/security/risk/data; legal/finance/communications). Full evidence in `CIA-001-11-Duplicate-Identifier-Register.md`.
**Date:** 2026-07-21
**Investigation status:** Per Founder Priority 4 ("Investigate every defect. Do not fix them."), every entry below includes root cause, impact, risk, and dependencies. **No repair has been executed for any entry in this register except MDR-013, which was the Founder's pre-approved Immediate Exception.**

Severity scale (per CIA-001 §Phase 7 / AQP-001 Defect Classification): Critical, High, Medium, Low, Informational.

---

### MDR-001 — ALC-001 defines "Steward" three incompatible ways

- **Severity:** Critical
- **Location:** `docs/constitution/ALC-001-Aureus-Living-Constitution.md` — Definitions §5 (lines ~1935/2091, both copies), Article V "The Stewardship Covenant" (lines 582–636), Article VI "The First Steward" (line 776)
- **Description:** The same word "Steward" is defined as (1) anyone holding delegated institutional authority, (2) a voluntary identity any Member may adopt, and (3) a specific governance office ("First Steward," "Stewardship Council"). All three are used elsewhere in the corpus (PC-012/013 use sense 1 cleanly; sense 2 and 3 are unique to ALC-001).
- **Evidence:** Direct quotes in the prior Governance Recovery Report §0 and this session's research; re-confirmed present and unchanged in the current working tree.
- **Root cause:** ALC-001 was very likely drafted across multiple sessions/passages (consistent with its other internal duplication defects, MDR-003) without a single definitions pass reconciling earlier and later Articles against the Definitions appendix.
- **Impact:** Blocks drafting any new constitution that uses "Steward" in its own name or definitions (e.g. a "Personal AI Steward Constitution") with internal consistency, since the term's supreme-authority definition is self-contradictory.
- **Risk if left unresolved:** Low near-term operational risk (no code depends on this text directly), but high governance risk — any future constitutional document inherits the ambiguity silently.
- **Risk if repaired incorrectly:** High — picking one sense over another is a substantive constitutional interpretation, not a mechanical fix, and would retroactively narrow or reinterpret Articles V and VI.
- **Dependencies:** None technical; fully dependent on a Founder decision (see Authority Matrix §4 and the previously-delivered Governance Recovery Report §0).
- **Recommended resolution:** Do not resolve mechanically. Present as a standing Founder Decision item (already done in the prior Governance Recovery Report).
- **Repair strategy:** N/A pending Founder decision.
- **Repair order:** Must resolve before any Steward-named constitution is drafted; independent of all other defects in this register.
- **Approval required:** Founder (constitutional interpretation).

---

### MDR-002 — Constitutional supremacy contradiction (ALC-001 vs. ALC-003/004/005 vs. OAS-001)

- **Severity:** Critical
- **Location:** `docs/constitution/ALC-001-Aureus-Living-Constitution.md` (Article I §1, Constitutional Seal); `docs/constitution/alc/ALC-003/004/005` ("derives its authority from the Founding Charter"); `docs/drafts/OAS-001_Draft_0.95.md` (explicitly unratified); `docs/constitution/OAS-007–011` (treat OAS-001 as settled, entrenched law)
- **Description:** Two independent, mutually exclusive claims to constitutional supremacy exist, and the document treated as the external "Founding Charter" by one of them is an explicitly unratified draft with nine open Founder questions.
- **Evidence:** See Authority Matrix §2–3 and the prior Governance Recovery Report §0/§4.
- **Root cause:** Two parallel constitutional drafting efforts (the ALC family and the OAS family) appear to have been produced without one ever formally establishing precedence over the other.
- **Impact:** Every document below this layer (PC-0XX, AI-0XX, ENG-0XX, etc.) implicitly assumes a single coherent chain of authority above it; that assumption does not currently hold.
- **Risk if left unresolved:** Medium-High — does not block current engineering work (nothing below cites ALC-001/OAS-001 by number), but blocks any future Constitutional Freeze (per CIA-001's own exit criteria) and any new top-level constitutional document.
- **Dependencies:** None technical. Fully a Founder decision.
- **Recommended resolution:** Founder must designate one of: (a) ALC-001 is supreme, OAS lineage is historical/superseded; (b) OAS-001 (once ratified) is supreme, ALC-001 is subordinate; (c) some explicit reconciliation neither document currently states.
- **Repair strategy:** Once decided, the losing family's supremacy language needs amendment (not deletion — per "Never destroy repository history," the superseded family should be archived with lineage documented, not removed).
- **Repair order:** Should resolve before MDR-001, since the "which Steward-definition wins" question may itself depend on which family is supreme.
- **Approval required:** Founder.

---

### MDR-003 — ALC-001 Appendix A duplicated in full

- **Severity:** High
- **Location:** `docs/constitution/ALC-001-Aureus-Living-Constitution.md`
- **Description:** All 20 sections of "Appendix A — Foundational Definitions" appear twice, byte-identical.
- **Evidence:** md5 `ca6e923d9e2d7f215748e695b2a2e0f9` for both 156-line blocks.
- **Root cause:** Mechanical copy-paste duplication during drafting; no unique content in either copy.
- **Impact:** Cosmetic/structural only — does not change what the Definitions actually say, just repeats them.
- **Risk if left unresolved:** Low.
- **Risk of repair:** Very low — a de-duplication proposal already exists (drafted, held in `git stash`, NOT applied), verified via diff to touch only the 161 duplicate lines and leave every other line of the 2,217-line file byte-identical.
- **Dependencies:** Blocked by MDR-002 (the broader constitutional-freeze question) — this file sits inside the frozen path (`docs/constitution/`) pending Founder review of the side-by-side diff comparison referenced in PR-002/PD-000.
- **Recommended resolution:** Apply the already-drafted de-duplication once the freeze is lifted or an exception is granted, exactly as documented in the (currently stashed, unapplied) diff.
- **Repair strategy:** Mechanical line-range deletion, already verified safe.
- **Repair order:** Can execute immediately once MDR-002's freeze question is cleared — no other dependency.
- **Approval required:** Founder (per standing freeze).

---

### MDR-004 — ALC-002 duplicate/collision Articles (XL, XLIII, XXX)

- **Severity:** Medium
- **Location:** `docs/constitution/ALC-002-Preamble-to-the-Constitution.md`
- **Description:** Article XL duplicated exactly; Article XLIII has two copies where the second is a superset of the first; Article XXX is used for two different, unrelated articles (a numbering collision, not a text duplicate).
- **Evidence:** md5 hashes and diff results in the Duplicate Identifier Register (D-03, D-04, D-05).
- **Root cause:** Same pattern as MDR-003 — mechanical drafting/copy-paste error across a very long (5,912-line) document.
- **Impact:** Article XL/XLIII duplication is cosmetic; Article XXX collision means two genuinely different pieces of content share one identifier, which could cause future citation ambiguity ("per Article XXX" would be ambiguous).
- **Risk if left unresolved:** Low for XL/XLIII, Medium for XXX (citation ambiguity risk grows over time as more documents might cite Article numbers).
- **Dependencies:** Same frozen-path constraint as MDR-003.
- **Recommended resolution:** XL/XLIII: keep the longer/complete copy, mechanical. XXX: requires renumbering every subsequent article by one — a judgment call on where the "correct" article boundary falls, best made by whoever can determine original drafting intent.
- **Repair strategy:** XL/XLIII mechanical; XXX requires a Founder or drafting-owner decision on sequencing before it can be called mechanical.
- **Repair order:** After MDR-003 (same file family, same freeze dependency); XXX should be resolved after XL/XLIII since renumbering touches more of the document.
- **Approval required:** Founder (frozen path) + drafting judgment call for Article XXX specifically.

---

### MDR-005 — ALC-011 duplicated Articles VII–XII with a resulting six-Article gap (XIII–XVIII)

- **Severity:** High
- **Location:** `docs/constitution/alc/ALC-011-The_Constitutional_Commitments_of_Aureus.md`
- **Description:** Articles VII–XII are duplicated verbatim; the numbering then jumps straight to Article XIX, meaning Articles XIII–XVIII never exist.
- **Evidence:** md5 `52df0c24b91a659d0acf01d1c0baaa75` for both 69-line blocks; confirmed absence of XIII–XVIII anywhere in the file.
- **Root cause:** Consistent with MDR-003/004 — a block was pasted twice and the numbering was never corrected, and (uniquely here) an entire six-Article segment appears to have never been written in the first place.
- **Impact:** The duplication itself is cosmetic and safely removable. The XIII–XVIII gap is a genuine content gap — six Articles' worth of "Constitutional Commitments" simply do not exist.
- **Risk if left unresolved:** Medium — this is a substantive content gap, not just a formatting defect; leaving it unresolved means the "Commitments" enumerated 1-24 are actually incomplete.
- **Dependencies:** Same frozen-path constraint. The gap-filling (writing Articles XIII–XVIII) cannot be done by this audit at all — there is no repository evidence of what those Articles were meant to say (confirmed: no draft, no work order, no git history references them).
- **Recommended resolution:** De-duplicate the VII–XII block (mechanical, safe). Do NOT attempt to author XIII–XVIII without explicit Founder direction — this would be new constitutional authorship, not reconstruction.
- **Repair strategy:** De-dup is mechanical; gap-fill is out of scope for repair and requires new Founder-directed drafting.
- **Repair order:** De-dup can follow MDR-003/004 pattern; gap-fill is a separate, larger, drafting-scale work item, not a "repair."
- **Approval required:** Founder (frozen path + drafting decision on whether/how to fill the gap).

---

### MDR-006 — PC-0XX corpus: 30 of 60 Production Canons truncated

- **Severity:** High (aggregate); individually ranges Medium (footer-only truncation) to High (mid-body truncation before any Closing Principle)
- **Location:** `docs/production-canons/` — see the original Governance Recovery Report for the full 30-file breakdown across 3 severity tiers
- **Description:** Half the Production Canon library cuts off before completion — 8 files lose only their footer, 2 lose part of their Closing Principle sentence, 20 lose an entire concluding section (5 of those cut off immediately after a bare heading with zero body text).
- **Evidence:** Exact cut-point quotes for all 30 files, delivered in the original Governance Recovery Report.
- **Root cause:** Consistent with a generation/authoring process that was interrupted partway through each file, likely in a batch process (PC-008 shows literal leftover progress-tracking text — "Production Canons Completed: 7/60" — suggesting these were generated in a tracked sequence and some entries were cut short mid-batch).
- **Impact:** None of the 60 Production Canons are Founder-approved regardless (all show "Approved By: —"), so no currently-relied-upon governing text is missing from active use — but the corpus cannot be considered ready for Constitutional Freeze in its current state.
- **Risk if left unresolved:** Medium — no immediate operational impact, but blocks CIA-001's own exit criteria ("every governing document has been reviewed... the repository is certified ready for Constitutional Freeze").
- **Dependencies:** Docs/production-canons/ is NOT among the five explicitly frozen paths (it is a separate directory from docs/constitution/, docs/docs/constitution/, docs/constitutional/, docs/sessions/, docs/drafts/) — this register notes that as a fact, not a recommendation to proceed; given PD-000's broader finding that duplication/incompleteness is a repo-wide pattern, this family should still go through the same Founder-approval gate as the rest of this Master Defect Register before any repair.
- **Recommended resolution:** Tier 1 (footer-only, 8 files) and Tier 2 (mid-sentence Closing Principle, 2 files) footer can be reconstructed with high confidence from the uniform template shared by all 30 complete PC files. Tier 3 (20 files, mid-body) cannot be reconstructed — the lost content requires new authorship.
- **Repair strategy:** Template-shell reconstruction for Tier 1/2 (low risk, mechanical); Tier 3 requires new Founder-directed drafting per canon, not a repair.
- **Repair order:** Independent of the constitutional-freeze family (MDR-001 through MDR-005) — can proceed in parallel once Founder approves this Master Defect Register and Remediation Plan.
- **Approval required:** Founder (per Priority 6 — nothing executes until the Remediation Plan is approved).

---

### MDR-007 — AI Canon: 7 of 58 files truncated, 2 with unfulfilled internal promises

- **Severity:** Medium (aggregate)
- **Location:** `docs/canon/ai/AI-001, 002, 003, 004, 007, 030, 053`
- **Description:** Each cuts mid-word or mid-list within a body article and is missing its closing "Foundational Standard" article and tagline. AI-002 promises four "authority levels" but only defines Level 0; AI-004 promises a 12-stage lifecycle but only reaches stage 6.
- **Evidence:** Exact cut-point quotes in the original Governance Recovery Report.
- **Root cause:** Same batch-interruption pattern as MDR-006.
- **Impact:** AI-002 and AI-004's unfulfilled promises are more consequential than simple truncation — downstream reasoning that assumes "four authority levels exist" or "12 lifecycle stages are defined" would be relying on content that was never written.
- **Risk if left unresolved:** Medium — these are foundational AI-governance documents (Authority Levels, Agent Lifecycle); any future work order that assumes their full content exists should first verify it does.
- **Dependencies:** None technical; independent of the constitutional-freeze family.
- **Recommended resolution:** Closing article/tagline shell reconstruction possible with high confidence (uniform across 51 complete siblings) for the boilerplate only. The missing Levels 1–3 and stages 7–12 content is not reconstructable from repository evidence.
- **Repair strategy:** Shell reconstruction is mechanical; content gaps require new Founder-directed drafting.
- **Repair order:** Independent, can proceed in parallel with MDR-006 once approved.
- **Approval required:** Founder.

---

### MDR-008 — PA-004/PA-005 duplicate; Member Core and Administration & Operations architecture missing entirely

- **Severity:** High
- **Location:** `docs/product-architecture/PA-004-user-journey-architecture.md`, `PA-005-member-experience-architecture.md`
- **Description:** PA-005 is a byte-identical copy of PA-004's content, mislabeled. Separately, 2 of the 12 core systems named in PA-001/PA-002 (Member Core, Administration & Operations) never received a dedicated architecture document at all.
- **Evidence:** md5 `b28ca113d0aaa230c4c05245343c52b6`, both files.
- **Root cause:** Most likely PA-005 was intended to be the Member Core/Member Experience architecture document and was accidentally populated with a copy of PA-004 during drafting; the Administration & Operations gap appears to be a simple omission.
- **Impact:** Member Core is one of the most central systems in the product (per PA-001) and currently has no dedicated architecture document — this is a genuine content gap, not just a duplication cosmetics issue.
- **Risk if left unresolved:** Medium-High — future engineering work on Member Core has no canonical architecture reference to build against.
- **Dependencies:** None technical.
- **Recommended resolution:** This is not a "repair" in the mechanical sense — it requires new authorship of an actual Member Core Architecture document (and, separately, an Administration & Operations Architecture document). The duplicate PA-005 should be archived/flagged as a placeholder pending that authorship, not silently fixed by deleting content.
- **Repair strategy:** Archive current PA-005 content with a note explaining the mismatch; commission new Member Core Architecture and Administration & Operations Architecture documents as their own work items (out of scope for a "repair").
- **Repair order:** Independent; likely a larger work item than most other entries in this register, worth tracking separately in the Remediation Plan.
- **Approval required:** Founder (scope/priority decision — this is closer to new product-architecture work than defect repair).

---

### MDR-009 — Editorial/chat commentary leaked into canonical constitutional documents

- **Severity:** Medium
- **Location:** `docs/constitution/OAS-007, 008, 009, 010, 011` (canonical directory, not just the stray `docs/docs/` tree)
- **Description:** Raw Founder/AI review commentary and "create this GitHub file" workflow instructions are appended past each file's proper "End of OAS-0XX draft" marker (91–166 extra lines in three files; a shorter stray leaked path-fragment in two others).
- **Evidence:** Exact quotes and byte offsets in the original Governance Recovery Report §1's "OAS-007/010/011" and "OAS-008/009" findings.
- **Root cause:** Copy-paste artifact from whatever process was used to draft/review these documents and commit them to the repository — review commentary that should have stayed in a chat/review tool ended up saved into the canonical file.
- **Impact:** Cosmetic — the actual constitutional text (everything up to and including the "End of draft" marker) is unaffected and complete.
- **Risk if left unresolved:** Low technical risk, but continues to make these 5 documents look unprofessional/unreviewed to anyone reading them directly, and risks someone mistaking the leaked commentary (e.g. "I'd rate it 9.9/10") for actual governing content.
- **Dependencies:** A trim proposal already exists (drafted, held in `git stash`, NOT applied) — verified to remove only the contamination and leave the governing text (including the "End of draft" line itself) byte-identical.
- **Recommended resolution:** Apply the already-drafted trim once the constitutional freeze (MDR-002-adjacent, same frozen path) is resolved or an exception is granted.
- **Repair strategy:** Mechanical, already verified safe (diff-checked against original).
- **Repair order:** Can execute alongside MDR-003 once the freeze question clears — same file family, same dependency.
- **Approval required:** Founder (frozen path).

---

### MDR-010 — `docs/docs/constitution/` stray directory (9 files: 1 exact duplicate, 3 contaminated partials, 5 orphans)

- **Severity:** Medium
- **Location:** `docs/docs/constitution/`
- **Description:** A stray, non-canonical directory containing an exact duplicate of OAS-003, three files that duplicate the first portion of the (mismatched) canonical OAS-004/005/006 and then append review commentary, and five orphan documents (OAS-002, OAS-ACA-004/005/009/010) with no canonical counterpart anywhere.
- **Evidence:** Full breakdown in the original Governance Recovery Report §8.
- **Root cause:** Appears to be an accidental duplicate directory structure (`docs/docs/` instead of `docs/`) created at some point during drafting and never cleaned up.
- **Impact:** Low direct impact (no code references this path — confirmed by repository-wide search), but it's a standing source of confusion for anyone navigating the repository, and per PD-000, no file under this path may be modified, merged, or deleted until the Founder reviews the outstanding side-by-side diff comparison.
- **Risk if left unresolved:** Low technical risk; ongoing navigational/governance confusion risk.
- **Dependencies:** Explicitly named in the standing freeze (PR-002, PD-000, PR-003) — cannot be touched, including archival, until that freeze is addressed.
- **Recommended resolution:** Per the Founder's most recent instruction, resolve via archival (not deletion) once the freeze is cleared — preserving the 5 orphan documents' unique content (OAS-002 orphan, OAS-ACA-004/005/009/010) rather than losing them.
- **Repair strategy:** `git mv` the whole directory to an archive location with a manifest, once approved.
- **Repair order:** Should be one of the first items addressed once the freeze clears, since it's purely archival (lowest risk of the frozen-path items).
- **Approval required:** Founder (frozen path).

---

### MDR-011 — `docs/constitutional/register/CAP-REGISTER.md` references 13 non-existent documents

- **Severity:** Medium
- **Location:** `docs/constitutional/register/CAP-REGISTER.md`
- **Description:** Cites a source session file (`CAP-SESSION-2026-07-13.md`) and 12 distinct "Charter" companion documents (Stewardship Charter, Academy Charter, etc.) across its 14 CAP entries — none of the 13 referenced documents exist anywhere in the repository.
- **Evidence:** Exhaustive repository-wide search performed in the original Governance Recovery Report §5; confirmed no matches.
- **Root cause:** Unclear — either the referenced documents were never created, or they exist under different names that were never reconciled with this register.
- **Impact:** All 14 CAPs are explicitly "Draft" status, "pending constitutional review" per the register's own text — no CAP has been approved or merged into canonical documents, so this doesn't currently misrepresent anything as settled. But the register's credibility is undermined by citing sources that don't exist.
- **Risk if left unresolved:** Low — informational/organizational risk only.
- **Dependencies:** `docs/constitutional/` is one of the five explicitly frozen paths.
- **Recommended resolution:** Either locate/create the referenced Charter documents, or annotate the register to mark those references as aspirational/not-yet-authored rather than implying they exist.
- **Repair strategy:** Documentation-only; no content is being deleted or reinterpreted, just accurately labeled.
- **Repair order:** Low priority, can follow the rest of the frozen-path cleanup.
- **Approval required:** Founder (frozen path).

---

### MDR-012 — Governance-infrastructure layer (AMI-001/AQP-001/CIA-001/AICP-001/AICP-002) does not declare its relationship to ALC-001/OAS-001

- **Severity:** Medium
- **Location:** `docs/governance/registry/AMI-001-Aureus-Master-Index.md`, `docs/governance/protocols/AQP-001-Aureus-Quality-Protocol.md`, `docs/governance/audits/CIA-001-Constitutional-Integrity-Audit.md`, `docs/canon/ai/AICP-001`, `docs/canon/ai/AICP-002`
- **Description:** All five declare "Authority: Repository Governance" (or equivalent), a level not defined anywhere in ALC-001's or OAS-001's own text, and none states explicitly where it sits in the Authority Matrix relative to the Constitution.
- **Evidence:** Direct reading of all five documents' headers, this session.
- **Root cause:** These documents were created very recently (2026-07-20–21), likely as a fast-moving new initiative, before the broader constitutional-hierarchy question (MDR-002) was resolved.
- **Impact:** Low immediate impact — these documents are self-consistent and don't contradict anything, they simply haven't yet declared their place in the hierarchy.
- **Risk if left unresolved:** Low-Medium — grows over time as more repository processes come to depend on this layer without a settled understanding of its authority relative to the Constitution.
- **Dependencies:** Best resolved after MDR-002 (overall supremacy question), since this layer's authority should logically be stated relative to whichever document wins that question.
- **Recommended resolution:** Add an explicit "Relationship to Constitutional Authority" statement to AMI-001/AQP-001/CIA-001/AICP-001/AICP-002 once MDR-002 is resolved.
- **Repair strategy:** Additive documentation only — no existing text needs to change, just a new section.
- **Repair order:** After MDR-002.
- **Approval required:** Founder.

---

### MDR-013 — AICP-001 identity/location mismatch — RESOLVED

- **Severity:** Was Medium; now Resolved
- **Location:** Was `docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md`; now `docs/canon/ai/AICP-001-Aureus-AI-Collaboration-Protocol.md`
- **Description:** See Duplicate Identifier Register D-09.
- **Resolution:** Executed 2026-07-21 per the Founder's pre-approved "Immediate Exception" (pure identity/location correction, no governing-text change, git history preserved via `git mv`, zero pre-existing references to update). Commit `2f12a9c`. Repair record: `docs/governance/repairs/MOVE-001-AICP-001-identity-correction.md`.
- **Verification:** Content diff confirmed identical before/after (only path changed); repository-wide search confirmed no references broke.
- **Approval:** Already granted (Founder's Immediate Exception).

---

### MDR-014 — "Opening Ceremony Canon" exists twice with undeclared relationship (OC-001 / MJC-002)

- **Severity:** Low
- **Location:** `docs/canon/experience/OC-001-opening-ceremony-canon.md`, `docs/canon/member-journey/MJC-002-opening-ceremony-canon.md`
- **Description:** See Duplicate Identifier Register D-12 and Constitutional Lineage §6.
- **Root cause:** Most likely OC-001 was an earlier standalone draft later absorbed into the more structurally complete MJC family, but this is this audit's inference, not a documented fact.
- **Impact:** Low — both documents are internally consistent and don't actively contradict each other, they simply cover the same ground without cross-reference.
- **Risk if left unresolved:** Low, but will compound if a third "Opening Ceremony" document is ever created without checking for these two first.
- **Dependencies:** None technical.
- **Recommended resolution:** Founder decision: formally supersede OC-001 (archive with lineage note) in favor of MJC-002, or declare both intentionally distinct (e.g. OC-001 as a technical/visual spec, MJC-002 as the philosophical canon) and cross-reference them.
- **Repair strategy:** Either a simple archival + lineage note, or adding cross-reference sections to both — both low-risk, additive changes.
- **Repair order:** Low priority, independent of everything else.
- **Approval required:** Founder (or a delegated content-authority decision, per ENG-001 §6, since this doesn't touch governance/security/pricing/business-rules — this may be a case where engineering judgment could resolve it without full Founder involvement, flagged for Founder to confirm delegation).

---

### MDR-015 — Repository-wide broken foundational authority: every domain canon cites an unratified draft as "the Founding Charter"

- **Severity:** Critical
- **Location:** Every charter-level document across `docs/constitution/`, `docs/operations/`, `docs/technology/`, `docs/security/`, `docs/risk/`, `docs/data/`, `docs/human-resources/`, `docs/legal/`, `docs/finance/`, `docs/communications/` — i.e., the entire domain-canon corpus, not just the constitutional family.
- **Description:** Every one of these directories' top-level Charter documents cites `Authority: OAS-001 — Founding Charter`. No ratified document by that name exists anywhere in the repository. The only file answering to "OAS-001" is `docs/drafts/OAS-001_Draft_0.95.md`, explicitly marked *"Not yet ratified"* with nine open Founder questions.
- **Evidence:** Confirmed independently by all four domain-inventory agents (operations, technology/security/risk/data, legal/finance/communications, plus the constitution-family finding already in MDR-002) — every single charter in every domain traces to the same unratified source.
- **Root cause:** It appears the entire multi-domain canon (10+ directories, ~300 files) was generated from a single template that hard-coded "OAS-001 — Founding Charter" as the universal Authority citation, before OAS-001 was ever ratified.
- **Impact:** This is broader than MDR-002 (which was scoped to the constitutional family) — it means essentially the entire institutional canon, across every domain, rests on an unratified foundation. This is the single highest-leverage finding in the audit: ratifying OAS-001 (or formally establishing a different supreme document) would resolve the authority question for the whole corpus at once; leaving it unresolved leaves everything downstream provisional.
- **Risk if left unresolved:** High at the institutional level (nothing is actually "canonical" in the strict sense used by these documents' own headers), though Low at the immediate operational level (no code depends on this citation).
- **Dependencies:** Directly supersedes/subsumes MDR-002 in scope. Must be resolved before any Constitutional Freeze (per CIA-001's own exit criteria) or before any of these ~300 documents can be honestly marked "Canonical" rather than "Canonical Draft."
- **Recommended resolution:** Founder decision: ratify OAS-001 (completing its 9 open Founder questions), or designate a different supreme document and re-point every domain's Authority citation to it.
- **Repair strategy:** Once decided, a repository-wide find/replace of the Authority citation is mechanical; the ratification decision itself is not.
- **Repair order:** Should be resolved first, before MDR-002/MDR-001, since it's the broadest and most foundational of the three.
- **Approval required:** Founder.

---

### MDR-016 — Operations Canon: two parallel canons occupying the same numbering, one truncated file, triple-duplicated maintenance-SOP concept

- **Severity:** High
- **Location:** `docs/operations/` (main directory, 17 duplicate/triplicate pairs across numbers 001–010) and `docs/operations/sops/` (13 of 20 numbers with 2–3 files each)
- **Description/Evidence:** See Duplicate Identifier Register D-13, D-14.
- **Root cause:** Two independently-authored Operations Canons ("Lineage A" and "Lineage B," distinguishable by header style) were merged into one directory without reconciliation; Lineage B was itself double-drafted for its first four numbers.
- **Impact:** Any tooling or AI agent resolving "OAS-OPS-002" by number alone cannot determine which of 2–3 candidate files is authoritative. The one truncated file (`sops/OAS-OPS-102-...`, cuts off mid-procedure at line 128) is missing all of its closing sections.
- **Risk if left unresolved:** Medium — operational (not constitutional) documents, lower stakes than the constitutional family, but actively used naming pattern ("OAS-OPS-XXX") makes number-based lookup unreliable today.
- **Dependencies:** Depends on MDR-015 (both lineages' Charters cite the same unratified OAS-001).
- **Recommended resolution:** Founder or delegated-authority decision on which lineage (A or B) is canonical per number, or whether both should be kept as intentionally separate documents under renumbered, non-colliding IDs.
- **Repair strategy:** Once designated, archive (not delete) the non-canonical variant per number, consistent with "never destroy repository history."
- **Repair order:** After MDR-015.
- **Approval required:** Founder (or delegated per ENG-001 §5/§6 if this is judged non-constitutional operational content).

---

### MDR-017 — Legal canon: ID-collisions plus zero implementable legal text (launch blocker)

- **Severity:** High (the duplication itself is Medium; the missing legal text is a launch blocker independent of duplication)
- **Location:** `docs/legal/` (20 files)
- **Description/Evidence:** See Duplicate Identifier Register D-17, D-18.
- **Root cause (duplication):** Same template-driven double-drafting pattern as operations/technology/finance.
- **Root cause (missing text):** The entire legal canon was written as governance philosophy ("Legal stewardship shall...") rather than as implementable legal instruments — no one has yet drafted actual Terms of Service, Privacy Policy, or consent-tracking specification text.
- **Impact:** The ID-collisions are a documentation-hygiene issue. The absence of any real legal text is a genuine public-launch blocker — a production platform cannot launch to members without actual Terms of Service, Privacy Policy, and consent-tracking implementation.
- **Risk if left unresolved:** High for launch — this blocks Phase 7 (Legal implementation hooks) of any broader launch-readiness effort.
- **Dependencies:** Independent of the constitutional-freeze family; not a frozen path.
- **Recommended resolution:** Duplication: same as MDR-016/MDR-019 pattern (Founder/delegated designation of canonical variant per number). Missing text: commission actual legal-instrument drafting (with real legal review) as its own work item — explicitly not something this audit or any AI system should originate as binding legal policy.
- **Repair strategy:** Duplication is mechanical once designated; legal-text drafting is out of scope for a "repair" and requires qualified legal input.
- **Repair order:** Legal-text gap should be flagged to the launch-readiness track immediately, independent of the duplication cleanup timeline.
- **Approval required:** Founder + legal review (per AQP-001's own Universal Quality Gate 7, "Security," and general legal-risk practice — never invent legal policy, per this audit's own operating constraint).

---

### MDR-018 — Finance canon: 5 duplicate charter pairs (PD-000 undercounted) + 4 SOP pairs + 2 title-collisions

- **Severity:** Medium
- **Location:** `docs/finance/` (29 files)
- **Description/Evidence:** See Duplicate Identifier Register D-19.
- **Root cause:** Same template-driven double-drafting pattern.
- **Impact:** Same class of number-resolution ambiguity as operations/technology/legal.
- **Risk if left unresolved:** Medium.
- **Dependencies:** Independent of frozen paths.
- **Recommended resolution/repair strategy/order:** Same pattern as MDR-016/017 — Founder/delegated designation, then mechanical archival of non-canonical variants.
- **Approval required:** Founder (or delegated).

---

### MDR-019 — Technology canon: 31 of 42 files in ID-collision groups (undercounted by PD-000, sops/ previously unreported)

- **Severity:** Medium
- **Location:** `docs/technology/` (42 files)
- **Description/Evidence:** See Duplicate Identifier Register D-15.
- **Root cause:** Same template-driven double/triple-drafting pattern, more extensive here than any other domain (74% of files affected).
- **Impact:** Same number-resolution ambiguity, at greater scale.
- **Risk if left unresolved:** Medium.
- **Dependencies:** Independent of frozen paths; shares MDR-015's upstream authority defect.
- **Recommended resolution/repair strategy/order:** Same pattern as MDR-016.
- **Approval required:** Founder (or delegated).

---

### MDR-020 — `docs/communications/OAS-COM-002` is an empty stub with 7 dangling references

- **Severity:** High
- **Location:** `docs/communications/OAS-COM-002-Communications-Governance-and-Public-Engagement-Framework.md`
- **Description/Evidence:** See Duplicate Identifier Register D-20. File is 92 bytes, contains only its own file path as text — no title, header, or body.
- **Root cause:** Appears to have been created (e.g. via a path-echo or `touch`-equivalent step in whatever process generated this canon) but never actually populated with content, unlike every one of its ~299 sibling documents across the other nine domains.
- **Impact:** Higher severity than a duplication defect — 7 other files (OAS-COM-003, 004, 101, 102, 103, 104, and its own would-be siblings) cite this file as their governing Authority or Related Document, and would resolve to nothing if opened.
- **Risk if left unresolved:** Medium-High for the Communications domain specifically — its second-most-foundational document doesn't exist in substance.
- **Dependencies:** Independent of frozen paths.
- **Recommended resolution:** This requires new authorship (the actual "Communications Governance and Public Engagement Framework" content), not a mechanical repair — nothing in the repository supplies what this file was meant to say.
- **Repair strategy:** Commission the missing content as its own work item; in the interim, the 7 dangling references should at minimum be annotated to note the gap rather than silently pointing at nothing.
- **Repair order:** Independent, can proceed in parallel with anything else.
- **Approval required:** Founder (content authorship decision).

---

### MDR-021 — Broken cross-references in work-orders/ADRs/implementation standards

- **Severity:** Low (individually); Medium (aggregate, since one of the IC findings points at a repo-wide pattern)
- **Location:** `docs/work-orders/WO-030-Pods.md` (D-21); `docs/work-orders/PR-002/003/004` (D-22); `docs/implementation/IC-009`, `IC-011` and later (D-23, D-24)
- **Description/Evidence:** See Duplicate Identifier Register D-21 through D-24.
- **Root cause:** D-21 is a simple typo (WO-011 for WO-025). D-22 (missing PR-001) reflects a document that was apparently delivered outside the repository and never committed — PD-000 already self-corrects this pattern for itself. D-23/D-24 (missing IC-008, IC-010, and the entire IDR document class) suggest either an incomplete numbering sequence or documents that were planned but never authored.
- **Impact:** Low individually (none of these affect currently-running code), but D-24 in particular means every IC document from IC-009 onward references a document class (IDRs) that doesn't exist anywhere, which could mislead a future engineer into assuming IDRs exist and searching for them.
- **Risk if left unresolved:** Low-Medium.
- **Dependencies:** None — fully independent, mechanical fixes.
- **Recommended resolution:** D-21: fix the typo (WO-011 → WO-025). D-22: either locate/re-commit PR-001, or annotate PR-002/003/004 to note it was delivered outside the repo. D-23/D-24: either author the missing IC-008/IC-010/IDR documents, or remove the forward-references if those document classes were abandoned by design.
- **Repair strategy:** All four are low-risk, mechanical documentation fixes.
- **Repair order:** Can proceed immediately, independent of everything else in this register — none of these touch frozen paths.
- **Approval required:** Founder (or delegated, per ENG-001 §5 — these are documentation corrections, not constitutional interpretation).

---

## Summary table

| ID | Title | Severity | Status | Approval Required |
|---|---|---|---|---|
| MDR-001 | ALC-001 "Steward" three-way contradiction | Critical | Open | Founder |
| MDR-002 | Constitutional supremacy contradiction | Critical | Open | Founder |
| MDR-003 | ALC-001 Appendix A duplication | High | Fix drafted, unapplied | Founder |
| MDR-004 | ALC-002 Article XL/XLIII/XXX | Medium | Open | Founder |
| MDR-005 | ALC-011 duplication + XIII–XVIII gap | High | Open (dedup drafted; gap unfillable) | Founder |
| MDR-006 | PC-0XX: 30/60 truncated | High | Open | Founder |
| MDR-007 | AI Canon: 7/58 truncated, 2 unfulfilled promises | Medium | Open | Founder |
| MDR-008 | PA-004/005 duplicate; Member Core/Admin&Ops missing | High | Open | Founder |
| MDR-009 | Leaked editorial commentary in 5 canonical OAS files | Medium | Fix drafted, unapplied | Founder |
| MDR-010 | `docs/docs/constitution/` stray directory | Medium | Open | Founder |
| MDR-011 | CAP-REGISTER cites 13 non-existent documents | Medium | Open | Founder |
| MDR-012 | New governance layer's authority undeclared | Medium | Open | Founder |
| MDR-013 | AICP-001 identity/location mismatch | — | **Resolved** | — |
| MDR-014 | OC-001 / MJC-002 undeclared relationship | Low | Open | Founder (or delegated) |
| MDR-015 | Repo-wide broken authority (unratified OAS-001 cited everywhere) | Critical | Open | Founder |
| MDR-016 | Operations Canon: two parallel canons + 1 truncated file | High | Open | Founder (or delegated) |
| MDR-017 | Legal canon: duplication + zero implementable legal text | High | Open | Founder + legal review |
| MDR-018 | Finance canon: 5+4 duplicate pairs, 2 title-collisions | Medium | Open | Founder (or delegated) |
| MDR-019 | Technology canon: 31/42 files in collision groups | Medium | Open | Founder (or delegated) |
| MDR-020 | OAS-COM-002 empty stub, 7 dangling references | High | Open | Founder |
| MDR-021 | Broken cross-references (WO-030, PR-001, IC-008/010, IDRs) | Low-Medium | Open | Founder (or delegated) |

**All domain-inventory passes are now complete.** This register is ready to feed the Master Remediation Plan.
