# AMI-001 — Populated Index (Family Level)

**Parent standard:** `docs/governance/registry/AMI-001-Aureus-Master-Index.md` (defines the schema this document populates)
**Status:** Family-level population complete; per-document population (500+ individual rows, per AMI-001's full "Document Record Standard") is a separate, mechanical follow-on task, not yet done — flagged honestly rather than claimed complete.
**Date:** 2026-07-21

---

This index groups the repository's governance/documentation corpus by family, since a genuinely complete per-document table (Document Number, Title, Purpose, GitHub Location, Authority Level, Status, Version, Author, Approving Authority, dates, Related Documents, Dependencies, Supersedes/Superseded By, Implementation Status, Review Notes — per AMI-001's own schema) would run to 500+ rows. The detailed, evidence-backed per-document findings already live in `CIA-001-11-Duplicate-Identifier-Register.md`, `CIA-001-07-Master-Defect-Register.md`, and the original Governance Recovery Report (`docs/governance/GOVERNANCE-RECOVERY-REPORT-2026-07-20.md`); this index is the navigation layer pointing to them.

| Family | Location | Files | Authority Level | Status | Known defects (see CIA-001 registers) |
|---|---|---|---|---|---|
| Aureus Living Constitution | `docs/constitution/ALC-001/002` | 2 | Constitution (contested, see MDR-002) | Founding Draft for Founder Review | MDR-001, 002, 003, 004 |
| ALC supplementary articles | `docs/constitution/alc/ALC-003–013` | 11 | Constitution | Living Draft | MDR-005; ALC-009/013 apparent truncation |
| OAS constitutional articles | `docs/constitution/OAS-002–011`, `OAS-ACA-*` | ~17 | Constitution (contested, see MDR-002/015) | Canonical Draft | MDR-009, D-10, D-11 |
| Stray duplicate constitution tree | `docs/docs/constitution/` | 9 | None (non-canonical) | Stray/frozen | MDR-010 |
| CAP register | `docs/constitutional/register/` | 1 | Register | Draft | MDR-011 |
| OAS-001 draft | `docs/drafts/` | 1 | Claimed supreme by others; self-declared unratified | Draft 0.95, Not Ratified | MDR-002, MDR-015 (root cause) |
| Production Canons | `docs/production-canons/PC-001–060` | 60 | Production Canon | Founder Review (0 approved) | MDR-006 |
| AI Canon | `docs/canon/ai/AI-001–058` | 58 | AI Governance | Mixed | MDR-007 |
| AICP family | `docs/canon/ai/AICP-001–002` | 2 | Repository Governance | Living Draft | MDR-013 (resolved) |
| Engineering Canon | `docs/canon/engineering/ENG-001–010` | 10 | Engineering Constitution | Draft for Founder Approval (ENG-010 v2.0 pending) | None found |
| Branding + Emotional Foundations + Experience Architecture | `docs/canon/branding/`, `emotional-foundations/`, `experience-architecture/` | 31 | Brand Canon | Living Draft | 2 truncated (BRAND-003, EF-001) |
| Member Journey Canon | `docs/canon/member-journey/MJC-001–007` | 7 | Institution-wide Canon | Living Draft (Foundational) | None found |
| Experience Canon | `docs/canon/experience/OC-001` | 1 | Product Canon | Living Draft | MDR-014 (relationship to MJC-002 undeclared) |
| Product Architecture | `docs/product-architecture/PA-001–020` | 20 | Canonical Architecture | Canonical | MDR-008 |
| Frontend Canon | `docs/frontend/canon/AFX-001–006` | 6 | Governing Frontend Standard | Canonical | AFX-005 template-anomalous (not a content defect) |
| Frontend Blueprints | `docs/frontend/blueprints/FPB-000–016` | 17 | Production Blueprint | Canonical | None found — cleanest family in the repository |
| Governance infrastructure | `docs/governance/registry/AMI-001`, `docs/governance/protocols/AQP-001`, `docs/governance/audits/CIA-001` | 3 | Repository Governance | Living Draft / Founder Review Required | MDR-012 (relationship to Constitution undeclared) |
| Operations Canon | `docs/operations/` (incl. `sops/`) | 67 | Operations Canon | Canonical Draft v1.0 | MDR-015, MDR-016 |
| Technology Canon | `docs/technology/` (incl. `sops/`) | 42 | Technology Canon | Canonical Draft v1.0 | MDR-015, MDR-019 |
| Security Canon | `docs/security/` | 12 | Security Canon | Canonical Draft v1.0 | MDR-015 only |
| Risk Canon | `docs/risk/` | 9 | Risk Canon | Canonical Draft v1.0 | MDR-015 only |
| Data Canon | `docs/data/` | 9 | Data Canon | Canonical Draft v1.0 | MDR-015 only |
| Human Resources Canon | `docs/human-resources/` | 9 | HR Canon | Canonical Draft v1.0 | MDR-015 only |
| Legal Canon | `docs/legal/` | 20 | Legal Canon | Canonical Draft v1.0 | MDR-015, MDR-017 (incl. launch-blocking missing legal text) |
| Finance Canon | `docs/finance/` | 29 | Finance Canon | Canonical Draft v1.0 | MDR-015, MDR-018 |
| Communications Canon | `docs/communications/` | 9 | Communications Canon | Canonical Draft v1.0 | MDR-015, MDR-020 |
| Work Orders | `docs/work-orders/` | 33 | Implementation Delivery Record | Complete (delivered) | MDR-021 (WO-030, PR-001 citations) |
| Architecture Decision Records | `docs/architecture/ADR-003–017` | 15 | Architecture Decision | Accepted | None found |
| Operational Verification Reports | `docs/verification/` | 13 | Verification Record | Operationally Verified | None found |
| Implementation Constitution/Standards | `docs/implementation/IC-001–020` | 18 (IC-008, 010 missing) | Implementation Constitution | Canonical | MDR-021 (IC-008/010/IDR gaps) |
| Release Readiness | `docs/releases/` | 1 | Living Release Tracker | Living, current | None found |
| Governance recovery/audit records (this session) | `docs/governance/` | growing | Audit Record | In progress | N/A (these ARE the audit) |

**Total documents indexed at family level: ~510** (precise count varies by ±5 depending on whether SOP subdirectories are counted separately; see each domain-inventory agent's own file count for exact per-directory totals).

**Follow-on work, explicitly not done here:** populate the full per-document AMI-001 schema (Author, Approving Authority, Date Created, Last Reviewed, Next Review Date, Implementation Status, Review Notes for all ~510 individual files). This is mechanical but large — recommend tracking as its own work item once the Master Remediation Plan's Tier 0/1 decisions are made, since several fields (Approving Authority, Status) may change as a result of those decisions.
