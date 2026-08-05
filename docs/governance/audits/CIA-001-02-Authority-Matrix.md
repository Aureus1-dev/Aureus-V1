# CIA-001 — Authority Matrix

**Parent protocol:** CIA-001 — Constitutional Integrity Audit (Phase 2 deliverable)
**Status:** Draft evidence, in progress — pending final integration with the four in-flight domain-inventory passes (work-orders/ADRs; operations/HR; technology/security/risk/data; legal/finance/communications)
**Date:** 2026-07-21
**Nature:** Evidence only. No document has been modified, reordered, or reclassified as a result of this matrix. Where authority is genuinely contested, that contest is recorded as a finding, not resolved.

---

## 1. Purpose

This matrix records, for every governance-document family currently in the repository, its claimed authority level, its claimed position in the hierarchy, and whether that claim is internally consistent with every other family's claims. Per AQP-001 Gate 1 ("Constitutional Alignment") and AICP-002 Principle 3 ("Evidence Before Opinion"), every row below is backed by a direct quote or a file/line citation, not inference.

## 2. The claimed hierarchy, as the documents themselves describe it

Layer by layer, from the top down, in the order each layer's own text claims to sit:

| Layer | Family | Self-claimed authority | Evidence |
|---|---|---|---|
| 0 (disputed) | `OAS-001` (`docs/drafts/OAS-001_Draft_0.95.md`) | "The Founding Charter... the supreme governing instrument of the System" — per how `OAS-002`, `OAS-007`–`OAS-011` describe it | OAS-001's own header: *"Status: Draft 0.95 ... Not yet ratified."* Nine open Founder questions (N1–N9). It does **not** call itself supreme in its own text — that claim is made *about* it by downstream OAS documents, not by itself. |
| 1 | `ALC-001` (`docs/constitution/ALC-001-Aureus-Living-Constitution.md`) | "The Aureus Living Constitution is the supreme governing authority of Aureus" (Article I §1); "This Living Constitution is hereby established as the supreme governing authority of Aureus... Nothing within Aureus shall possess constitutional authority independent of this Constitution" (Constitutional Seal) | Two independent self-declarations of supremacy, both unqualified. Document's own header status: *"Founding Draft for Founder Review... Pre-Activation Living Draft."* |
| 1 (competing) | `ALC-003`, `ALC-004`, `ALC-005` (`docs/constitution/alc/`) | Authority flows from "the Founding Charter," described as sitting above ALC-001 itself | ALC-005: *"This document derives its authority from the Founding Charter and shall be interpreted consistently with ALC-001 through ALC-004."* Never identifies "the Founding Charter" by document number anywhere in the `alc/` family. |
| 2 | `ALC-002` and `ALC-006`–`ALC-013` (`docs/constitution/` and `alc/`) | Subordinate to and adopted under ALC-001 | ALC-002 header: *"Authority: Adopted under and subordinate only to the Aureus Living Constitution (ALC-001)."* |
| 2 (parallel, unreconciled) | `OAS-002`–`OAS-011`, `OAS-ACA-0XX` (`docs/constitution/`) | Subordinate to and canonized under OAS-001 ("the Founding Charter") | OAS-007: *"A constitutional document canonized under, subordinate to, and conformant with the Founding Charter (OAS-001)."* Cites OAS-001 pinpoint articles (e.g. "OAS-001, Article VII, Section 3") as settled law. |
| 3 | Production Canons (`docs/production-canons/PC-001`–`060`) | Subordinate to the Constitution; no PC file cites ALC-001 or any OAS document by number anywhere in its body | Every PC file's footer: *"Status: Founder Review / Approved By: —"* — none of the 60 are Founder-approved. Zero internal cross-references found repo-wide in this family (confirmed by direct grep across all 60 files). |
| 3 | AI Canon (`docs/canon/ai/AI-001`–`058`) | Operates "within the limits established by the Constitution" (AI-016) | No AI-0XX file cites a PC, ALC, or OAS document by number either. |
| 3 (new) | AICP family (`docs/canon/ai/AICP-001`, `AICP-002`) | "Repository Governance" authority; AICP-002 explicitly built to govern how *all* future constitutional audits/revisions are conducted | AICP-001 header: *"Authority: Repository Governance... Approval Authority: Founder... Applies To: All Artificial Intelligence collaborators... operating on behalf of Aureus."* |
| 3 (new) | Governance infrastructure (`docs/governance/registry/AMI-001`, `docs/governance/protocols/AQP-001`, `docs/governance/audits/CIA-001`) | "Repository Governance" authority, "Living Draft" / "Draft, Founder Review Required" | CIA-001 header: *"Authority: Founder Review Required... No document should be modified until it has first been audited against this process... No repair shall begin until this plan is approved."* |
| 4 | Engineering Constitution family (`docs/canon/engineering/ENG-001`–`010`) | "Canonical upon Founder Approval," subordinate to Constitution and Engineering Canon per its own Order of Authority | ENG-001 §3: explicit 8-level Order of Authority (Canonical Constitution → Canonical Engineering Canon → Approved Architecture → ADRs → Domain Specs → Founder Decisions → Repository Implementation → Historical Work Orders). |
| 5 | Product/Frontend Architecture (`docs/product-architecture/PA-001`–`020`, `docs/frontend/canon/AFX-001`–`006`, `docs/frontend/blueprints/FPB-000`–`016`) | "Canonical," governed by the layer above; FPB-000 explicitly states the governance order (Constitution → Canons → Backend/AI Canons → AFX → FPB → Work Orders → Code) | FPB-000 §2 defines this order explicitly — the cleanest, most internally-consistent authority statement found anywhere in the repository this audit has reviewed so far. |
| 6 (new) | Member Journey Canon (`docs/canon/member-journey/MJC-001`–`007`) and Experience Canon (`docs/canon/experience/OC-001`) | "Institution-wide" / "Product Canon," parented to MJC-001 | MJC-002–007 each declare `Parent Authority: MJC-001`. OC-001 declares `Authority: Product Canon` with no stated parent — see Cross-Reference/Duplicate findings: OC-001 and MJC-002 are both titled "Opening Ceremony Canon" and cover near-identical ground; their relationship is undeclared. |
| 7 | Branding/Emotional Foundations (`docs/canon/branding/BRAND-001`–`020`, `emotional-foundations/EF-001`–`010`, `experience-architecture/EX-001`) | "Living Draft," governed by Canon layer above | No supremacy claims found; internally consistent. |
| 8 | Work Orders (`docs/work-orders/*`) | Implementation delivery records, lowest in ENG-001's own Order of Authority ("Historical Work Orders") | Self-consistent with ENG-001's stated order. |

