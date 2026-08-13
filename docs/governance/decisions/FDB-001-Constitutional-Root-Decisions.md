# FDB-001 — Founder Decision Brief: Constitutional Root Decisions

**Scope:** MDR-002 (constitutional supremacy), MDR-015 (OAS-001 dependency), MDR-001 (Steward definition) — the three root questions identified in `CIA-001-10-Dependency-Graph.md` as blocking most downstream repair tiers.
**Status:** Analysis only. No repository file has been modified in preparing this brief.
**Date:** 2026-07-21

---

## How these three questions relate

They are not three independent problems — they're one problem viewed from three angles, which is why resolving them together (in the order below) is more efficient than resolving them one at a time:

1. **MDR-002** asks: which document is actually supreme?
2. **MDR-015** asks: how can dozens of domain canons rest on OAS-001 as their authority when OAS-001 is unratified? — this is really a special case of MDR-002 (it's what happens when the supremacy question goes unanswered: everything downstream cites a draft).
3. **MDR-001** asks: what does "Steward" mean? — this can only be answered authoritatively once you know which document's Definitions section actually governs (MDR-002), though as the evidence below shows, the practical answer is narrower and less contested than it first appeared.

Resolving MDR-002 substantially resolves MDR-015 as a mechanical consequence. MDR-001 has its own independent evidence but benefits from being decided in the same sitting.

---

## MDR-002 — Constitutional Supremacy

### Repository evidence

Two documents both claim supremacy, and neither has actually been ratified:

- **`docs/constitution/ALC-001-Aureus-Living-Constitution.md`** declares itself supreme twice, unconditionally: Article I §1 — *"The Aureus Living Constitution is the supreme governing authority of Aureus"* — and again at the Constitutional Seal — *"This Living Constitution is hereby established as the supreme governing authority of Aureus... Nothing within Aureus shall possess constitutional authority independent of this Constitution."* Its own header status, however, reads: *"Founding Draft for Founder Review... Pre-Activation Living Draft"* — i.e., **ALC-001 has not itself been Founder-approved.**
- **`docs/drafts/OAS-001_Draft_0.95.md`** is referred to as *"the Founding Charter... the supreme governing instrument of the System"* by ten downstream documents (`OAS-002` through `OAS-011`), which cite its pinpoint articles (e.g. "OAS-001, Article VII, Section 3") as settled, entrenched law. But OAS-001's own header reads: *"Status: Draft 0.95 ... Not yet ratified,"* with nine explicitly open Founder questions (N1–N9), three of which (N2 — membership definition, N4 — Founder-authority sunset, N6 — entrenchment scope) the draft itself flags as the most consequential and unresolved.
- **`docs/constitution/alc/ALC-003`, `ALC-004`, `ALC-005`** each state their authority "derives from the Founding Charter" — never naming it by document number, but the only candidate anywhere in the repository answering to "Founding Charter" is OAS-001.

So: both candidate "supreme" documents are self-admittedly unratified drafts, and each has an entire supporting series built underneath it as though it *were* ratified — ALC-002 through ALC-013 (12 documents) under ALC-001; OAS-002 through OAS-011 plus the OAS-ACA series under OAS-001.

### Documents affected

- Directly: `ALC-001`, `ALC-002`–`013` (13 files), `OAS-001` (draft), `OAS-002`–`011` (10 files), `OAS-ACA-0XX` (4+ files).
- Indirectly (via MDR-015): every charter-level document across `docs/operations/`, `docs/technology/`, `docs/security/`, `docs/risk/`, `docs/data/`, `docs/human-resources/`, `docs/legal/`, `docs/finance/`, `docs/communications/` that cites `Authority: OAS-001 — Founding Charter` — approximately 40 files.

### Options, risks, and recommendation

**Option A — Designate ALC-001 as supreme; treat the OAS-001/OAS-002–011 lineage as a historical predecessor draft, archived (not deleted).**
- *Risk:* The OAS-series contains substantial, independently-drafted content on Rights & Human Dignity, Duties, Membership, Governance & Distribution of Authority, Amendment Process, and Justice/Due Process. Some of this may not have an equivalent in ALC-001 and could be lost from active governance if simply archived without review.
- *Mitigating evidence:* ALC-001 already has its own Article X ("Justice, Review, and Due Process") and other Articles covering overlapping ground (Human Dignity is Article III per the Article list found during this audit), suggesting real duplication of *effort*, not necessarily duplication of *gap* — but this audit has not yet done a line-by-line coverage comparison between the two series, so this is not a certainty.

**Option B — Ratify OAS-001 (resolving its nine open Founder questions) and designate it supreme; treat ALC-001/ALC-002–013 as the historical predecessor.**
- *Risk:* OAS-001 is a much shorter, less structurally complete document (213 lines) than ALC-001 (2,059 lines post-dedup), and explicitly has three flagged unresolved structural questions that would need the Founder's direct attention before ratification could even begin. ALC-001's extensive covenant/office/ceremonial framework (the Stewardship Covenant, the First Steward office, the closing benedictions) has no counterpart in OAS-001 as currently drafted and would need to be either ported over or deliberately dropped.

**Option C — Commission a single reconciled document combining both, ratified fresh.**
- *Risk:* Highest effort and longest timeline of the three; delays every downstream repair tier that depends on this decision. Most architecturally "correct" if done well, since it avoids arbitrarily crowning one incomplete draft over another comparably incomplete one.

**Option D — Leave both in parallel, unresolved, indefinitely.**
- *Risk:* This is the status quo, and it is what produced MDR-015 (every domain canon resting on an unratified draft) in the first place. Not a real option — including it only to be explicit that "do nothing" is a choice with a cost, not a neutral default.

### Recommendation: Option A

**Why this preserves repository integrity:** ALC-001 is the more structurally developed of the two candidate documents, is the document that already carries the institution's flagship name ("The Aureus Living Constitution"), and — critically — is the document every other completed governance layer in this audit (Production Canons, AI Canon, Engineering Canon, Product Architecture, Frontend Canon/Blueprints) was built to sit *under* conceptually, even though none of them cite it by number. Making OAS-001 supreme instead would mean re-founding that entire relationship on a shorter, less-resolved document with three explicitly open structural questions the Founder has not yet answered. Recommending Option A does not mean discarding the OAS-series' substance — before archiving it, its unique provisions (Rights/Dignity, Duties, Membership, Amendment Process, Justice/Due Process) should get a line-by-line comparison against ALC-001's existing Articles, and any genuinely uncovered ground should be proposed as new ALC-001 Articles or amendments through the normal amendment process — preserving the drafting work rather than losing it.

**Estimated downstream impact:** Once decided, repointing the ~40 domain-canon Authority citations from "OAS-001" to "ALC-001" is mechanical (Tier 0/R-001 in the Remediation Plan already scoped this at 1–2 hours of find/replace, each independently verifiable). The larger, non-mechanical piece is the OAS-series content-coverage review, which should be scoped as its own follow-on item rather than rushed.

---

## MDR-015 — OAS-001 Dependency

### Repository evidence

Confirmed independently by all four domain-inventory passes this session: every charter-level document in `docs/constitution/`, `docs/operations/`, `docs/technology/`, `docs/security/`, `docs/risk/`, `docs/data/`, `docs/human-resources/`, `docs/legal/`, `docs/finance/`, and `docs/communications/` cites `Authority: OAS-001 — Founding Charter`. The only file answering to that name is the explicitly unratified draft. This is not a per-directory defect — it is one authority citation, copied into a shared template, then used to generate approximately 40 charter documents across 9 domains before OAS-001 was ever ratified.

### Documents affected

The ~40 charter documents listed under MDR-002 above, plus (transitively) every SOP/procedure document beneath each of those charters, since each SOP's own Authority chain ultimately traces back to the same citation.

### Options, risks, and recommendation

This question is downstream of MDR-002, not independent of it:

- **If MDR-002 resolves to Option A (ALC-001 supreme):** the fix is mechanical — repoint all ~40 citations to ALC-001. Risk: low, purely a find/replace once the supremacy question is settled, verifiable by re-grepping for "OAS-001" afterward and confirming no charter still points at the draft.
- **If MDR-002 resolves to Option B (OAS-001 ratified):** the fix is to complete OAS-001's ratification (answering N1–N9) first, then the existing citations become correct without needing to change — but this means the ~40 domain canons remain unratified-in-practice until that ratification work is done, which is a larger and slower dependency than Option A's mechanical fix.
- **If MDR-002 resolves to Option C (new reconciled document):** the fix waits on that document's completion — the slowest path.

### Recommendation

Consistent with the MDR-002 recommendation: resolve via Option A's mechanical repointing. **Why this preserves integrity:** it removes the "resting on an unratified draft" problem for the entire domain-canon corpus in one coordinated pass, rather than leaving ~40 documents in limbo while a slower ratification or reconciliation process plays out.

**Estimated downstream impact:** Same as MDR-002's — this is effectively the same repair, executed once. No additional distinct engineering effort beyond what MDR-002's resolution already requires.

---

## MDR-001 — Steward Definition

### Repository evidence

The picture here is narrower and more resolvable than the original framing suggested. `ALC-001`'s own Appendix A actually defines three *adjacent, non-colliding* terms cleanly:

- **§6, "Human Steward":** *"A Human Steward is a person who provides guidance, care, judgment, service, leadership, or constitutional responsibility on behalf of Aureus. Human Stewards remain personally accountable for their stewardship."*
- **§7, "AI Steward":** *"An AI Steward is an artificial intelligence system authorized to assist members and Human Stewards... An AI Steward possesses no independent constitutional authority."*

These two match, term-for-term, the operational definitions already in active use everywhere else in the repository — `docs/production-canons/PC-012-Personal-AI-Steward-Canon.md` (*"A Personal AI Steward is an artificial intelligence entrusted with faithfully assisting a Member..."*), `PC-013-Human-Steward-Canon.md` (*"A Human Steward is a person entrusted by Aureus to faithfully serve Members..."*), all 58 files of the AI Canon, the frontend canon (`AFX-002`, `FPB-004`, `FPB-013`), and the new Member Journey Canon (`MJC-001`–`007`, which uses "AI Steward" and "Human Steward" dozens of times, always consistently). **This part of "Steward" is not actually contested — it is the single most consistently-defined term in the entire repository.**

The real contradiction is narrower: it's specifically the **bare word "Steward," used without a "Human"/"AI"/"First" qualifier**, which carries two incompatible meanings within ALC-001 itself:

- **§5, "Steward" (Definitions):** *"A Steward is any person entrusted with responsibility on behalf of Aureus. Every steward exercises delegated authority under this Constitution and remains accountable for its faithful use."* — a narrow, delegated-authority sense.
- **Article V, "The Stewardship Covenant":** *"The Stewardship Covenant is the voluntary mutual commitment between Aureus and a person who chooses to become a Steward... Participation in the Covenant shall always remain voluntary"* — a universal, opt-in sense open to *any* Member, unrelated to delegated authority. Members "begin as an Apprentice Steward" simply by joining the Covenant.
- **Article VI, "The First Steward":** *"The Founder serves as the First Steward of Aureus"* — a specific governance office/title, distinct from both of the above.

Notably, ALC-001's own closing ceremonial language (*"every steward is encouraged to ask continually: Are we helping people flourish?..."*) reads as addressed broadly to everyone connected to the institution — consistent with Article V's expansive, opt-in sense, not with §5's narrow delegated-authority sense. This suggests Article V's meaning is the one doing the real work throughout most of the document, and §5's Appendix definition is the outlier that doesn't match how the term is actually used elsewhere in the same file.

### Documents affected

Directly: `ALC-001` (Definitions §5, Article V, Article VI). No other document in the repository was found to use the bare word "Steward" (without a Human/AI/First qualifier) as a load-bearing defined term — this appears to be entirely self-contained within ALC-001.

### Options, risks, and recommendation

**Option A — Keep §6/§7 (Human Steward, AI Steward) exactly as-is (no change needed); make Article V's "Steward" (voluntary Member-covenant identity) the primary meaning of the bare term; rewrite §5 to either explicitly cross-reference Article V, or rename the delegated-authority concept to something else (e.g. fold it into "Human Steward"/"AI Steward"/"First Steward," which already cover institutional-authority roles).**
- *Risk:* Low — no code or product terminology was found anywhere in this audit relying on the bare word "Steward" alone (only the qualified forms — "Human Steward," "AI Steward," routes like `/steward`, services like `StewardshipRelationship` — which all already align with the operational sense and are untouched by this change).
- *Why recommended:* This is the option that changes the least. It leaves the two terms everyone already depends on (Human Steward, AI Steward) completely untouched, and resolves the actual contradiction (bare "Steward") in the direction the document's own ceremonial language already leans.

**Option B — Keep §5's delegated-authority sense as primary; rewrite Article V to use a different term for the voluntary Member-identity concept (e.g. "Covenant Member").**
- *Risk:* Higher — Article V is a substantial, developed Article (the Stewardship Covenant, the Apprentice-Steward progression) that would need more extensive rewriting than §5's single paragraph, for no clear gain, since nothing downstream currently depends on the narrow §5 sense either.

**Option C — Leave all three senses as-is and explicitly declare context disambiguates them (no rename, just clarifying language).**
- *Risk:* Medium — doesn't actually resolve the contradiction, just documents that it exists; a future Member/Personal AI Steward Constitution would still need to pick a lane when citing "Steward" from ALC-001, so this defers rather than resolves the blocking problem.

### Recommendation: Option A

**Why this preserves repository integrity:** it aligns the constitutional definition with how "Steward" is actually used everywhere else in the 500+ documents this audit reviewed, requires the least rewriting, and doesn't disturb the two terms (Human Steward, AI Steward) that are both correctly defined already and load-bearing in product code and canon.

**Estimated downstream impact:** Small and contained to `ALC-001` itself — a rewrite of Definitions §5 and, if the Founder wants full internal consistency, a one-line cross-reference added to Article V. This directly unblocks drafting a Member/Personal AI Steward Constitution, since "Steward" would then have one clear, repository-consistent meaning to build on. This repair sits in the frozen path (`docs/constitution/`) and would need the same freeze consideration as the rest of Tier 2.

---

## Summary for approval

| Question | Recommendation | Depends on |
|---|---|---|
| MDR-002 (supremacy) | Option A — ALC-001 supreme; OAS lineage archived as historical predecessor, with a content-coverage review before archiving | Independent (root decision) |
| MDR-015 (OAS-001 dependency) | Mechanical repointing of ~40 Authority citations, once MDR-002 is decided | MDR-002 |
| MDR-001 (Steward definition) | Option A — Human Steward/AI Steward unchanged; Article V's sense becomes primary for bare "Steward"; §5 rewritten or cross-referenced accordingly | Independent of MDR-002/015, but naturally resolved alongside them |

No repository file has been modified in producing this brief. Awaiting your decision on each of the three items before any Tier 2 repairs (or the mechanical MDR-015 repointing) begin.
