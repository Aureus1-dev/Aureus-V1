# Constitutional Consolidation Program — Duplication & Collision Map

**Baseline:** `ce0e630ab47806ad2174c64cd4275c8d6ce74d05` (see `FREEZE-BASELINE.md`)
**Status:** Phase 1 (Inventory) complete. The original deterministic pass (below, unchanged) covered the full 670-file corpus and content-verified the highest-stakes groups. The "Phase 1 Addendum" section further down extends this document with everything found by the full Fragment 1–5 inventory pass — full per-file metadata now lives in `CONSTITUTION-INVENTORY.md`, and this document's own consolidated "Founder decisions required" list (at the very end) supersedes the interim one below it. No content below has been deleted; only appended to.

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

> **Superseded:** the "Founder decisions this interim map already surfaces" list above (items 1–5) is preserved verbatim for the record, but is now superseded by the consolidated, merged list at the end of this document (§ "Founder decisions required — consolidated (supersedes the interim list above)"), which folds these five items together with everything found by the full Phase 1 inventory pass (Fragments 1–5). Read the consolidated list at the bottom of this document as the current one.

---

# Phase 1 Addendum — Findings from the Full Inventory Pass (Fragments 1–5)

**Status:** Phase 1 (Inventory) complete. The sections below extend this document with every NEW collision/defect family found by Fragments 1, 2, 3, and 5 that was not already covered by the deterministic pass above. Nothing above this line has been deleted or altered. Full per-file detail for every finding below lives in `CONSTITUTION-INVENTORY.md`; this addendum records the collision/defect classification only, using the same A/B/C/D/E scheme already established above.

## OAS-001's non-ratification (confirmed via direct quote)

`docs/drafts/OAS-001_Draft_0.95.md` — the "Founding Charter of the Open Advancement System" that the entire OAS constitutional series (`OAS-003`–`OAS-011`) and ~100 department Charter/Framework documents cite as their supreme, entrenching authority — is itself unratified. Its own header states: **"Status: Draft 0.95 — Constitutional Revision of Draft 0.9, integrating canonical institutional philosophy. Not yet ratified."** Its closing line: *"End of OAS-001 Draft 0.95. Awaiting Founder review of updated Notes N1–N9, in particular N2, N4, and N6, before further canonization."*

Two independent amendment-tracking documents affirmatively confirm it was never approved:
- `docs/sessions/Session-001-Constitutional-Closeout.md` (CAP-001): *"Current Constitutional Text: None. No constitutional canon exists prior to this proposal."* ... closing: *"End of CAP Register. 19 CAPs recorded. All Status: Draft. No canonical document has been altered."*
- `docs/constitutional/register/CAP-REGISTER.md`: *"No CAPs have been approved or merged into canonical documents at this time. All 14 CAPs remain in Draft status pending constitutional review."*

**Yet** `docs/constitution/OAS-006`–`OAS-011` (and their `docs/docs/constitution/` counterparts) already reference "the Founding Charter (OAS-001)" in their own headers as though it were existing, ratified, canonized law. This is not a duplication/collision in the A–E sense — it is logged here as the single most consequential authority-chain defect found in the full inventory pass, because it is the root that the department Charter/Framework corpus below (and 9 constitutional articles) all hang from. See `CONSTITUTION-INVENTORY.md` § 6.1 and § 5 (Fragment 5, Q3–Q4) for full detail.

## D — Path/scope-manifest defect: the department Charter/Framework/SOP corpus was outside the original scope manifest

`docs/drafts/`, `docs/implementation/`, and all 9 department directories (`docs/communications/`, `docs/data/`, `docs/finance/`, `docs/human-resources/`, `docs/legal/`, `docs/operations/`, `docs/risk/`, `docs/security/`, `docs/technology/`, each with `sops/`), plus `docs/architecture/experience/` — a ~230-file corpus — were not in the original `FREEZE-BASELINE.md` scope manifest. They were surfaced only by Fragment 4's repo-wide grep sweep and then fully inventoried by Fragment 5. This is a scope-manifest gap discovered during Phase 1 itself, not a retroactive baseline change (see the updated `FREEZE-BASELINE.md`).

