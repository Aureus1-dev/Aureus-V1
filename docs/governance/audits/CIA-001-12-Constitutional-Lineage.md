# CIA-001 — Constitutional Lineage

**Parent protocol:** CIA-001 — Constitutional Integrity Audit
**Status:** Draft evidence, in progress
**Date:** 2026-07-21
**Companion document:** `CIA-001-02-Authority-Matrix.md` (which family sits above which); this document traces how each document arrived at its current form — creation order, supersession, and where lineage is broken or undeclared.

---

## 1. Purpose

Per AMI-001's "Supersession Rules" ("Documents shall never silently disappear... the replacement shall be identified; the reason shall be recorded; historical references shall be preserved"), this document traces the actual creation/edit history of the core constitutional families using `git log`, so that lineage is evidence-backed rather than assumed from filenames.

## 2. ALC family — creation order (from git history)

All of `docs/constitution/ALC-001` through `ALC-002`, and `docs/constitution/alc/ALC-003` through `ALC-013`, were created in a contiguous sequence prior to this session's audit window. Within that family:

- `ALC-001` and `ALC-002` sit directly under `docs/constitution/`.
- `ALC-003`–`ALC-013` sit under `docs/constitution/alc/` — a sub-directory, not a flat continuation. This split itself is undeclared: no document explains why 001–002 are flat and 003–013 are nested.
- `docs/docs/constitution/OAS-002-Preamble-to-the-Constitution.md` was **deleted** in commit `cb16164` (per commit message: "Delete OAS-002-Preamble-to-the-Constitution.md") at the same point `docs/constitution/ALC-002-Preamble-to-the-Constitution.md` was created (`1468126`). This is the one clean example of proper supersession in the whole corpus: an old document was deleted and a new one created in its place, both events visible in git history. However, no record inside ALC-002 itself states "supersedes OAS-002-Preamble" — the lineage is only visible via git archaeology, not from reading the document.
- `docs/constitution/registers/ACR-001-Constitutional-Definitions-Register.md` was created in this same sequence (`f0dde5e`) but, per the earlier Governance Recovery Report, is a 12-line directory-tree stub, not an actual register — its lineage claim (implying `ACR-002`–`004` and `AFR-001` exist as siblings) has never been fulfilled.

## 3. OAS family — lineage is genuinely unclear

- `docs/drafts/OAS-001_Draft_0.95.md` is explicitly "Draft 0.95... integrating canonical institutional philosophy" — implying an OAS-001 Draft 0.9 existed before it. No Draft 0.9 exists anywhere in the repository (confirmed by the earlier Governance Recovery Report's search). Its own lineage is already broken at the first link.
- `OAS-002` exists in two places with different content lineage: `docs/docs/constitution/OAS-002-Preamble.md` (an orphan — no canonical counterpart) is a *different* document from the now-deleted `docs/docs/constitution/OAS-002-Preamble-to-the-Constitution.md` mentioned above (note the different title: "Preamble" vs. "Preamble to the Constitution"). It is not yet established whether these were ever the same document at different revisions, or always two unrelated drafts sharing a number.
- `OAS-004`, `OAS-005`, `OAS-006` (canonical directory): each file's actual body content doesn't match its filename's topic (see Authority Matrix and the prior Governance Recovery Report §4). Their lineage cannot be traced because it isn't clear which "version" is the mistake — whether the filename was written first and the wrong content pasted in, or the content is right and the filename is wrong.

## 4. AICP family — lineage now partially recovered this session

- `AICP-002-Constitutional-Stewardship-Audit-Protocol.md` was created (`52fa230`, 2026-07-21) referencing "AICP-001" as an existing prerequisite document.
- At the time `AICP-002` was created, no file anywhere in the repository was named or discoverable as `AICP-001`. The actual AICP-001 content existed, but under the filename `docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md` (created earlier, `e0a44e2`, 2026-07-21, same day) — a pure identity/location mismatch, not a content problem (verified: zero occurrences of "Risk Management" or "ARM-001" anywhere in that file's 3,499 lines; the file opens "AICP-001 / Aureus AI Collaboration Protocol" and closes cleanly).
- This was corrected in this session (commit `2f12a9c`, per Founder's pre-approved "Immediate Exception"): renamed via `git mv` to `docs/canon/ai/AICP-001-Aureus-AI-Collaboration-Protocol.md`, preserving full history (Git recognized 100% content similarity). Repair record: `docs/governance/repairs/MOVE-001-AICP-001-identity-correction.md`.
- **Open lineage question:** why was `AICP-002` created (and correctly assuming AICP-001 existed) on the same day as `AICP-001`'s content, but under a completely unrelated filename/topic ("Risk Management")? This suggests either (a) a filename was chosen from a different planned document and the wrong content was pasted in, or (b) two documents were being drafted in parallel and got cross-labeled. Insufficient evidence to determine which; this is a genuine open question, not resolved by this audit.

## 5. Governance-infrastructure family (AMI-001, AQP-001, CIA-001) — clean, self-consistent lineage

All three were created within the same 2026-07-20–21 window, each declaring itself "Living Draft" or "Draft, Founder Review Required," none claiming to supersede anything, none containing internal contradictions found so far. This is the **only family in the entire audited corpus with zero lineage defects found** — likely because it is also the newest and has not yet accumulated the multi-session drift visible elsewhere.

## 6. Member Journey Canon family — lineage overlap with an existing document, undeclared

- `docs/canon/experience/OC-001-opening-ceremony-canon.md` was created (`faf947f`), then updated once (`a3557c9`, "Update OC-001-opening-ceremony-canon.md").
- Immediately afterward, the full `MJC-001`–`007` family was created, including `MJC-002-opening-ceremony-canon.md` — **the same title, "Opening Ceremony Canon," as OC-001**, covering closely overlapping ground (both define a ceremony sequence, the Member's Mark, motion/light/audio principles, and the "How can we help?" transition into conversation).
- Neither document references the other. `MJC-002` declares `Parent Authority: MJC-001`; `OC-001` declares `Authority: Product Canon` with no stated parent and no acknowledgment that `MJC-002` exists.
- **Reading the git sequence, the most likely explanation is that `OC-001` was an initial, standalone draft that was then absorbed/superseded by the more structurally complete `MJC-001`–`007` family** (MJC-001 explicitly organizes the whole member journey into phases, of which "Welcome"/Opening Ceremony is Phase One, with MJC-002 as its dedicated canon). But no document says this — this is this audit's inference from sequence and content overlap, not a documented fact, and is flagged accordingly in the Duplicate Identifier Register as a finding requiring a Founder decision (keep both as intentionally layered documents, or formally supersede OC-001).

## 7. Cross-cutting observation

Across every family audited so far, **only one supersession event (OAS-002-old → ALC-002) is visible in git history, and even that one is not documented inside the surviving document.** AMI-001's own "Supersession Rules" — written after all of this history already existed — set a standard ("the replacement shall be identified; the reason shall be recorded") that no existing document in the repository actually meets yet, including the brand-new governance-infrastructure family itself (AMI-001 does not yet document its own relationship to `docs/constitution/registers/ACR-001`, which is a similar "master register" concept created earlier and never fulfilled).

## 8. Pending

This lineage trace will be extended once the four in-flight domain-inventory passes return, particularly the operations/technology/legal/finance domains, which per PD-000 contain "the identical pattern" of duplication/lineage confusion found in the constitutional family.
