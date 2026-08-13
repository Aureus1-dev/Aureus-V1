# CIA-001 — Duplicate Identifier Register

**Parent protocol:** CIA-001 — Constitutional Integrity Audit
**Status:** Complete — all five domain-inventory passes returned (constitution/canon/PA/frontend from the prior Governance Recovery Report; work-orders/ADRs/verification/implementation/releases; operations/HR; technology/security/risk/data; legal/finance/communications). Every entry below is confirmed by `md5sum`, `diff`, or direct full-file reading.
**Date:** 2026-07-21
**Correction to PD-000:** PD-000's own summary ("docs/legal/ (OAS-LEG-001 duplicated)", "docs/finance/ (OAS-FIN-001/002/004/005 duplicated)", "docs/technology/ (OAS-TECH-001 through 006, heavy collisions)", "docs/operations/ (OAS-OPS-002 through OAS-OPS-010, roughly 15 duplicate/triplicate pairs)") undercounts the actual scope in every one of these four directories, and its "security/, risk/, data/ are clean" claim, while correct for internal duplication, misses that those three directories share the same broken-authority defect as everywhere else (D-16 below). Corrected, evidence-backed counts follow.

---

## 1. Confirmed exact/near-exact content duplicates (constitutional family)

| # | Identifier / Concept | Locations | Evidence | Status |
|---|---|---|---|---|
| D-01 | Product Architecture "Member Core" content | `docs/product-architecture/PA-004` vs `PA-005-member-experience-architecture.md` | Byte-identical, md5 `b28ca113d0aaa230c4c05245343c52b6`. PA-005's own first line reads "Document 4 — User Journey Architecture." | Open. |
| D-02 | ALC-001 Appendix A (all 20 sections) | Two copies inside `docs/constitution/ALC-001-Aureus-Living-Constitution.md` | Byte-identical, md5 `ca6e923d9e2d7f215748e695b2a2e0f9`, 156 lines each. | Fix drafted, held in git stash, NOT applied — frozen path. |
| D-03 | ALC-002 Article XL ("The Nature of Love") | Two copies in `ALC-002-Preamble-to-the-Constitution.md` | Byte-identical, md5 `d1ae8c984102aec0a8d16b265ce98679`. | Open — frozen path. |
| D-04 | ALC-002 Article XLIII ("The Nature of Belonging") | Two copies in `ALC-002`, second is a superset of the first | Diff-confirmed. | Open — frozen path. |
| D-05 | ALC-002 Article XXX numbering collision | Two different articles, same numeral | `sort \| uniq -c` across all 60 Article headings. | Open — frozen path. |
| D-06 | ALC-011 Articles VII–XII duplicated + XIII–XVIII gap | `docs/constitution/alc/ALC-011-...md` | md5 `52df0c24b91a659d0acf01d1c0baaa75`. | Open — frozen path. |
| D-07 | `docs/docs/constitution/OAS-003` | Exact duplicate of canonical `OAS-003` | md5 `6dad3d2f1d3ff050a26837998e2122d2`. | Open — frozen path. |
| D-08 | `docs/docs/constitution/OAS-004/005/006` | Prefix-duplicates canonical (mismatched-name) counterparts + appended chat commentary | Diff-confirmed. | Open — frozen path. |
| D-09 | AICP-001 identity/location mismatch | Was `docs/governance/protocols/ARM-001-...md` | Zero "Risk Management" content anywhere in the file. | **RESOLVED** — commit `2f12a9c`. |
| D-10 | `OAS-ACA-007` numbering collision | Two unrelated files, same number | Both read in full. | Open. |
| D-11 | OAS-004/005/006 filename/content mismatch | `docs/constitution/` canonical dir | Diff-confirmed prefix match to D-08 orphans. | Open — frozen path. |
| D-12 | "Opening Ceremony Canon" duplicate concept | `docs/canon/experience/OC-001` vs `docs/canon/member-journey/MJC-002` | Both read in full; undeclared relationship. | Open. |

## 2. Operations (docs/operations/) — two entire parallel canons merged into one directory

**D-13 — Two independently-authored Operations Canons occupy the same numbering (001–010), neither byte-identical to the other.**

- **Lineage A**: `Status/Authority/Owner/Last Updated` header, no `Canonical Designation`, ends on prose (no Revision History). One file per number, OAS-OPS-001 → 015, internally self-consistent.
- **Lineage B**: `Canonical Designation/Status/Authority/Owner/Effective Date` header, ends with `Revision History` / "Version 1.0". A separate 10-document set, OAS-OPS-001 → 010, internally self-consistent to *its own* sibling files — and Lineage B is itself double-drafted for numbers 002–005 (two independently-worded B variants each).
- Net effect: OAS-OPS-001–010 has **20 distinct files across 10 numbers** (11 "extra" beyond one-per-number), all unique MD5 hashes — **17 duplicate/triplicate pairs**, higher than PD-000's "roughly 15" once OAS-OPS-001 itself (which PD-000's "002 through 010" phrasing excluded) is counted.
- The same pattern repeats in `docs/operations/sops/`: **13 of 20 SOP numbers (101–120) have 2–3 files each.**
- **Sub-finding — triple duplication of the same concept across three different numbers:** `sops/OAS-OPS-104-...`, `sops/OAS-OPS-113-...`, and `sops/OAS-OPS-120-...` are each independently titled "Operations Canon Maintenance and Version Control SOP" (or a near-identical variant), none cross-referencing the other two, despite OAS-OPS-120's own stated purpose including "duplicate reduction" and "detecting inconsistencies."
- **Status:** Open — `docs/operations/` is not one of the five explicitly frozen paths, but per PD-000's own framing this entire duplication class is treated as outside delegated engineering authority pending Founder review; no action taken.

