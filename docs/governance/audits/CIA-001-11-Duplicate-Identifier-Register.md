# CIA-001 — Duplicate Identifier Register

**Parent protocol:** CIA-001 — Constitutional Integrity Audit
**Status:** Draft evidence, in progress — pending the four in-flight domain-inventory passes (operations, technology, legal, finance are each independently flagged by `docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md` as containing "the identical pattern" of duplication documented below; not yet independently re-verified by this audit as of this revision)
**Date:** 2026-07-21
**Method:** Every entry below is confirmed either by `md5sum` byte-comparison, `diff`, or direct reading — inferred similarity alone is never sufficient to list an entry as "confirmed duplicate."

---

## 1. Confirmed exact or near-exact duplicates (content-level)

| # | Identifier / Concept | Locations | Evidence | Status |
|---|---|---|---|---|
| D-01 | Product Architecture "Member Core" content | `docs/product-architecture/PA-004-user-journey-architecture.md` vs `docs/product-architecture/PA-005-member-experience-architecture.md` | Byte-identical, md5 `b28ca113d0aaa230c4c05245343c52b6`. PA-005's own first line reads "Document 4 — User Journey Architecture" — wrong content under the PA-005 filename/number entirely. | **Open.** Likely explanation: PA-005 was meant to be the never-written "Member Core Architecture" document (PA-001/002 name 12 core systems; 10 got dedicated docs; Member Core and Administration & Operations never did) and was accidentally populated with a copy of PA-004. |
| D-02 | ALC-001 Appendix A ("Foundational Definitions," all 20 sections) | Two copies inside `docs/constitution/ALC-001-Aureus-Living-Constitution.md` | Byte-identical, md5 `ca6e923d9e2d7f215748e695b2a2e0f9`, 156 lines each. | **Proposed fix drafted, NOT applied to the working tree** — held in git stash pending Founder resolution of the broader constitutional-freeze question (see CIA-001 Master Defect Register, MDR-003). |
| D-03 | ALC-002 Article XL ("The Nature of Love") | Two copies inside `docs/constitution/ALC-002-Preamble-to-the-Constitution.md` | Byte-identical, md5 `d1ae8c984102aec0a8d16b265ce98679`, 108 lines each. | Open, not yet repaired anywhere. |
| D-04 | ALC-002 Article XLIII ("The Nature of Belonging") | Two copies inside `ALC-002`, first (31 lines) is an exact truncated prefix of the second (93 lines) | Diff-confirmed: first 32 lines identical, second continues with content the first entirely lacks. | Open, not yet repaired. |
| D-05 | ALC-002 Article XXX — numbering collision, not content duplication | Two *different* articles both numbered "Article XXX" ("The Enduring Covenant" and "The Nature of Future Generations") | Confirmed via `sort \| uniq -c` across all 60 Article headings in the file — the only numeral used twice for genuinely different content. | Open — repair requires renumbering everything after the insertion point, a Founder-judgment call, not a mechanical fix. |
| D-06 | ALC-011 Articles VII–XII ("Commitment to Justice" through "Commitment to Hospitality") | Two copies inside `docs/constitution/alc/ALC-011-The_Constitutional_Commitments_of_Aureus.md`, immediately followed by a jump straight to "Article XIX" | Byte-identical, md5 `52df0c24b91a659d0acf01d1c0baaa75`, 69 lines each. Articles XIII–XVIII never exist anywhere in the file as a result. | Open. |
| D-07 | `docs/docs/constitution/OAS-003-Identity-Mission-Vision-and-Purpose.md` | Exact duplicate of canonical `docs/constitution/OAS-003-Identity-Mission-Vision-and-Purpose.md` | Byte-identical, md5 `6dad3d2f1d3ff050a26837998e2122d2`. | Open — part of the frozen `docs/docs/constitution/` tree; no action taken (freeze in effect). |
| D-08 | `docs/docs/constitution/OAS-004/005/006` | Each duplicates the *first portion* only of its canonical (mismatched-name) counterpart, then appends 82–238 lines of raw Founder/AI review chat commentary never meant to be part of a governing document | Diff-confirmed line-for-line match on the shared prefix; commentary quoted verbatim in the earlier Governance Recovery Report. | Open — frozen path, no action taken. |
| D-09 | AICP-001 identity/location mismatch | Was: `docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md`; content is 100% AICP-001 (Aureus AI Collaboration Protocol), zero "Risk Management" content anywhere in the file | Confirmed via repository-wide string search (zero hits for "ARM-001"/"Risk Management" in the body) and full read (opens "AICP-001," closes "End of Document"). | **RESOLVED this session** — `git mv` to `docs/canon/ai/AICP-001-Aureus-AI-Collaboration-Protocol.md`, commit `2f12a9c`, repair record `docs/governance/repairs/MOVE-001-AICP-001-identity-correction.md`. |
| D-10 | `OAS-ACA-007` — numbering collision, not content duplication | Two files both titled `OAS-ACA-007`: `OAS-ACA-007-Community.md` and `OAS-ACA-007-Truth-Ledger.md` | Both files read in full during the earlier Governance Recovery Audit; both complete, unrelated topics, same number. | Open. |
| D-11 | Filename/content mismatch (not duplication, but the same defect class) | `docs/constitution/OAS-004-Membership-Rights-and-Responsibilities.md`, `OAS-005-Constitutional-Interpretation-Amendment-and-Document-Hierarchy.md`, `OAS-006-Stewardship-Governance-and-Leadership.md` — each file's actual body is about a different topic than its filename promises | Diff-confirmed each canonical file's body is an exact prefix-match of the corresponding `docs/docs/constitution` orphan (see D-08). | Open — frozen path. |