## B — Department Charter-tier ID collisions (4 new pairs, same directory)

Verified by reading both files' full header + Purpose text in each pair, not filename alone:

| ID | File A | File B | Finding |
|---|---|---|---|
| OAS-FIN-001 | `docs/finance/OAS-FIN-001-Finance-Charter.md` | `docs/finance/OAS-FIN-001-Financial-Governance-Charter.md` | Both cite OAS-001; differ in title and Purpose detail level (terse one-liner vs. detailed enumeration). |
| OAS-LEG-001 | `docs/legal/OAS-LEG-001-Legal-Charter.md` | `docs/legal/OAS-LEG-001-Legal-and-Regulatory-Governance-Charter.md` | Same pattern as Finance. |
| OAS-OPS-001 | `docs/operations/OAS-OPS-001-Operational-Governance-Charter.md` | `docs/operations/OAS-OPS-001-Operations-Charter.md` | **Most severe of the four**: not just a title/detail difference — the two files disagree on who the supreme authority even is. File A cites `Authority: OAS-001 — Founding Charter`; File B cites `Authority: Aureus Stewardship Council`, a governing body, not a document. |
| OAS-TECH-001 | `docs/technology/OAS-TECH-001-Technology-Charter.md` | `docs/technology/OAS-TECH-001-Technology-and-Digital-Stewardship-Charter.md` | Both cite OAS-001; differ in framing verb ("constitutional foundation" vs. "constitutional authority") and scope enumeration. |

All four pairs share owner titles, effective dates (July 13, 2026), and "Canonical Draft v1.0" status — consistent with having been generated in the same bulk-authoring pass, then apparently re-run or duplicated for these four departments without deduplication.

## B — Department Framework-tier ID collisions (18 new groups, same directory)

Confirmed by reading Purpose/title text on every pair/trio, not filename alone:

- **Finance (4 groups, 002–005):** OAS-FIN-002 (Financial-Governance-Framework vs. Financial-Governance-and-Fiscal-Accountability-Framework); OAS-FIN-003 (Budgeting-Accounting-and-Treasury-Framework vs. Financial-Planning-and-Budgeting-Framework); OAS-FIN-004 (Audit-Risk-and-Financial-Assurance-Framework vs. Revenue-and-Income-Management-Framework); OAS-FIN-005 (Financial-Standards-and-Continuous-Stewardship-Framework vs. Treasury-and-Cash-Management-Framework).
- **Operations (9 groups, 002–010, several 3-way):** OAS-OPS-002 (3-way), 003 (3-way), 004 (3-way), 005 (3-way), 006 (2-way), 007 (2-way), 008 (2-way), 009 (2-way), 010 (2-way).
- **Technology (5 groups, 002–006):** OAS-TECH-002 (3-way), 003 (3-way), 004 (3-way), 005 (3-way), 006 (2-way; also a title-only collision with 005's second file — two differently-numbered files share the exact same title "Technology Standards and Continuous Stewardship Framework").

Full per-pair titles, Purpose text, and Superior-Authority citations are in `CONSTITUTION-INVENTORY.md` § 5.3 and § 5.4.

## B — Department SOP-tier ID collisions (25 new groups, same directory)

- **Finance (4 groups, 101–104), Legal (4 groups, 101–104), Technology (4 groups, 101–104 — 101–103 are 3-way):** each a same-ID, different-content pair/trio of operational SOPs citing the same parent Framework.
- **Operations (13 groups, 101–113 — 101–104 are 3-way, 105–113 are 2-way):** the single largest same-directory collision family found anywhere in the corpus.

Full per-file paths are catalogued in `CONSTITUTION-INVENTORY.md` § 5.6.

## B — OC-001 / MJC-002 (different IDs, same role — logged alongside the ID-collision findings)

`docs/canon/experience/OC-001-opening-ceremony-canon.md` and `docs/canon/member-journey/MJC-002-opening-ceremony-canon.md` share the exact title "Opening Ceremony Canon" and govern the identical Member first-encounter moment, verified by full-text read (not filename alone): OC-001 states `Authority: Product Canon` with a 10-step choreography; MJC-002 states `Authority: Institution-wide` (`Parent Authority: MJC-001`) with a different 5-step choreography plus an accessibility section OC-001 lacks. Not a literal same-ID collision (different prefixes), but the same underlying defect — two independently drafted specifications for one experience — and is logged here because `OC-001` is already part of the existing B-collision list (vs. `docs/canon/opportunity-center/OC-001`) and this is additional context on that same document.

## B — MJC-001 / MS-001 (different IDs, same title, same role)

`docs/canon/member-journey/MJC-001-member-journey-canon.md` and `docs/canon/member-stewardship/MS-001-member-journey-canon.md` share the identical title "Member Journey Canon," both explicitly claim to define "how every Member/person experiences Aureus," and are structured around incompatible frameworks (session-phase-based, 7-doc series vs. lifecycle-topic-based, 8-doc series), with no cross-reference between the trees.

## E — BR-*/BRAND-* parallel trees (structural duplication, not a literal ID collision — flagged for confirmation)

`docs/canon/brand-and-identity/` (BR-001–008, Founding Canon/Canonical) and `docs/canon/branding/` (BRAND-001–020, Living Draft) are two parallel, independently-numbered brand-constitution series covering overlapping ground (BR-002↔BRAND-008 language/voice; BR-003↔BRAND-006/007 visual identity; BR-005↔EF-001 trust; BR-006↔BRAND-013 architectural/design language) under different authority tiers, with no cross-reference between them found anywhere in either tree. This is larger in scope than the already-logged BRAND-002–016 ID collision (which is a cross-directory same-ID collision between `docs/branding/` and `docs/canon/branding/` — a separate, already-documented defect); this new finding is a same-role, different-ID-prefix parallel series discovered entirely within `docs/canon/`.

Separately, `docs/branding/README.md` lists "BRAND-001 — Brand Constitution" as part of its own series, but no BRAND-001 file exists in `docs/branding/` — the repository's only BRAND-001 is `docs/canon/branding/BRAND-001-brand-constitution.md`, extending the already-known BRAND-002–016 collision family one ID lower (as a dangling reference rather than a second physical file).

## E — AFX vs. AXC parallel "experience constitution" series (flagged for confirmation)

`docs/frontend/canon/` (AFX-001–006, Canonical) and `docs/03-member-experience/experience-canon/` (AXC-001–009, Permanent/Living Draft) both independently claim to be the foundational "experience constitution" governing member-facing interaction, tone, and design, from two different directories with two different ID prefixes and no cross-references between them in either direction. Not a Group B collision under this document's own taxonomy (no shared numeric IDs), but the same underlying disease as the BR/BRAND finding above.

## C — ALC-011 internal corruption (new, distinct from any cross-file collision)

`docs/constitution/alc/ALC-011-The_Constitutional_Commitments_of_Aureus.md` — Articles VII–XII ("Commitment to Justice" through "Commitment to Hospitality") are duplicated verbatim, back-to-back, at two different line ranges within the same file; immediately after the second copy, the numbering jumps straight to "Article XIX," meaning Articles XIII–XVIII were never written or were overwritten by the duplicate block. This is a copy-paste corruption internal to a single file — no other file shares its ID — logged here under Group C ("same underlying document, diverged/corrupted") by extension, since the defect is a self-collision between two halves of the same document rather than between two files.

## C — Extended AI-commentary-contamination list (OAS-007/009/010/011, beyond the already-logged OAS-004/005/006)

The original C-group finding above (OAS-004/005/006, `docs/constitution/` vs. `docs/docs/constitution/`) is now confirmed to extend further, and — critically — into the "clean" side of the corpus previously believed unaffected:

- `docs/constitution/OAS-007-Duties-Responsibilities-and-Civic-Obligations.md` — ~65 lines of un-stripped AI reviewer commentary ("I would score it around 9.9/10..."), a "GitHub Repository File" instruction block, and the next Constitutional Work Order (CWO-011) prompt, all pasted after "End of OAS-007 draft."
- `docs/constitution/OAS-009-Governance-Constitutional-Institutions-and-the-Distribution-of-Authority.md` — a stray filename/path artifact pasted as literal content at end of file (a lesser instance of the same underlying hygiene failure).
- `docs/constitution/OAS-010-Constitutional-Amendment-Process-Canonization-and-Stewardship-of-the-Constitutional-Record.md` — ~170 lines of appended AI-review commentary plus the entire CWO-011 text pasted after "End of OAS-010 draft."
- `docs/constitution/OAS-011-Constitutional-Justice-Review-Dispute-Resolution-and-Due-Process.md` — ~160 lines of appended AI-review commentary pasted after "End of OAS-011 draft."

Combined with the original OAS-004/005/006 finding, **7 files across the OAS-00X series** are affected, all within `docs/constitution/**`/`docs/docs/constitution/**`. Also newly found: `docs/constitution/alc/ALC-004-The-Nature-of-Human-Flourishing.md` opens with a stray AI-chat artifact ("Absolutely." plus a copy-pasted file path) baked into the constitutional text before the real title — an eighth, related instance of the same defect class.

## D — OAS-COM-002 stub (structural defect, not a content collision)

`docs/communications/OAS-COM-002-Communications-Governance-and-Public-Engagement-Framework.md` is a 92-byte file whose entire content is literally the string of its own file path, with no line breaks and no actual document text. It is nonetheless cited as authority by three other real documents: `docs/communications/OAS-COM-003-Brand-Media-and-Publications-Framework.md`, `docs/communications/OAS-COM-004-Member-and-Crisis-Communications-Framework.md`, and `docs/communications/sops/OAS-COM-101-Communications-and-Public-Engagement-Operations-SOP.md`. This is a generation/save failure, not a content dispute — but it functions identically to a broken authority reference for the three dependent documents until regenerated.

---

# Founder decisions required — consolidated (supersedes the interim list above)

This list merges the five items from the "Founder decisions this interim map already surfaces" section (near the top of this document) with everything found by the full Phase 1 inventory pass across Fragments 1–5. Ranked roughly by severity/blast-radius, not by discovery order. Nothing here is a Phase 2 ruling — every item below is a question for the Founder to resolve, not an answer this program has chosen.

1. **Tri/multi-track constitutional supremacy** — which document (ALC-001, OAS-001 once ratified, FOUNDATION-001/003, or a fourth option) is the actual apex constitutional authority of Aureus. At least seven independent, uncoordinated supremacy/hierarchy statements exist across the corpus (ALC-001, the OAS-001-dependent series, FOUNDATION-001/003, GV-003's silent 6-level scheme, AI-016/AI-050/AI-052/AI-056's uncited claims, ENG-001's engineering-scoped scheme, and ENG-010's ALC-001-naming 8-level scheme) — see `CONSTITUTION-INVENTORY.md` § 6.1 for the full picture.
2. **OAS-001 ratification status** — formally ratify, or explicitly relabel the ~100+ downstream documents (9 constitutional articles + 12-of-13 department Charters + the Framework/SOP chains beneath them) that already treat it as settled, ratified law despite its own header stating "Not yet ratified" and two independent amendment-tracking documents confirming no CAP has ever been approved.
3. **86 confirmed same-identifier collisions** requiring individual renumbering decisions (37 from the original deterministic pass + 49 newly confirmed: 1 CAP-011 reference collision, 1 BRAND-001 extension, 4 department Charter-tier, 18 department Framework-tier, 25 department SOP-tier) — see `CONSTITUTION-INVENTORY.md` § 6.2 for the full breakdown table. This is the highest-volume single work item in the program.
4. **GV-003 and the 3 other hierarchy schemes** (AI-016, ENG-001, ENG-010) — reconcile once item 1 is resolved; GV-003 is the document whose entire purpose is to state the hierarchy, but it never names the actual Constitution document.
5. **OAS-004/005/006 canonical source** (`docs/constitution/` vs. `docs/docs/constitution/`) — both need cleanup either way (wrong filenames on one side, appended AI-review commentary on the other).
6. **SC-001 (Steward Constitution)** — two genuinely diverged drafts claim the same ID and different authority levels ("Constitutional" vs. "Supreme Steward Document").
7. **`docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md`** — contains zero risk-management content; its entire body is a mislabeled copy of AICP-001 (itself missing Chapter 19). There is currently no Risk Management Protocol document anywhere in the repository. Needs: (a) locate/author real ARM-001 content, (b) relocate the AICP-001 content to a correctly named file, (c) locate/author the missing Chapter 19.
8. **ALC-011 internal corruption** — Articles XIII–XVIII need to be authored, or the duplicated Articles VII–XII block needs to be replaced with the intended unique content.
9. **ALC-009 / ALC-013 incompleteness** — both terminate mid-series with no closing declaration; determine whether they are meant to be finished or are intentionally shorter than their siblings.
10. **AI-commentary contamination in 7 OAS files** (OAS-004/005/006/007/009/010/011) — strip the appended reviewer commentary, GitHub instructions, and next-work-order text before any canonization; also strip the "Absolutely." artifact from ALC-004.
11. **CAP-011 reference collision and CAP-019 missing reference** — CAP-REGISTER.md's "CAP-011" (Adaptive Communication) and the OAS series' (OAS-006–011) "CAP-011" (entrenched-provisions amendment) are two unrelated things sharing an ID; separately, `OAS-004`'s drafting notes cite a "CAP-019" that does not appear in CAP-REGISTER.md at all.
12. **`docs/docs/constitution/` disposition** — confirmed not a simple accidental mirror; contains a partial, non-overlapping parallel drafting track (`OAS-002` vs `ALC-002`, non-overlapping ACA numbers) that needs its own review, not just deletion.
13. **ACR-001 is a stub** (a 12-line directory-tree diagram, not an actual definitions register); ACR-002/003/004 and AFR-001, which it lists, do not exist anywhere in the repository.
14. **OAS-COM-002 stub** — regenerate real content; currently a dangling authority reference for 3 dependent documents.
15. **AEX-000** claims domain-supremacy ("the highest authority within the Experience Architecture") with no acknowledged superior at all, unlike every department Charter, which at least nominally cites something (OAS-001 or, in one case, the Stewardship Council).
16. **IC-001 "Implementation Constitution"** — self-declared "Canonical" with no ratification trail; retitle away from "Constitution," or formally ratify against a specific OAS document rather than "the OAS Series" generically.
17. **PC-001 / PC-041 / PC-053** (Production Canon series) — cross-check their foundational/amendment-procedure claims against the OAS-005-equivalent constitutional material for contradiction.
18. **AXC-000 missing** — author it, or determine which existing document (the README, or AFX-001) should fill that role for the 26 files that already cite it as governing authority.
19. **BRAND-001 missing from `docs/branding/`** — author it, or resolve the reference into the `docs/canon/branding/` family; also refresh `docs/branding/README.md`'s stale document list (currently enumerates only through BRAND-013 with mismatched titles and omits BRAND-014/015/016).
20. **AFX vs. AXC role duplication** — confirm which (if either) is the authoritative "frontend/member experience constitution" series.
21. **BR-*/BRAND-* two parallel brand-constitution trees** — reconcile or merge; BR-002↔BRAND-008, BR-003↔BRAND-006/007, BR-005↔EF-001, BR-006↔BRAND-013.
22. **OC-001 (experience) vs. MJC-002 (member-journey)** — two independently authored "Opening Ceremony Canon" documents with incompatible choreography.
23. **MJC-001 vs. MS-001** — two independently structured "Member Journey" framework trees.
24. **AICP-002 cites nonexistent AICP-001** — author it or correct the reference.
25. **PA-004/PA-005** — byte-identical content under two different IDs; needs a copy-paste-error confirmation.
26. **Founder's Office / Personal Steward documents** (FDR-001, FOA-001, EOS-001, EDP-001, FOD-001, FO-001, FEP-001, PS-001) sit entirely outside `FOUNDATION-003`'s stated Canon Hierarchy — a gap, not a conflict, but needs formal placement.
27. **AMI-001 (Master Index)** is unpopulated — prioritize once items 1–3 are resolved.
28. **CIA-001 / AQP-001 / AMI-001** — the audit's own methodological ancestors; their 9 stated deliverables should be cross-checked against what this consolidation program has actually produced.

Full supporting detail, verbatim quotes, and per-file evidence for every item above are in `CONSTITUTION-INVENTORY.md` (see cross-references inline).
