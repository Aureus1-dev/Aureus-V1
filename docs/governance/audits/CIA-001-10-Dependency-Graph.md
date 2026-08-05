# CIA-001 — Dependency Graph

**Parent protocol:** CIA-001 — Constitutional Integrity Audit
**Status:** Complete
**Date:** 2026-07-21
**Scope:** This graph tracks *defect-to-defect* and *defect-to-decision* dependencies (what must be resolved before what) — the dimension that actually determines repair order. A full document-to-document citation graph would be enormous (~500 files) and most of it (per the Duplicate Identifier Register and Authority Matrix) consists of directory-local Authority citations with no cross-domain links; the load-bearing dependencies are the ones below.

---

## 1. The two root decisions everything else hangs from

```
MDR-015 (repo-wide: every domain canon cites unratified OAS-001)
   │
   ├── MDR-002 (ALC-001 vs OAS-001 vs ALC-003/4/5 supremacy contradiction)
   │      │
   │      └── MDR-001 (ALC-001's three-way "Steward" definition contradiction)
   │             │
   │             └── Blocks: drafting any future "Steward"-named constitution
   │                 (e.g. a Member/Personal AI Steward Constitution)
   │
   └── Once resolved, unblocks mechanical repairs in:
          MDR-003, MDR-004, MDR-005, MDR-009, MDR-010, MDR-011  (constitutional family, frozen paths)
          MDR-016 (operations), MDR-018 (finance), MDR-019 (technology)  (domain canons, not frozen, but same root-cause pattern)
```

**Reading this graph:** MDR-015 is the broadest possible root — it is the finding that the entire domain-canon corpus (not just the constitutional family) cites the same unratified document as its authority. MDR-002 is the constitution-family-specific version of the same question (which document, ALC-001 or OAS-001, actually governs). MDR-001 is downstream of MDR-002 because you cannot definitively settle what "Steward" means until you know which document's definition is authoritative.

## 2. Independent defects (no dependency on the root decisions)

These can be repaired at any time, in any order, without waiting on MDR-001/002/015:

- **MDR-006** (PC-0XX truncation) — independent; Production Canons don't cite ALC-001/OAS-001 by number anywhere in their bodies (confirmed zero cross-references).
- **MDR-007** (AI Canon truncation) — independent, same reasoning.
- **MDR-008** (PA-004/005 duplicate, Member Core gap) — independent; Product Architecture doesn't cite the constitutional supremacy question.
- **MDR-012** (new governance layer's undeclared authority) — soft dependency on MDR-002/015 (it would be natural to state the relationship *after* the supremacy question is settled, but the layer can function without it in the interim).
- **MDR-013** (AICP-001 identity) — **already resolved**, no dependency.
- **MDR-014** (OC-001/MJC-002) — independent; a content-organization question, not an authority question.
- **MDR-017** (Legal: duplication + missing legal text) — the duplication half is independent; the missing-legal-text half is an entirely separate launch-readiness work item with its own (legal-review) dependency, not a governance dependency.
- **MDR-020** (OAS-COM-002 void file) — independent.
- **MDR-021** (broken cross-references: WO-030, PR-001, IC-008/010, IDRs) — fully independent, purely mechanical.

## 3. Frozen-path dependency (a separate, orthogonal gate)

```
Standing Founder freeze (PR-002 §5 / PD-000 "Standing constraints carried forward" / PR-003 §7)
   │
   └── Blocks ANY modification, merge, or deletion of files under:
          docs/constitution/        (MDR-003, MDR-004, MDR-005, MDR-009, MDR-011 live here)
          docs/docs/constitution/   (MDR-010 lives here)
          docs/constitutional/      (MDR-011's CAP-REGISTER lives here)
          docs/sessions/
          docs/drafts/              (OAS-001 itself lives here — see MDR-015)
```

This freeze is **independent of, but overlapping with**, the MDR-001/002/015 authority question — even mechanical, zero-content-risk fixes (like the already-drafted ALC-001 de-duplication) cannot proceed until the freeze itself is lifted or an exception is granted, regardless of whether the authority question is separately resolved. The one exception already granted and executed is MDR-013 (AICP-001), which did not touch a frozen path.

## 4. Non-frozen domain-canon defects (operations/technology/legal/finance/communications)

These directories are **not** among the five explicitly frozen paths, but per PD-000's own framing, this entire class of finding (duplicate/colliding governance documentation across domains) was treated as "explicitly outside delegated engineering authority" pending Founder review — a softer, but real, gate:

```
Founder review of domain-canon duplication (per PD-000's framing, not a hard freeze)
   │
   ├── MDR-016 (operations: 2 parallel canons)
   ├── MDR-018 (finance: 5+4 duplicate pairs)
   ├── MDR-019 (technology: 31/42 files in collision groups)
   └── MDR-020 (communications: void file — this one has no duplication, so it may not need
                the same gate; flagged as likely independent, but included here since it's in
                the same "domain canon" family as the others)
```

## 5. Recommended repair order (synthesizing the above)

1. **Founder resolves MDR-015 / MDR-002 / MDR-001** (the three linked authority/definition questions) — or explicitly defers them and authorizes proceeding with everything else in the meantime.
2. **Founder decides on the standing freeze** (lift it, grant further exceptions, or keep it and defer §3's items indefinitely).
3. **In parallel with 1–2** (fully independent): repair MDR-006, MDR-007, MDR-008, MDR-014, MDR-020, MDR-021 — none of these depend on anything above.
4. **Once the freeze (③) clears:** MDR-003, MDR-004, MDR-005, MDR-009, MDR-010, MDR-011 — all have fixes already drafted or clearly scoped.
5. **Once domain-canon review (§4) clears:** MDR-016, MDR-018, MDR-019.
6. **MDR-017's legal-text gap** proceeds on its own track (legal review), independent of every other item's timeline.