## 2. Confirmed duplicate-concept documents (different content, same subject, undeclared relationship)

| # | Concept | Locations | Evidence | Status |
|---|---|---|---|---|
| D-12 | "Opening Ceremony Canon" | `docs/canon/experience/OC-001-opening-ceremony-canon.md` vs `docs/canon/member-journey/MJC-002-opening-ceremony-canon.md` | Both read in full this session. Same title, near-identical scope (ceremony sequence, Member's Mark, motion/light/audio, transition question "How can we help?"). Different body text — not a content duplicate — but neither document references the other, and OC-001 declares no parent authority while MJC-002 declares `Parent Authority: MJC-001`. | Open — see Constitutional Lineage §6 for the audit's inference (OC-001 likely superseded-in-practice by the MJC family) and the Founder decision this requires (formally supersede OC-001, or declare both intentionally layered). |

## 3. Claims not yet independently verified by this audit (carried from PD-000, pending domain-inventory agents)

`docs/work-orders/PD-000-Production-Intelligence-Readiness-Audit.md` (line 350) asserts, but this audit has not yet independently re-verified with hash evidence:

- `docs/operations/`: "OAS-OPS-002 through OAS-OPS-010, roughly 15 duplicate/triplicate pairs"
- `docs/technology/`: "OAS-TECH-001 through 006, heavy collisions"
- `docs/legal/`: "OAS-LEG-001 duplicated"
- `docs/finance/`: "OAS-FIN-001/002/004/005 duplicated"

These are being independently verified now by four parallel inventory passes; this register will be updated with hash-level evidence (or a correction, if PD-000's claim doesn't hold up under direct verification) once those return. Until then, these four items are listed as **unverified claims, not confirmed defects** — per AICP-002 Principle 3 ("Evidence Before Opinion"), a defect is not entered as confirmed until this audit has independently checked it.

## 4. Summary counts (as of this revision, subject to revision when pending items resolve)

- Confirmed exact/near-exact content duplicates: 8 (D-01 through D-08, excluding D-09 which is resolved)
- Confirmed numbering collisions (different content, same identifier): 3 (D-05, D-06's downstream gap, D-10)
- Resolved this session: 1 (D-09)
- Confirmed duplicate-concept (undeclared relationship, different content): 1 (D-12)
- Unverified claims pending independent re-check: 4 (operations, technology, legal, finance)
