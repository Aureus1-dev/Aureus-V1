# Phase 2A — Foundation Alignment Impact Analysis

**Status:** Read-only analysis. Nothing in the corpus has been modified to produce this document. Implementation does not begin until this plan is approved.

**Founder rulings this analysis implements (approved, not proposals):**
1. `FOUNDATION-001` is the single highest governing document of Aureus. No document exists above it.
2. `FOUNDATION-002` and `FOUNDATION-003` remain Foundation documents but are not superior to `FOUNDATION-001`; they implement/explain/operationalize it and may never contradict it.
3. Every document must ultimately derive its authority from `FOUNDATION-001`. No document may claim independent supreme authority. Documents currently claiming supremacy must instead state their relationship to `FOUNDATION-001`.

---

## Headline finding: the Foundation layer was already substantively compliant

Before cataloging what needs to change, the most important finding is what *doesn't*. I read all three Foundation documents in full:

- **`FOUNDATION-001`** (`Status: Eternal`, `Authority: Highest`) already closes with: *"If any future document, product, policy, feature, process, or decision conflicts with this Foundation, this Foundation prevails. Everything else must change. Never this."* This already **is** Ruling #1, verbatim in spirit. **No change required.**
- **`FOUNDATION-002`** (`Authority: Constitutional`) already states: *"The Foundation always outranks implementation"* and defines its own completion criterion as *"every governing document... aligns with FOUNDATION-001."* This already **is** Ruling #2. Only a minor metadata clarity gap exists (see F-2 below).
- **`FOUNDATION-003`** (`Authority: Constitutional`) already places "Foundation" at Level 0 with "Authority: Highest," and its Conflict Rule already says: *"If uncertainty remains: Return to FOUNDATION-001. The Foundation is the final authority."* This already **is** Rulings #1 and #2. Its one real gap is that Level 1 ("Constitution") is defined by *topic* (Mission, Identity, Purpose, Vision, Eternal Laws, Institutional Covenant) rather than by naming an actual document — which is exactly why downstream documents got confused (see below).

**The conflict is not inside the Foundation layer. It is that roughly a dozen other documents, authored before the Foundation layer existed or without reference to it, assert their own independent supremacy and never mention `FOUNDATION-001` at all.** Fixing those dozen root documents — not rewriting the Foundation layer, and not touching the ~600 documents that already properly cite one of those roots — is the entire scope of this ruling's implementation.

---

## 1–3. Affected documents, why, and classification

Every quote below was read directly from the file at this analysis's time, not carried over from a prior summary — verifying that no document is flagged on the basis of an unverified secondhand description of what it claims.

### Tier 1 — Root claims (direct edits required, unlock everything downstream)

| Doc | Current claim (verbatim) | Conflict | Classification |
|---|---|---|---|
| **`ALC-001`** (`docs/constitution/alc/ALC-001-Aureus-Living-Constitution.md`) | Article I §2: *"This Constitution is the highest governing authority of Aureus."* | Direct conflict with Ruling #1/#3 — asserts independent supremacy | **Authority statement update.** Rewrite §2 to state ALC-001 derives its authority from, and is subordinate to, `FOUNDATION-001`. This is the single most consequential edit — ALC-001 is the most complete, most-cited constitutional document in the corpus. |
| **`OAS-001`** (`docs/drafts/OAS-001_Draft_0.95.md`) | Implicitly treated as apex of the entire OAS/department-Charter tree (~100 downstream documents cite it as "Founding Charter") | No `FOUNDATION-001` reference anywhere; functions as an independent root | **Authority statement update.** Add explicit derivation-from-`FOUNDATION-001` language. **Note:** this is independent of OAS-001's ratification status (still unresolved, see §7 — this ruling does not ratify it, it only fixes what it will say about its own authority whenever it is ratified). |
| **`FOUNDATION-003`** | Level 1 = "Constitution" defined by topic, not by document ID | Ambiguity, not contradiction — but it's the reason `GV-003`, `AI-016`, `PC-041`, and others each independently guessed at what "the Constitution" means | **Hierarchy update** (clarifying, not corrective) — see §7 for the one sub-question this doesn't resolve on its own. |
| **`FOUNDATION-002`** | `Authority: Constitutional` (no explicit `Subordinate to: FOUNDATION-001` metadata field, though the body text already says so) | None substantive — a consistency/metadata gap only | **Authority statement update**, trivial — add the explicit field for consistency with the pattern being established elsewhere. |

