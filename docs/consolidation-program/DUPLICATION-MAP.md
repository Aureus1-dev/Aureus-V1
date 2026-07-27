# Constitutional Consolidation Program — Duplication & Collision Map (Interim)

**Baseline:** `ce0e630ab47806ad2174c64cd4275c8d6ce74d05` (see `FREEZE-BASELINE.md`)
**Status:** Interim — deterministic pass complete for the full 670-file corpus; content-verified for the highest-stakes groups below. Remaining ID-collision groups and full per-file metadata extraction are in progress (background agents), to be folded into `CONSTITUTION-INVENTORY.md`.

This document distinguishes, per the program's governing rule, between:
- **A — exact byte-for-byte duplicates** (hash-verified, zero inference)
- **B — same identifier, unrelated content** (true ID collisions — two independently authored documents that happen to share a document ID)
- **C — same identifier, same base content, diverged** (forks/parallel drafts of the same underlying document)
- **D — probable path/naming defect** (not a content problem — a filesystem mistake)
- **E — same identifier, different genre, likely intentional pairing** (not yet confirmed as legitimate — flagged for confirmation, not assumed)

No classification below is based on filename similarity alone; every one is backed by a hash comparison and/or a direct content read, cited inline.

---

## A — Exact byte-for-byte duplicates (hash-verified)

| Hash (short) | Files | Note |
|---|---|---|
| `f8b08e86fc1a` | `docs/constitution/OAS-003-Identity-Mission-Vision-and-Purpose.md`<br>`docs/docs/constitution/OAS-003-Identity-Mission-Vision-and-Purpose.md` | Identical filename and identical content across two directories. |
| `6dd57a97dbce` | `docs/product-architecture/PA-004-user-journey-architecture.md`<br>`docs/product-architecture/PA-005-member-experience-architecture.md` | **Different filenames, different declared IDs (PA-004 vs PA-005), byte-identical content.** Two IDs pointing at the same text — needs Founder/owner disposition: one is presumably a copy-paste error at creation time. |

Full list: `raw-evidence/exact-duplicates.txt`. Only 2 of 670 files are exact duplicates — the corpus's problem is not wholesale copy-paste, it's ID collision and drift (below).

---

## D — Path defect: `docs/docs/constitution/` (nested duplicate path)

`docs/docs/constitution/` is not a legitimate directory — it is almost certainly the product of a bad `mkdir -p`/copy operation that duplicated the `docs/` path segment. It holds 9 files, several of which are directly related to `docs/constitution/` (see pattern C below). **Recommended disposition (for Phase 4, not executed here): eliminate the `docs/docs/` path entirely; nothing should live there long-term.** This is a structural finding, not a content one.

---

## C — Same identifier, same base content, diverged (contaminated fork)

Verified by full diff, not just hash/size comparison:

| ID | File A (`docs/constitution/`) | File B (`docs/docs/constitution/`) | Finding |
|---|---|---|---|
| OAS-004 | `OAS-004-Membership-Rights-and-Responsibilities.md` | `OAS-004-Foundational-Principles-and-Eternal-Laws.md` | **Identical base text** (both files' actual `# OAS-004 —` heading reads "Foundational Principles and Eternal Laws of the Open Advancement System" in both copies). File A's *filename* does not match its own internal title — it's mislabeled as "Membership-Rights-and-Responsibilities," a topic the file's content never addresses. File B has appended ~80 extra lines of what reads as pasted third-party review commentary ("I would score it around 9.8–9.9/10... What Claude is doing well...") — **non-constitutional review chatter baked directly into a file living in a constitution directory.** |
| OAS-005 | `OAS-005-Constitutional-Interpretation-Amendment-and-Document-Hierarchy.md` | `OAS-005-Definitions-and-Rules-of-Constitutional-Interpretation.md` | Same pattern: identical base text (internal title "Definitions and Rules of Constitutional Interpretation" in both), File A mislabeled by filename, File B has ~163 extra lines of appended review commentary. |
| OAS-006 | `OAS-006-Stewardship-Governance-and-Leadership.md` | `OAS-006-Rights-Human-Dignity-Agency-and-Constitutional-Protections.md` | Same pattern: identical base text (internal title "Rights, Human Dignity, Agency, and Constitutional Protections" in both), File A mislabeled by filename, File B has ~238 extra lines of appended review commentary. |

**Read together, these three are not three separate collisions — they are one systemic defect:** at some point, `docs/constitution/OAS-004/005/006` were saved under filenames that don't match their own content (the real "Membership Rights," "Constitutional Interpretation... Hierarchy," and "Stewardship Governance and Leadership" documents — if they exist at all — are not present at those paths), while a second copy of the same three documents was made under `docs/docs/constitution/` with correct filenames but with reviewer commentary accidentally left appended in the file body instead of being stripped or filed separately.

**This directly bears on the earlier FOUNDATION-003/OAS-001/ALC-001 supremacy question** raised in PR #47/#49: it means part of the OAS series everyone has been reasoning about includes at least one copy contaminated with non-canonical commentary text, and the filenames don't reliably identify the content. Any prior analysis of "what OAS-004/005/006 say" should be re-verified against the clean, appended-commentary-stripped text once a canonical copy is chosen.

**Founder decision required:** which of the two paths (or neither, if a third clean copy should be authored) becomes canonical; the appended commentary must be stripped either way; filenames in `docs/constitution/` need to be corrected to match actual content or the content needs to be re-verified against intended filenames.

---

## C — Same identifier, same subject, genuinely diverged draft (fork, not contamination)

| ID | File A | File B | Finding |
|---|---|---|---|
| SC-001 | `docs/canon/steward/foundation/SC-001-steward-constitution.md` (4,146 bytes) | `docs/steward/foundation/SC-001-Steward-Constitution.md` (5,442 bytes) | Not the same base text — a genuine parallel draft. File A: "Status: Founding Canon / Authority: Constitutional," opens with "# Purpose." File B: "Status: Founding Canon / Authority: Supreme Steward Document," adds a "# AUREUS" super-header, a "Classification/Supersedes/Approved By/Last Updated" metadata block absent from A, and opens with "# Preamble" instead of "# Purpose," with materially different phrasing throughout ("It is not a profession" vs "It is not a profession reserved for a few. Stewardship is the craft practiced by every person, every system, every policy, every decision, and every artificial intelligence operating within Aureus."). File B claims a higher/different authority level than File A for the same document ID. **Founder decision required** on which draft is canonical, or whether they need to be reconciled into one. |

---

## B — Same identifier, unrelated content (true ID collisions)

Verified: these are not variants of one document — they are two independently authored, differently titled documents that happen to reuse the same numeric ID. Confirmed by reading opening content of representative pairs (not filename alone):

| ID range | Series A | Series B | Verified example |
|---|---|---|---|
| FPB-000 – FPB-016 (17 IDs) | `docs/03-member-experience/frontend-blueprints/FPB-0XX — <Experience Canon room name>.md` (e.g. "The Aureus Opening," "The Living Hall," "The Circle") | `docs/frontend/blueprints/FPB-0XX-<technical topic>.md` (e.g. "Frontend-Production-Blueprint," "Screen-Architecture," "Member-Journey-Flows") | FPB-001: "# The Aureus Opening / Status: Permanent / Authority: Frontend Blueprint" vs "FPB-001 — Frontend Production Blueprint / Status: Production Blueprint / Authority: Master Frontend Build Specification." Confirmed unrelated. |
| BRAND-002 – BRAND-016 (15 IDs) | `docs/branding/BRAND-0XX-<topic>.md` | `docs/canon/branding/BRAND-0XX-<different topic>.md` | BRAND-002: "Brand Foundation" (Status: Draft for Founder Review) vs "Brand Identity" (Status: Living Draft, Canonical Designation: BRAND-002). Two entirely different documents both self-identifying as canonically "BRAND-002." |
| EX-001 | `docs/canon/branding/experience-architecture/EX-001-experience-architecture.md` | `docs/canon/execution-center/EX-001-execution-center-canon.md` | Different subject areas (brand experience architecture vs. execution-center canon). |
| OC-001 | `docs/canon/experience/OC-001-opening-ceremony-canon.md` | `docs/canon/opportunity-center/OC-001-opportunity-center-canon.md` | "Opening Ceremony" vs "Opportunity Center" — different subject areas. |
| OAS-ACA-007 | `docs/constitution/OAS-ACA-007-Community.md` | `docs/constitution/OAS-ACA-007-Truth-Ledger.md` | **Same directory, same ID, two unrelated documents** ("Community" vs "Truth Ledger") — the most severe form of this defect since it's not even a cross-directory collision. |

**This is 34 confirmed ID collisions across FPB/BRAND alone, plus EX-001, OC-001, and the internal OAS-ACA-007 collision — 37 total, all requiring a Founder/owner decision on renumbering** (every colliding ID needs exactly one document to keep it and the other(s) to be renumbered — never delete or silently reinterpret which one "wins").

`docs/docs/constitution/` is also confirmed **not a simple mirror** of `docs/constitution/`: it uses `OAS-002-Preamble.md` where `docs/constitution/` uses `ALC-002-Preamble-to-the-Constitution.md` for what appears to be the same conceptual role (a constitutional preamble) under two different ID prefixes (OAS vs ALC) — a hierarchy-level naming collision, not just a file one. It also contains `OAS-ACA-004/005/009/010` where `docs/constitution/` contains `OAS-ACA-001/002/006/007/007` — non-overlapping ACA numbers, meaning this is a **partial parallel drafting track**, not just a corrupted copy of the same set.

---

## E — Same identifier, different genre — likely intentional, not yet confirmed

These are **not constitutional documents** (work orders / verification reports), included only because they surfaced in the same ID-collision sweep. Pattern is consistent: every `WO-0NN` work-order spec has a same-numbered file under `docs/verification/WO-0NN-OPERATIONAL-VERIFICATION.md`. This looks like a deliberate spec+verification pairing convention, not a defect — flagged here for confirmation only, not treated as a governance issue. Same likely applies to `DOMAIN-002` (Voice-Backend / Voice-Frontend / Voice-Frontend-Manual-Validation-Plan — three related-but-distinct Voice domain docs, not a collision) and `PR-002` (Deferred-Surfaces-Justification vs Production-Foundation-Remediation — plausibly two distinct remediation-tracking docs). **No Founder decision needed here unless the deeper inventory finds otherwise.**

---

## Founder decisions this interim map already surfaces

1. **OAS-004/005/006 canonical source:** choose `docs/constitution/` or `docs/docs/constitution/` content as canonical (both need cleanup either way — wrong filenames on one side, appended commentary on the other).
2. **SC-001 (Steward Constitution):** two genuinely different drafts claim the same ID and different authority levels — needs reconciliation or an explicit choice.
3. **37 confirmed ID collisions** (FPB ×17, BRAND ×15, EX-001, OC-001, OAS-ACA-007) each need a renumbering decision — which document keeps the ID, which gets renumbered.
4. **`docs/docs/constitution/` disposition:** confirmed not a simple accidental mirror — contains a partial, non-overlapping parallel drafting track (`OAS-002` vs `ALC-002`, non-overlapping ACA numbers) that needs its own review, not just deletion.
5. **PA-004/PA-005** (`docs/product-architecture/`) are byte-identical under two different IDs and titles — needs a copy-paste-error confirmation.

Remaining work (in progress): full metadata inventory of all 670 files, remaining classification of any collision not covered above, and a content-based scan of `docs/production-canons/`, `docs/architecture/`, and other non-obvious directories for self-declared constitutional authority.