**D-14 — `docs/operations/sops/OAS-OPS-102-Member-Journey-and-Ongoing-Stewardship-SOP.md` (Lineage B) is genuinely truncated**, cutting off mid-"Step 3" at 128 lines (siblings run 200–260 lines) with all closing sections (Success Metrics, Exceptions, Documentation, Continuous Improvement, Related Documents, Revision History) missing. Confirmed via direct comparison against its own-lineage sibling `102-Process-Management-and-Quality-Assurance-Operations-SOP.md` (251 lines, full structure). **This is the only truncated file found across all 76 operations + HR files, and one of only two truncated files found outside the constitution/canon family in this entire audit** (the other being D-15 below).

## 3. Human Resources (docs/human-resources/)

No duplication, no truncation, no filename/content mismatches found across all 9 files. Shares the D-16 authority defect below (its Charter cites the same unratified "OAS-001 — Founding Charter").

## 4. Technology (docs/technology/) — ID-collision, not content-cloning

**D-15 — 31 of 42 files (74%) belong to an ID-collision group.** Top level: 5 collision groups (TECH-001 ×2, TECH-002 ×3, TECH-003 ×3, TECH-004 ×3, TECH-005 ×3, TECH-006 ×2 — 15 files). `docs/technology/sops/`: 4 additional collision groups (TECH-101 ×3, TECH-102 ×3, TECH-103 ×3, TECH-104 ×2 — 11 files), **not previously reported by PD-000 at all.** Every colliding file has a **unique MD5 hash** — these are distinct documents (different Purpose text, different upstream Authority citations that don't even agree with each other on which sibling TECH-001 variant is canonical) competing for the same ID, not copy-paste clones. No filename/content mismatches found anywhere in the 42 files; zero truncation. **Correction to PD-000: "heavy collisions... OAS-TECH-001 through 006" undercounts — the true scope is 31 of 42 files (74%), not limited to numbers 001–006, once `sops/` is included.**

## 5. Security, Risk, Data (docs/security/, docs/risk/, docs/data/)

**No ID collisions, no hash collisions, no truncation found in any of these three directories (33 files total).** PD-000's "clean" claim is confirmed for *internal* duplication. However, see D-16 — all three share the same broken-authority defect as every other domain.

**D-16 — Every charter-level document across the entire repository's domain canon (constitution, operations, technology, security, risk, data, human-resources, legal, finance, communications) cites `Authority: OAS-001 — Founding Charter`, and this document does not exist in ratified form anywhere in the repository.** The only file answering to "OAS-001" is `docs/drafts/OAS-001_Draft_0.95.md`, whose own header states: *"Status: Draft 0.95 ... Not yet ratified."* This means every domain canon in the repository — not just the constitutional family already flagged in the Governance Recovery Report — ultimately traces its authority to an unratified draft. This is the single most repository-wide-consequential finding of this audit pass: it is not a per-directory defect, it is a structural defect in how *every* domain canon was founded. See Authority Matrix (updated) and Master Defect Register MDR-015.

## 6. Legal (docs/legal/)

**D-17 — 1 top-level duplicate pair** (`OAS-LEG-001-Legal-Charter.md` vs `OAS-LEG-001-Legal-and-Regulatory-Governance-Charter.md`, md5 `72c2d4cc...`/`8b0ae7d9...`, paraphrased twins not byte-identical) **+ 4 SOP duplicate pairs** (LEG-101, 102, 103, 104, each ×2) **+ 1 title-collision across numbers** (`OAS-LEG-104-...` and `OAS-LEG-107-...` both literally titled "Legal Canon Maintenance and Version Control SOP", 90 diff-lines apart). Cascading cross-reference inaccuracy: downstream SOPs cite whichever OAS-LEG-00X variant the generator happened to reference, producing titles that don't exactly match either real sibling file (e.g. citing "Legal Governance and Regulatory Compliance Framework," a title that doesn't exist — the real file is "Legal Governance and Compliance Framework"). **D-18 — Zero actual Terms of Service, Privacy Policy, or consent-tracking text exists anywhere in `docs/legal/`** (`grep` for "Terms of Service|Privacy Policy|consent|GDPR|CCPA|cookie" returns zero matches across all 20 files) — the entire directory is governance-philosophy prose, confirming PD-003's finding. This is a launch blocker, not a duplication defect — see Master Defect Register MDR-017.

## 7. Finance (docs/finance/)