### Tier 2 — Independent domain-root claims (no interdependency on each other; each is a self-contained edit)

| Doc | Current claim (verbatim) | Classification |
|---|---|---|
| **`GV-003`** — Constitutional Hierarchy Canon (`docs/canon/governance/GV-003-...md`) | Own 5-level scheme, Level 1 = "Mission... the highest enduring commitment of Aureus," with **no Foundation level above it at all**. Notably, this Level 1 text is substantively near-identical to `FOUNDATION-001`'s own Purpose ("Aureus exists to faithfully steward everything entrusted to it so that people may flourish, forever") without cross-referencing it. | **Hierarchy update.** Insert `FOUNDATION-001` as the explicit apex (either a new Level 0, or identify existing Level 1 "Mission" as `FOUNDATION-001` itself). High-leverage: this document's whole purpose is stating the hierarchy, so getting this one right does a lot of the corpus's clarifying work. |
| **`AEX-000`** — Experience Constitution (`docs/architecture/experience/AEX-000...md`) | L301: *"This Constitution is the highest authority within the Experience Architecture."* L313: *"If any subordinate document conflicts with this Constitution, this Constitution prevails until formally amended."* Zero mentions of "Foundation" anywhere in the file (verified by grep). | **Authority statement update** — domain-scoped supremacy claim needs to become domain-scoped-subject-to-`FOUNDATION-001`. |
| **`AI-016`** — Agent Governance and Constitutional Compliance (`docs/canon/ai/AI-016-...md`) | L17: *"The Constitution of Aureus is the highest governing authority of the institution."* No document named; zero "Foundation" mentions. | **Authority statement update** — replace ambiguous "the Constitution... highest" framing with explicit `FOUNDATION-001` root. |
| **`ENG-010`** — Opportunity Intelligence Pipeline Constitution (`docs/canon/engineering/ENG-010-...md`) | L44/L321: *"The Aureus Living Constitution (ALC-001)... supreme authority. Nothing in this document may be read to permit what ALC-001 forbids."* No Foundation mention. **Note:** this document's own header already reads *"pending re-approval of this structural amendment"* — it is self-aware of being provisional. | **Authority statement update** — lowest risk of the batch, since the document already expects to be revisited. |
| **`PC-041`** — Constitutional Continuity Canon (`docs/production-canons/PC-041-...md`) | L67: *"The Constitution and its duly adopted amendments remain the highest governing authority of Aureus."* Unnamed "the Constitution," no Foundation reference. | **Authority statement update.** |
| **`SC-001`** (whichever copy — see §7, this ruling does not choose between the fork) | `Authority: Supreme Steward Document` | **Authority statement update**, but explicitly gated: don't edit either fork until the separate canonical-copy decision (already flagged in the Repair Plan as E6) is made — editing both copies would be wasted/conflicting work. |
| **`docs/operations/OAS-OPS-001-Operations-Charter.md`** (one of the two colliding Charter-tier copies) | L4: `Authority: Aureus Stewardship Council` — cites a governing body, not a document, unlike its sibling copy which cites OAS-001 | **Cross-reference update** — state that the Council's own authority derives from `FOUNDATION-001` (via OAS-001 or directly). Also gated behind the separate ID-collision decision for this pair (already flagged, Repair Plan §C7) — don't fix the citation on a copy that might get renumbered/retired anyway. |

### Tier 3 — Verify-then-likely-no-op

