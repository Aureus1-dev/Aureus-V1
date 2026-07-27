# Naming Validation Report — "Open Advancement System" → "Aureus"

**Status:** Classification complete. Edits drafted, uncommitted — presented for review below and in the working tree diff, per this program's established review-before-commit practice.

**Ruling implemented:** Founder ruling on institution naming — "Aureus" is the constitutional, institutional, operational, and public name; "Open Advancement System" shall no longer be used as the institution's name in constitutional or governance prose; the "OAS-" document-identifier prefix is unaffected (legacy identifier only, no migration authorized).

Every file in the corpus containing the literal phrase "Open Advancement System" (17 files, verified by grep against the full corpus), classified:

## Legacy document identifier

None of the 17 files' occurrences are this category — "Open Advancement System" the phrase never appears as part of a document ID (IDs use the "OAS-" prefix alone, e.g. `OAS-001`, which is untouched by this change and doesn't contain the full phrase).

## Historical reference / Intentional retained usage (preserved, not edited)

**5 files, 21 occurrences — none touched:**

| File | Why preserved |
|---|---|
| `docs/sessions/Session-001-Constitutional-Closeout.md` | An amendment-proposal record (CAP-001) that verbatim-quotes both "Current Constitutional Text" and "Proposed Constitutional Text" at a specific past point in time. Editing these quotes would falsify the historical record of what the draft actually said when the proposal was written — exactly what the ruling's "preserve historical quotations" instruction protects. |
| `docs/consolidation-program/CONSTITUTION-INVENTORY.md` | This program's own inventory, describing/quoting what the corpus's documents say. Retroactively editing it would misrepresent what was actually found during Phase 1. |
| `docs/consolidation-program/DUPLICATION-MAP.md` | Same reasoning — an audit-trail document describing findings as they were at the time of discovery. |
| `docs/consolidation-program/FOUNDER-DECISION-002-THE-CONSTITUTION.md` | Records a Founder ruling that itself refers to the pre-rename document titles; editing it would corrupt the decision record. |
| `docs/consolidation-program/FOUNDER-DECISION-BRIEF-THE-CONSTITUTION.md` | Same reasoning — the brief's evidence is specifically about what the documents said before this naming decision was made. |

## Requires replacement

**12 corpus files, 34 occurrences — all are the institution's name used in constitutional/governance prose (titles, purpose statements, definitional clauses, canonical-status clauses). None is a document-ID reference.**

| File | Occurrences | Lines |
|---|---|---|
| `docs/drafts/OAS-001_Draft_0.95.md` | 6 | 1, 5, 11 (×2), 19, 27, 39, 141 |
| `docs/constitution/OAS-003-Identity-Mission-Vision-and-Purpose.md` | 7 | 1, 5, 12, 20, 30, 54 (×2) |
| `docs/docs/constitution/OAS-003-Identity-Mission-Vision-and-Purpose.md` | 7 | 1, 5, 12, 20, 30, 54 (×2) |
| `docs/constitution/OAS-004-Membership-Rights-and-Responsibilities.md` | 4 | 1, 5, 12, 142 (×2) |
| `docs/docs/constitution/OAS-004-Foundational-Principles-and-Eternal-Laws.md` | 4 | 1, 5, 12, 142 (×2) |
| `docs/constitution/OAS-005-Constitutional-Interpretation-Amendment-and-Document-Hierarchy.md` | 2 | 46, 154 |
| `docs/docs/constitution/OAS-005-Definitions-and-Rules-of-Constitutional-Interpretation.md` | 2 | 46, 154 |
| `docs/constitution/OAS-006-Stewardship-Governance-and-Leadership.md` | 1 | 12 |
| `docs/docs/constitution/OAS-006-Rights-Human-Dignity-Agency-and-Constitutional-Protections.md` | 1 | 12 |
| `docs/constitution/OAS-008-Membership-Citizenship-Belonging-and-Participation.md` | 2 | 1, 5 |
| `docs/constitution/OAS-011-Constitutional-Justice-Review-Dispute-Resolution-and-Due-Process.md` | 1 | 12 |
| `docs/docs/constitution/OAS-002-Preamble.md` | 7 | 1, 5, 12, 20, 34, 40 (×2) |

Both the `docs/constitution/` and `docs/docs/constitution/` copies of `OAS-003/004/005/006` receive the identical fix — this is independent of, and doesn't presuppose an answer to, the still-open question of which directory is the canonical location for those documents (Repair Plan E5/E12).

## What the replacement does, precisely

Every occurrence is a straightforward substitution of the institution's name — "the Open Advancement System" → "Aureus" (dropping the leading article where grammar requires, e.g. "of the Open Advancement System" → "of Aureus"). One occurrence needed slightly more care: `OAS-001` Section 1 (the Charter's own naming clause) currently reads *"the institution established by this Charter is the Open Advancement System, herein 'the System' or 'OAS'"* — since "OAS" was defined there specifically as an abbreviation *of the institution's name*, and the ruling says "OAS-" is now a document-identifier only, not the institution's name, that clause drops the "'OAS'" abbreviation and keeps only "'the System'" as the ongoing shorthand term.

**"The System" is not touched anywhere.** It is used extensively throughout the `OAS-00X` series as the defined shorthand for the institution (per `OAS-005` §13: *"'Institution' and 'System' are used interchangeably... to refer to the same entity"*). Once the definitional anchor (`OAS-001` §1, `OAS-005` §13) points to "Aureus," every subsequent "the System" reference continues to correctly mean Aureus without needing individual edits — this is what keeps the implementation to 12 files instead of hundreds.

**Document ID prefixes (`OAS-001`, `OAS-005`, cross-references like "OAS-001, Article I, Section 2") are untouched everywhere** — these are citations to document identifiers, not institution-name usage, per the ruling.