**D-19 — 5 top-level duplicate pairs** (OAS-FIN-001 through 005, each ×2 — **PD-000 undercounted by one; it missed OAS-FIN-003**, `Budgeting-Accounting-and-Treasury-Framework.md` vs `Financial-Planning-and-Budgeting-Framework.md`) **+ 4 SOP duplicate pairs** (FIN-101, 102, 103, 104, each ×2) **+ 2 title-collisions across numbers** (FIN-104/FIN-110 both "Finance Canon Maintenance and Version Control SOP"; FIN-005/FIN-010 near-identical titles, "Financial" vs "Finance Standards and Continuous Stewardship Framework"). Same cascading-citation inaccuracy pattern as legal (D-17).

## 8. Communications (docs/communications/)

**D-20 — `docs/communications/OAS-COM-002-Communications-Governance-and-Public-Engagement-Framework.md` is an empty stub — 92 bytes, 1 line, and that line is just the file's own repo-relative path as plain text.** No title, no header, no body. **Seven other files cite it as their governing Authority or as a Related Document** (`OAS-COM-003`, `OAS-COM-004`, `OAS-COM-101`, `OAS-COM-102`, `OAS-COM-103`, `OAS-COM-104`, plus its own would-be siblings), all of which would silently fail to resolve to any actual content if opened. This is a more severe defect than duplication — it is a broken reference to a document that has no substance at all, not merely a mislabeled or duplicated one. No other duplication found in this directory (all other 8 files unique, no ID collisions). See Master Defect Register MDR-018.

## 9. Work orders / ADRs / verification / implementation / releases (80 files)

**D-21 — `docs/work-orders/WO-030-Pods.md` cites "WO-011/ADR-011 (Stewardship System)" in its Dependencies section — the correct number is WO-025**, confirmed against both `WO-025-Stewardship-System.md`'s own header and `ADR-011-Stewardship-System.md`'s own "Work Order" field (both say WO-025). ADR-011 is cited correctly; only the paired WO-number is wrong.

**D-22 — `PR-002`, `PR-003`, and `PR-004` each cite a governing baseline "PR-001" that does not exist anywhere in the repository.** PD-000 self-discloses this exact gap for itself ("no PR-001 document exists anywhere in the repository... this audit does not repeat that mistake") but the three already-committed PR documents still carry the uncorrected citation.

**D-23 — `docs/implementation/IC-009` and `IC-011` (and every subsequent IC document) cite "IC-001 through IC-008" / "IC-001 through IC-010" as governing predecessors — IC-008 and IC-010 do not exist anywhere in `docs/implementation/`.**

**D-24 — Every IC document from IC-009 onward cites "Implementation Decision Records (IDRs)" as a governing document class alongside ADRs. No `IDR-*` file exists anywhere in the repository directories checked by any of this audit's passes.**

**D-25 — `docs/implementation/IC-014-Documentation-Standard.md` Article IV states verbatim: "Each subject shall have one canonical source. Duplicate documentation describing the same authoritative information shall be avoided unless expressly required."** This is the repository's own documentation standard, and it is directly and repeatedly violated by essentially every other finding in this register (D-01 through D-22). Worth citing as the internal standard being breached, not merely an external audit observation.

**Non-defects, recorded for completeness (legitimate multi-file series, not conflicts):** `PR-002` (2 files — remediation report + deferred-surfaces companion), `WO-030` (2 files — pre-approval spec + completion report), `DOMAIN-002` (3 files — backend/frontend/manual-test-plan increments). All internally cross-referenced correctly; flagged only because a naive number search could mistake them for duplicates.

## 10. Summary counts (final — all five inventory passes complete)

| Category | Count |
|---|---|
| Confirmed byte-identical content duplicates (constitutional family) | 8 (D-02, D-03, D-06, D-07, plus D-01, D-04 near-identical) |
| Resolved this session | 1 (D-09) |
| ID-collision groups, non-byte-identical (operations + technology + legal + finance) | Operations: 9 numbers/17 pairs (main) + 13 SOP numbers; Technology: 9 collision groups/31 files; Legal: 1 top-level pair + 4 SOP pairs + 1 title-collision; Finance: 5 top-level pairs + 4 SOP pairs + 2 title-collisions |
| Directories confirmed clean of internal duplication | security/, risk/, data/, human-resources/ (33 + 9 = 42 files) |
| Genuinely truncated files found outside the constitution/canon family | 1 (`OAS-OPS-102` Lineage B) |
| Empty/void files masquerading as canonical documents | 1 (`OAS-COM-002`), with 7 dangling references to it |
| Repository-wide broken authority chain | 1 finding (D-16) affecting every domain canon: constitution, operations, technology, security, risk, data, HR, legal, finance, communications — all cite an unratified draft as "the Founding Charter" |
| Broken cross-references in work-orders/ADRs/implementation | 4 (D-21 wrong WO number, D-22 missing PR-001, D-23 missing IC-008/010, D-24 missing IDR series) |
| Internal standard directly contradicted by repo-wide practice | 1 (D-25, IC-014's own "one canonical source" rule) |