## 3. Findings — authority conflicts (not resolved here, only recorded)

1. **Two documents claim unqualified supremacy for different reasons.** ALC-001 declares itself supreme in its own text. Separately, the OAS lineage (`OAS-002`–`011`) treats OAS-001 as supreme, and `ALC-003`/`004`/`005` point to an unnamed "Founding Charter" — the natural reading is that this refers to OAS-001, but no document anywhere states that identification explicitly. The repository currently has no single document that both (a) is uncontested and (b) is actually ratified.
2. **The presumptive "Founding Charter" (OAS-001) is an explicitly unratified draft** (`docs/drafts/OAS-001_Draft_0.95.md`, "Not yet ratified," nine open Founder questions), yet is cited as settled, entrenched law throughout `OAS-007`–`011` (e.g. "Only the Founding Charter can entrench its own text... (OAS-001, Article VII, Section 3)").
3. **No Production Canon, AI Canon, or Engineering Canon file cites ALC-001, ALC-002–013, or any OAS document by number anywhere in its body.** This means the lower layers were built without a demonstrated, checkable link to the top of the hierarchy — the chain of authority is asserted in this matrix by directory convention and header language, not by explicit citation within the documents themselves. This absence is itself a finding: zero cross-references to verify also means zero cross-references to break, but it also means the hierarchy is not self-verifying from inside the corpus.
4. **The AICP/AMI/AQP/CIA governance-infrastructure layer is new (added 2026-07-20–21) and does not yet declare where it sits relative to ALC-001/OAS-001.** All four declare "Authority: Repository Governance," a level not defined anywhere in ALC-001's or OAS-001's own text. This is not necessarily wrong — it may be intentionally a parallel, operational layer rather than a constitutional one — but the relationship is currently undeclared and should be made explicit rather than assumed.
5. **AICP-001's true identity was hidden until 2026-07-21** (see Duplicate Identifier Register and `docs/governance/repairs/MOVE-001-AICP-001-identity-correction.md`) — now corrected, but it means the AICP family's own internal consistency could not have been verified by any process running before this audit, since the document didn't exist under a discoverable name.

## 4. What still needs Founder resolution (carried forward from the prior Governance Recovery Report, restated here for the Authority Matrix specifically)

- Which document is actually supreme: ALC-001 (self-declared) or OAS-001 (externally-declared, but unratified)?
- Is "the Founding Charter" cited by ALC-003/004/005 the same document as OAS-001? No document says so explicitly.
- Where does the new Repository Governance layer (AMI-001/AQP-001/CIA-001/AICP-001/AICP-002) sit relative to the Constitution? Above production canons (as this matrix assumes by directory/behavior), or elsewhere?

## 5. Pending

This matrix will be revised once the four in-flight domain-inventory passes (work-orders/ADRs, operations/HR, technology/security/risk/data, legal/finance/communications) return, in case any of those directories contain additional supremacy or authority claims not yet accounted for (e.g., `docs/technology/OAS-TECH-002-Technology-Governance-Framework.md` was seen in passing during the earlier Governance Recovery Audit and may contain its own authority claims — not yet verified in full here).