| Doc | Status | Classification |
|---|---|---|
| **`IC-001`** — Implementation Constitution | Already properly subordinates itself ("subordinate to the Aureus constitutional documents (OAS Series) and the Product Constitution") — does **not** claim independent supremacy. Once `OAS-001` (Tier 1) is fixed, this document's citation chain resolves to `FOUNDATION-001` transitively. | **Cross-reference update, low priority** — resolves itself once Tier 1 lands. One open item: I could not locate a document matching "Product Constitution" anywhere in the corpus during this pass — flagged in §7, needs verification before deciding whether this is a broken reference or a naming variant of something that exists. |
| **`AI-050`, `AI-052`, `AI-056`** | Flagged by the Phase 1 inventory as making uncited hierarchy-adjacent claims alongside AI-016. **Not independently re-verified with fresh quotes in this pass** — I'm not willing to assert exact wording I haven't personally read this session. | **Verification needed before classification.** Recommend a quick direct read of these three before drafting replacement text, rather than assuming they match AI-016's pattern. |
| **`PC-001`** (Identity Canon), **`PC-053`** (Constitutional Amendment and Evolution Canon) | Flagged by Phase 1 as making self-referential foundational/procedural claims. Not re-verified with fresh quotes this pass (only PC-041 was directly read). | **Verification needed before classification.** |
| **Department Charter tier** (12 of 13 files citing `OAS-001 — Founding Charter`) and everything beneath them (Framework/SOP tiers, ~200 files) | Already correctly subordinate to `OAS-001` | **No change required.** This is the biggest minimal-footprint finding: fixing the two Tier-1 roots (`ALC-001`, `OAS-001`) fixes this entire ~200-file tree transitively. Nothing here needs individual editing. |
| **`OAS-003`–`OAS-011`** and **`ALC-002`–`ALC-013`** (the bodies of both constitutional series) | Already cite their respective root (`ALC-001` or `OAS-001`) as superior, not independently supreme | **No change required** — same transitive-inheritance logic. |
| **`docs/docs/constitution/`** copies of `OAS-004/005/006` | Duplicate-location copies of already-covered Tier-1-adjacent content | **No change required for this ruling** specifically (separate, already-tracked issue — Repair Plan E5/E12). |

**No document identified in this analysis requires a structural rewrite.** Every edit above is a targeted authority-statement paragraph or metadata field, not a rewrite of substantive rights, principles, or procedures. This is consistent with the ruling's own instruction to make the fewest necessary changes.

---

## 4. Dependency graph / safest execution order

```
Tier 0 (verify only — no edit)
  FOUNDATION-001  ─────────────────────────────────────────────┐
                                                                  │
Tier 1 (root edits — do first, everything else depends on these)│
  FOUNDATION-002 (trivial)                                       │
  FOUNDATION-003 (clarify Level 1 reference)                     │
  ALC-001 (rewrite Article I §2)          ◄──── highest leverage─┤
  OAS-001 draft (add derivation clause)   ◄──── highest leverage─┘
        │
        ├─── unlocks (no edit needed, transitive) ──► OAS-003..011, ALC-002..013,
        │                                              all 12 compliant department
        │                                              Charters, all Framework/SOP
        │                                              tiers beneath them (~200 files)
        │
Tier 2 (independent domain roots — parallel, no ordering dependency on each other,
        but should follow Tier 1 so they can correctly cite the now-updated ALC-001/OAS-001)
  GV-003 (highest leverage in this tier — it's the hierarchy document itself)
  AEX-000
  AI-016
  ENG-010
  PC-041
  SC-001            ◄── gated on separate fork-resolution decision (E6)
  OAS-OPS-001 (Operations-Charter.md copy)  ◄── gated on separate ID-collision decision

Tier 3 (verify, then likely no-op)
  IC-001 (verify "Product Constitution" reference)
  AI-050 / AI-052 / AI-056 (verify wording)
  PC-001 / PC-053 (verify wording)
```

**Recommended execution order:** `FOUNDATION-002` → `FOUNDATION-003` → `ALC-001` → `OAS-001` draft → (Tier 2, any order) → verify Tier 3 → re-run the corpus-wide supremacy-claim grep sweep to confirm nothing was missed.

