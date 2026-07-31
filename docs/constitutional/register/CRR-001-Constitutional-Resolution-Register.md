# Constitutional Resolution Register

## Purpose

This register tracks constitutional anomalies identified during the post-ratification inventory (`docs/consolidation-program/CONSTITUTIONAL-INVENTORY-CURRENT-STATE.md`, 2026-07-31) and holds the formal Founder ruling on each, once made. It exists so that governance flows in one direction only:

**Founder decision → Constitutional record → Repository change.**

No entry in this register may be treated as authorizing a repository change on its own. A CRR entry becomes actionable only once its **Ruling** field is filled in by the Founder; the corresponding repository change is then made as a separate, traceable step (and, per `OAS-010`'s stewardship-of-the-record process, is expected to produce its own Constitutional Record entry, the way ratification produced Entry 001). Until an item is ruled on, the underlying document(s) remain exactly as they are — unresolved, not defaulted into either canon or archive by inaction.

This register does not itself carry constitutional authority. It is a tracking instrument, the same role `CAP-REGISTER.md` plays for amendment proposals.

---

## Resolution Registry

| CRR | Question | Category | Related Documents | Status | Ruling | Filed |
|-----|----------|----------|--------------------|--------|--------|-------|
| CRR-001-001 | Should `OAS-001` (the ratified Founding Charter) relocate out of `docs/drafts/` into `docs/constitution/` alongside `OAS-002`–`011`, and if so, to what path? | Administrative (location only — content is already ratified and not in question) | `OAS-001` | Open — pending ruling | — | 2026-07-31 |
| CRR-001-002 | What is the constitutional relationship, if any, of the Academy documents (`OAS-ACA-001`, `OAS-ACA-002`, `OAS-ACA-006`, and the two `OAS-ACA-007` files) to the ratified Constitution — constitutional text, canonical-but-non-constitutional, or something else? | Governance | `OAS-ACA-001`, `OAS-ACA-002`, `OAS-ACA-006`, `OAS-ACA-007` (×2) | Open — pending ruling | — | 2026-07-31 |
| CRR-001-003 | Two files both claim the identifier `OAS-ACA-007` (`Community.md` and `Truth-Ledger.md`). Which keeps the number, and what does the other become? | Administrative (blocked on CRR-001-002 — the documents' constitutional status should likely be settled before renumbering them) | `OAS-ACA-007-Community.md`, `OAS-ACA-007-Truth-Ledger.md` | Open — pending ruling | — | 2026-07-31 |
| CRR-001-004 | What is the constitutional status of `ALC-002` through `ALC-013`, given that `ALC-001` — the document each of them states as their derived authority — was retired by Founder Decision 002? Options include: independent review and re-anchoring to the ratified Constitution, archival alongside `ALC-001` as historical/source material, or some documents in the series being treated differently from others. | Governance | `ALC-002`–`ALC-013` (12 files) | Open — pending ruling | — | 2026-07-31 |
| CRR-001-005 | `FOUNDATION-001`/`002`/`003` are treated as the supreme governing authority above the Constitution (per `OAS-001` Art. I §3 and the ratification record), but none carries a dated ratification record of its own. Should this be resolved by retrospective ratification, a formal amendment, or another mechanism — and should it happen before or independent of any further constitutional freeze? | Governance — **elevated priority**, per Founder direction: this should be resolved before any constitutional freeze, since a freeze presumes the authority being frozen is itself on the record. | `FOUNDATION-001`, `FOUNDATION-002`, `FOUNDATION-003` | **Resolved** | Founder formally affirmed all three as the constitutional foundation of Aureus, no substantive text changes authorized. Full ruling recorded in Constitutional Record Entry 002. | 2026-07-31 |
| CRR-001-006 | `OAS-006` through `OAS-011` cite a "CAP-011" amending `OAS-001`'s entrenched-provisions list, but `CAP-REGISTER.md`'s own `CAP-011` ("Adaptive Communication") is a different, unrelated proposal. How should the two numbering universes be reconciled — renumber one, or determine they were never the same registry and rename the citation? | Administrative | `CAP-REGISTER.md`, `OAS-006`–`OAS-011` (citation sites) | Open — pending ruling | — | 2026-07-31 |

---

## Rulings Recorded

### CRR-001-005 — Foundation Ratification (Resolved 2026-07-31)

The Founder ruled:

> "The Foundation documents (FOUNDATION-001, FOUNDATION-002, and FOUNDATION-003) are hereby formally affirmed as the constitutional foundation of Aureus. These documents already accurately express the institution's highest governing principles. No substantive changes are authorized. This ruling exists to close the gap between constitutional practice and constitutional record. Their authority comes from Founder ratification, not from repository location or historical assumption."

Recorded in full, with authority analysis, at `docs/constitutional-record/002-ratification-of-the-foundation-documents.md` (Constitutional Record Entry 002). No document was moved, renamed, renumbered, or edited to implement this ruling — the ratification record itself is the entire implementation.

---

## Recommended Sequencing for Remaining Items (non-binding)

The five items below remain **Open — pending ruling**. This section is analysis, not a decision — it recommends an order and explains why, but rules on nothing. Order to present for Founder decision:

1. **CRR-001-004 — Status of `ALC-002`–`013`.** Recommended first among the remaining five. It's the broadest open question (12 files) and several other items read differently depending on its outcome — e.g., whether the Academy documents (`CRR-001-002`) are evaluated against a constitutional tier that still includes ALC-track material, or one that doesn't.
2. **CRR-001-002 — Status of the Academy documents.** Recommended second, immediately after `CRR-001-004`, for the reason above — its answer benefits from knowing what the ALC track's status is, and it in turn gates `CRR-001-003`.
3. **CRR-001-003 — Duplicate `OAS-ACA-007` identifier.** Recommended third. This is a narrow, mechanical renumbering question, but renumbering a document before its constitutional status is settled risks having to renumber it again — it should follow `CRR-001-002`, not precede it.
4. **CRR-001-001 — Location of `OAS-001`.** Recommended fourth. Purely administrative (the content is already ratified and not in question), and independent of the other four — it could technically be decided at any point, but placing it after the status questions keeps all of the "what is this document" decisions together before the "where does it live" decisions begin.
5. **CRR-001-006 — Dual `CAP-011` numbering.** Recommended last. Also independent of the others, but lowest urgency — it affects only a cross-reference citation inside already-ratified text, not any document's status or location, and correcting it doesn't unblock or get blocked by anything else in this register.

---

## Status Legend

- **Open — pending ruling**: Item recorded; no Founder decision has been made. The underlying document(s) are unchanged and their status remains exactly as described in the current-state inventory.
- **Ruled — pending implementation**: Founder has ruled; the ruling is recorded below under the entry; the corresponding repository change has not yet been made.
- **Resolved**: Repository has been updated to reflect the ruling, and (where applicable) a Constitutional Record entry has been created recording it.

---

## Notes

- All six entries originate from `docs/consolidation-program/CONSTITUTIONAL-INVENTORY-CURRENT-STATE.md` §7 ("Consolidated list of open inconsistencies"), filed the same day as that inventory.
- Two inconsistencies noted in that inventory — `OAS-004`/`005`/`006` filename-vs-title mismatches, and `ACR-001` containing no definitions — are pure repository hygiene (no governance question attached) and are intentionally not carried into this register; they may be corrected as ordinary maintenance once the CRR-001-004-adjacent question of what `ACR-001` is for has an answer, or sooner if the Founder prefers.
- As of 2026-07-31: one entry (`CRR-001-005`) has been ruled on and resolved; five remain open pending ruling. This register itself makes no constitutional determination — each ruling above is the Founder's, reproduced here for traceability, with its authority analysis recorded separately in the Constitutional Record.
