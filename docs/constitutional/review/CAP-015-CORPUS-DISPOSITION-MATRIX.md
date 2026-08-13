# CAP-015 Constitutional Corpus Disposition Matrix

**Audit date:** 2026-08-13  
**Status:** Proposed rulings for human approval; non-operative until approved and implemented  
**Scope:** Constitutional corpus only. Operational, product, finance, legal-library and general repository consolidation remain governed by FOUNDATION-004 and are outside this closure packet.

## 1. Disposition rules

- **KEEP** — authoritative or actively reviewed material remains in its canonical home.
- **REPAIR** — authority remains, but path, label, status or cross-reference must be corrected without silently changing substance.
- **ARCHIVE** — preserve exact text and provenance as historical/source material; remove it from active constitutional presentation.
- **DUPLICATE** — retain one named source of truth and remove redundant active-path copies while Git history preserves them.
- **OUT OF SCOPE** — do not use CAP-015 closure to decide unrelated repository consolidation.

## 2. What stays

| Material | Disposition | Reason |
|---|---|---|
| FOUNDATION-001 through FOUNDATION-004 | KEEP | Controlling foundational Canon under the recorded hierarchy |
| Ratified OAS-001 through OAS-011 | KEEP | Unified Constitution ratified by Constitutional Record Entry 001 |
| Constitutional Record Entries 001–003 | KEEP | Permanent provenance and decisions; Entry 003 correctly distinguishes substance approval from canonization |
| CAP-015 and its conformance matrix | KEEP — UNDER REVIEW | The proposal remains intact pending required review and valid canonization |
| Founder-reserved reading copy | KEEP — NON-OPERATIVE | Preserves excluded text for later review without granting legal effect |
| Constitutional Resolution Register | KEEP | Canonical ledger for unresolved and resolved integrity questions |

## 3. Proposed CRR rulings

### CRR-001-001 — Ratified OAS-001 remains in a draft path

**Proposed ruling: REPAIR.** Relocate the exact ratified OAS-001 text from `docs/drafts/OAS-001_Draft_0.95.md` to `docs/constitution/OAS-001-Founding-Charter-of-Aureus.md`. Preserve Git history and the ratified body. Any header normalization must be explicitly authorized and recorded; relocation alone must not alter substance.

**Resolution evidence:** canonical path exists; old active path removed; integrity comparison confirms the body is unchanged; all active references resolve.

### CRR-001-002 — Status of OAS-ACA documents

**Proposed ruling: ARCHIVE / NONCONSTITUTIONAL SOURCE.** OAS-ACA material was not included in the ratification of OAS-001 through OAS-011. Preserve it as Academy philosophy and development source material, but do not present it as operative constitutional Canon.

**Resolution evidence:** all Academy documents are indexed in one historical/source home; status is explicit; no Academy file appears in the active constitutional index.

### CRR-001-003 — Duplicate OAS-ACA-007 identifier

**Proposed ruling: REPAIR.** Preserve `OAS-ACA-007 — Community`; relabel `OAS-ACA-007 — Truth Ledger` as historical identifier `OAS-ACA-008 — Truth Ledger`, an unused number in the audited corpus. Record the former colliding identifier in provenance. Do not infer that relabeling makes either document constitutional Canon.

**Resolution evidence:** unique identifiers; provenance note; links and index updated.

### CRR-001-004 — Status of ALC-002 through ALC-013

**Proposed ruling: ARCHIVE.** ALC-001 is already marked historical/source-only after ratification of the unified OAS Constitution. Its dependent ALC-002 through ALC-013 lineage is likewise historical and non-operative. Preserve exact files and known defects as evidence; do not repair historical drafting errors as if they were current Canon.

Known defects preserved in the archive record include duplicate article/appendix material, incomplete numbering and truncated closing material. Archival status does not erase unique historical contributions; prior preservation audits remain evidence for future proposals.

**Resolution evidence:** one indexed ALC historical home; explicit non-operative status; exact-source checksums or blob SHAs; active constitutional index excludes the ALC lineage.

### CRR-001-006 — Dual use of CAP-011

**Proposed ruling: REPAIR.** Keep registered `CAP-011 — Adaptive Communication`. In historical notes within OAS-004, OAS-006, OAS-007 and OAS-009, replace the ambiguous CAP-011 label with: “the pre-ratification entrenchment revision incorporated into the ratified OAS-001.” This repairs provenance without creating, renumbering or canonizing another CAP.

**Resolution evidence:** CAP register retains one CAP-011; active search finds no ambiguous label; edited notes are identified as non-substantive reference repairs.

## 4. Duplicate and stray-path cleanup

| Path/material | Disposition | Canonical treatment |
|---|---|---|
| `docs/docs/constitution/OAS-003*` | DUPLICATE | Retain only the authoritative `docs/constitution` copy in active presentation |
| Partial or contaminated OAS-004/OAS-005/OAS-006 copies under `docs/docs/constitution` | DUPLICATE / ARCHIVE EVIDENCE | Remove from active presentation; preserve Git provenance and record that they are not sources of truth |
| Academy orphans under `docs/docs/constitution` | ARCHIVE | Reunite with the nonconstitutional Academy source set |
| `ACR-001` empty definitions scaffold referencing nonexistent registers | ARCHIVE OR REBUILD BY LATER CAP | Do not present as an operative definitions register; preserve it until a separately authorized definitions project replaces it |

## 5. Material deliberately not deleted

No unique historical text is authorized for destruction. Archive operations must preserve content, provenance and approval history. “Duplicate” means removal from competing active locations, not erasure from repository history.

## 6. Out-of-scope corpus work

The audit observed broader duplication across operations, finance, production canon, legal resources and implementation documents. FOUNDATION-004 governs that consolidation. CAP-015 closure should not expand into a silent repository-wide rewrite; those groups require their own subject-by-subject disposition records.