---

## 5. Smallest possible implementation plan

**9 direct edits, not ~600.** The entire ~200-file department Charter/Framework/SOP tree and the ~20-file OAS/ALC document bodies need **zero** direct changes — they already cite a root that Tier 1 is fixing. The full edit list:

1. `FOUNDATION-002` — add explicit `Subordinate to: FOUNDATION-001` metadata field (trivial).
2. `FOUNDATION-003` — clarify Level 1 (see open question in §7 — the exact wording depends on that answer).
3. `ALC-001` — rewrite Article I §2.
4. `OAS-001` draft — add derivation clause.
5. `GV-003` — insert Foundation apex above/into its existing Level 1.
6. `AEX-000` — add subordination clause.
7. `AI-016` — replace ambiguous "the Constitution" framing.
8. `ENG-010` — replace "ALC-001... supreme authority" with a FOUNDATION-001-rooted chain.
9. `PC-041` — replace ambiguous "the Constitution" framing.

Plus 2 gated edits (SC-001, OAS-OPS-001 copy) that should wait for their separate, already-flagged fork/collision decisions rather than being done now and possibly redone. Plus 3 verify-first items (IC-001's "Product Constitution" reference, AI-050/052/056, PC-001/053) that may add 0–3 more edits once actually read.

**Total realistic scope: 9–15 files touched, out of 670 in the corpus.**

---

## 6. Repository risk estimate

**Overall: LOW.**

- Every identified edit is a paragraph or metadata-field replacement inside an "Authority" / hierarchy-statement section — no rights, protections, procedures, or substantive governing content are touched anywhere in this plan.
- No file is moved, renamed, deleted, or renumbered by this plan.
- The largest share of the corpus (department Charters and everything beneath them, ~200+ files) requires zero direct touch, which sharply limits blast radius and review burden.
- The main residual risk is **coordination, not content**: 9 edits across 9 files should land as one reviewable batch (or a small number of logically-grouped commits) so a reviewer can confirm the same rule was applied consistently, rather than as 9 unrelated-looking diffs.
- Secondary risk: the Tier 3 "verify first" items could turn up wording that doesn't fit the Authority-statement-update pattern cleanly (e.g., if `AI-050` turns out to make a *structural* rather than a *statement-level* claim) — flagged now so it doesn't surprise the implementation pass.

---

## 7. Still requires an explicit Founder decision

This ruling answers "what is supreme." It does not answer everything downstream of that:

1. **What, if anything, occupies `FOUNDATION-003`'s "Level 1 — Constitution" now?** Is it `ALC-001`? `OAS-001` (once ratified)? Both, coexisting as differently-scoped subordinate constitutions? Or does `FOUNDATION-001` itself fully satisfy "Level 1" and the separate "Constitution" terminology should be retired/relabeled? The exact replacement wording for `FOUNDATION-003` and `GV-003` depends on this answer — I have not guessed at it.
2. **`OAS-001` ratification status** (already flagged as Repair Plan E2) — unaffected by this ruling. This plan only fixes what OAS-001 *will say* about its own authority; it does not ratify it.
3. **The `SC-001` fork** (E6) and the **`OAS-OPS-001` / other 86 ID collisions** (E3) — this ruling doesn't resolve which copy survives; the two gated edits above wait on those separate decisions.
4. **Does "Product Constitution" (cited by `IC-001`) exist anywhere?** Not located during this pass — needs a direct check before deciding whether it's a broken reference (Category D) or something real I haven't found yet.
5. **`AI-050`, `AI-052`, `AI-056`, `PC-001`, `PC-053`** — need direct verification of their exact current wording before final classification; carried forward from Phase 1 secondhand, not re-confirmed with fresh quotes this pass.

---

## Awaiting your approval

No document has been modified. On approval, implementation will proceed in the tiered order above, as a small number of reviewable commits on `docs/repository-consolidation`, each showing only the authority-statement change with before/after quotes — the same verification discipline used in Phase 1.5A.
