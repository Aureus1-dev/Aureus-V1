# CIA-001 — Repository Health Register

**Parent protocol:** CIA-001 — Constitutional Integrity Audit (Phase 6 deliverable)
**Status:** Complete, based on all five domain-inventory passes plus the prior Governance Recovery Report
**Date:** 2026-07-21

---

## 1. Folder organization

- Governance/canon documents are spread across at least 14 top-level `docs/` directories (`constitution`, `constitutional`, `docs` (stray), `canon`, `production-canons`, `product-architecture`, `frontend`, `operations`, `technology`, `security`, `risk`, `data`, `human-resources`, `legal`, `finance`, `communications`, `work-orders`, `architecture`, `verification`, `implementation`, `releases`, `governance` (new, this session), `drafts`, `sessions`). There is no single top-level index prior to `AMI-001` (created 2026-07-20) that ties these together.
- `docs/docs/constitution/` is a stray, accidentally-nested duplicate directory (see MDR-010) — the clearest single organizational defect in the repository.
- `docs/implementation/IC-013-Repository-Organization-Standard.md` (canonical) defines the intended top-level directory structure and explicitly prohibits documentation duplication "unless expressly required" — the repository as it stands does not conform to its own standard in at least 6 of the ~24 directories audited (operations, technology, legal, finance, constitution, docs/docs).

## 2. Naming consistency

- Two naming conventions coexist for "SOP"/procedure-level documents: `OAS-<DOMAIN>-1XX-*` (operations, technology, security, risk, data, human-resources, legal, finance, communications) vs. bespoke names elsewhere (`AI-0XX`, `PC-0XX`, `ADR-0XX`, `WO-0XX`, `IC-0XX`, `FPB-0XX`, `AFX-0XX`, `MJC-0XX`). This is not itself a defect — different families were built at different times for different purposes — but it means "check the ID for this document" requires knowing which family's convention applies.
- Filename/internal-title mismatches (the OAS-004/005/006-style defect) were found **only** in the constitutional family (`docs/constitution/`) — confirmed absent everywhere else audited (operations, technology, security, risk, data, human-resources, legal, finance, communications, work-orders, ADRs, verification, implementation).
- ID collisions (multiple distinct files sharing one canonical number) were found in: constitution (OAS-ACA-007), operations (17 pairs + 13 SOP numbers), technology (9 collision groups, 31 files), legal (1 + 4 SOP pairs + 1 title-collision), finance (5 + 4 SOP pairs + 2 title-collisions). Confirmed absent in: security, risk, data, human-resources, communications, work-orders, ADRs, verification, implementation, frontend canon/blueprints, branding family (except the two truncations noted separately), product architecture (except PA-004/005).

## 3. Duplicate files

Full detail in `CIA-001-11-Duplicate-Identifier-Register.md`. Summary: 8 confirmed byte-identical/near-identical content duplicates in the constitutional family; 1 resolved (AICP-001); large-scale ID-collision (non-byte-identical, template-generated near-twins) in operations/technology/legal/finance, totaling dozens of files; zero duplication found in security/risk/data/human-resources/communications/work-orders/ADRs/verification/implementation/frontend.

## 4. Corrupted / truncated files

- Constitutional/canon family: 30 of 60 Production Canons, 7 of 58 AI Canon files, 2 of 31 Branding-family files (BRAND-003, EF-001), plus the internal duplication defects in ALC-001/002/011 (Governance Recovery Report + this audit).
- Outside the constitutional/canon family: exactly **one** truncated file found across all ~500 remaining files audited — `docs/operations/sops/OAS-OPS-102-Member-Journey-and-Ongoing-Stewardship-SOP.md` (cuts off at line 128, missing all closing sections).
- One **void file** (distinct from truncation — never populated at all): `docs/communications/OAS-COM-002-...md` (92 bytes, contains only its own file path).
- Zero truncation found in: technology, security, risk, data, legal, finance (aside from the void COM-002), work-orders, ADRs, verification, implementation, frontend canon/blueprints, product architecture (all 20 files structurally complete, though PA-005's *content* is wrong per MDR-008).

## 5. Invalid filenames

None found — every file across all directories audited uses a consistent `<PREFIX>-<NUMBER>-<Slug>.md` pattern with no invalid characters, encoding issues, or filesystem-unsafe names.

## 6. Indexing and navigation

- No repository-wide index existed prior to this session except `AMI-001-Aureus-Master-Index.md` (created 2026-07-20), which defines the *standard* for an index but does not yet contain a populated inventory (see MDR-012 / the Founder's Priority 3 ask, which this audit's registers now substantially satisfy).
- `docs/frontend/blueprints/FPB-000-Frontend-Blueprint-Index.md` is a well-formed, accurate navigation document for the frontend canon/blueprint family specifically — the single best-organized navigational document found anywhere in the repository.
- `docs/constitution/registers/ACR-001-Constitutional-Definitions-Register.md` claims to be a definitions register but is a 12-line directory-tree stub referencing three sibling registers (`ACR-002/003/004`) and a ratification record (`AFR-001`) that do not exist (MDR-011-adjacent finding, previously reported in the Governance Recovery Report).
- `docs/constitutional/register/CAP-REGISTER.md` cites a source session file and 12 companion "Charter" documents, none of which exist (MDR-011).

## 7. Cross-cutting standard violated

`docs/implementation/IC-014-Documentation-Standard.md` Article IV: *"Each subject shall have one canonical source. Duplicate documentation describing the same authoritative information shall be avoided unless expressly required."* This is the repository's own internal documentation standard, and it is the standard directly violated by nearly every finding in this Repository Health Register and the Duplicate Identifier Register.

## 8. Overall health assessment

| Dimension | Assessment |
|---|---|
| Folder organization | Fair — one stray directory (`docs/docs/`), otherwise a large but navigable set of top-level directories, now gaining a master index (AMI-001) |
| Naming consistency | Good within families, no cross-family invalid names, but ID-collision is a real and widespread defect in 4 of ~14 domain-canon directories |
| Duplicate files | Poor in the constitutional family and in operations/technology/legal/finance; clean in security/risk/data/HR/communications/engineering/frontend/product-architecture (bar 2 exceptions) |
| Truncation | Poor in the constitutional/canon family (37 files across PC/AI/BRAND); excellent everywhere else (1 truncated file, 1 void file, out of ~500) |
| Filename validity | Excellent — zero invalid filenames anywhere |
| Navigation | Improving — AMI-001 and this audit's registers are the first repository-wide navigation aids; FPB-000 is a strong existing model to follow |
