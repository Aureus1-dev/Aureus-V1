# CAP-001 — Constitutional Architecture Proposal

**Format note:** This proposal follows the required-contents structure `OAS-010, Article 2, Section 1` establishes for a Constitutional Amendment Proposal, since it is the closest thing to an already-adopted process for exactly this kind of governance decision, even though the CAP mechanism itself has not yet been formally canonized (OAS-010 remains a draft). Using its structure here is itself a small piece of evidence toward this proposal's own recommendation — see §11.

---

## 1. Designation

**CAP-001**

## 2. Title

Constitutional Architecture Proposal — Establishing the Aureus Constitutional Family, Its Authority Hierarchy, and Its Amendment Discipline

## 3. Date of submission

2026-07-21

## 4. Originating context

Authorized by Founder Decision — "CAR-001 Accepted," Decision 5 (2026-07-21): *"The next constitutional deliverable should not be a repair. It should be a Constitutional Architecture Proposal (CAP-001)."* Builds directly on `CAR-001-Constitutional-Architecture-Report.md` (Decision 1: Option B approved — a constitutional family, not a single monolithic constitution) and the companion `ALC-Values-Consolidation-Design-Proposal.md` (Decision 3).

## 5. Constitutional documents this proposal relates to

`ALC-001`, `ALC-002` through `ALC-013`, `OAS-001` (draft), `OAS-002` through `OAS-011`, `docs/governance/registry/AMI-001-Aureus-Master-Index.md`, `docs/governance/audits/CIA-001-Constitutional-Integrity-Audit.md`, `docs/canon/ai/AICP-001`/`AICP-002`, and — by the nature of a document that governs how future constitutional families are added — every constitutional document not yet written.

## 6. Current constitutional text this proposal would affect

**None, directly.** This proposal does not amend any existing Article of `ALC-001` through `ALC-013` or `OAS-001` through `OAS-011`. It establishes a new governing framework *above* and *around* the existing family — analogous to how `OAS-005` established interpretation rules without amending `OAS-001` through `OAS-004`. Per Decision 4, no constitutional restructuring, merger, or authority-chain rewrite is executed by this proposal; it is itself the artifact to be approved before any such execution begins.

## 7. Proposed framework

### 7.1 The Authority Hierarchy

Consistent with Decision 1 (Option B) and Decision 2 (OAS recognized as operative constitutional law):

1. **Tier 0 — Operative Constitutional Law.** The OAS lineage (`OAS-001` once ratified, plus `OAS-004` through `OAS-011`) governs: rights, duties, membership, governance institutions, amendment procedure, and justice. This tier is supreme for every subject it covers. No other constitutional document may create a right, duty, institution, or remedy inconsistent with this tier.
2. **Tier 1 — Foundational Orientation.** `OAS-002`/`OAS-003` (Preamble, Identity/Mission/Vision/Purpose) — interpretive, non-operative, informs how Tier 0 is read. Explicitly grants no authority of its own, per their own existing text.
3. **Tier 2 — Constitutional Values.** The consolidated values document proposed in `ALC-Values-Consolidation-Design-Proposal.md` (superseding `ALC-003`–`013`), plus `ALC-001`'s ceremonial/covenant content and `ALC-002`'s Preamble. Expressive and culture-forming rather than operative; informs interpretation of Tiers 0–1 but creates no enforceable right, duty, or institution of its own — the same non-operative posture `OAS-002`/`003` already declare for themselves, extended explicitly to this tier.
4. **Tier 3 — Domain Canons.** Everything in `docs/production-canons/`, `docs/canon/`, `docs/operations/`, `docs/technology/`, `docs/security/`, `docs/risk/`, `docs/data/`, `docs/human-resources/`, `docs/legal/`, `docs/finance/`, `docs/communications/`, and future domain-specific families. Subordinate to Tiers 0–2; may not create a right, duty, or institution inconsistent with Tier 0.
5. **Tier 4 — Repository Governance Infrastructure.** `AMI-001`, `AQP-001`, `CIA-001`, `AICP-001`/`002` — the audit/index/quality/AI-collaboration layer that keeps Tiers 0–3 honest. Operational, not constitutional in the OAS-005 sense of the word, but binding on how constitutional work is conducted (per Decision 4's own category-based framing).
6. **Tier 5 — Implementation.** `docs/implementation/IC-0XX`, `docs/architecture/ADR-0XX`, `docs/work-orders/`. Governs engineering practice; subordinate to everything above.

This resolves MDR-002/MDR-015 as follows: **OAS-001, once ratified, is the supreme document** — not `ALC-001`. `ALC-001`'s own supremacy claims (Article I §1, the Constitutional Seal) would need to be understood as describing its role *within Tier 2*, not as competing with OAS-001 for the top position. This is a genuine, material change from how `ALC-001` currently reads, and is flagged explicitly for Founder attention in §9.

### 7.2 The relationship between OAS and ALC

Not "which wins," per Decision 1 — a **division of constitutional labor**: OAS provides the enforceable legal architecture; ALC (post-consolidation) provides the values, identity, and covenant language that gives that architecture its meaning and its emotional/cultural weight. Neither is complete without the other; neither should be edited to imitate the other's register. A future engineer citing "why does Aureus require Human Review of AI-informed decisions" should look to OAS-006/OAS-011 for the enforceable rule and to ALC's consolidated values document for why that rule reflects the institution's character.

### 7.3 The place of future constitutional families

Any new constitutional-adjacent document family (e.g., a future "Member AI Steward Constitution," previously discussed and paused in this engagement pending exactly the questions this proposal now answers) must, before drafting begins:

1. Declare which Tier (0–5) it belongs to.
2. If Tier 0 (creating new rights/duties/institutions), it must be drafted as an amendment to the OAS lineage via the CAP process (§7.4), not as a freestanding document.
3. If Tier 2 (values/identity), it must be drafted as an extension of the single consolidated values document, not a tenth freestanding "virtue list" — directly preventing recurrence of the defect CAR-001 found.
4. If Tier 3 (domain canon), it must check `AMI-001`'s master index first (already a stated AI-collaboration obligation in AMI-001 itself) to confirm no existing canon already covers the subject, directly addressing the ID-collision pattern found in `docs/operations/`, `docs/technology/`, `docs/legal/`, `docs/finance/` during the Master Defect Register pass.

### 7.4 How constitutional amendments flow

Adopt `OAS-010`'s CAP lifecycle (Draft → Under Review → Approved → Canonized / Rejected / Withdrawn / Archived) as the **single amendment process for the entire constitutional family**, not only the OAS lineage narrowly. Concretely:
- A change to Tier 0 (OAS operative law) requires a CAP reviewed for entrenchment conflict per `OAS-010, Article 6`.
- A change to Tier 2 (the consolidated values document) requires a CAP but not entrenchment review, since Tier 2 is declared non-operative.
- A change to Tier 3/4/5 documents follows the lighter-weight process already implicit in how Production Canons, AI Canon, and Engineering Canon are drafted today (Founder Review status, no formal CAP required) — this proposal does not newly burden routine domain-canon work with the full CAP process, only genuine constitutional-tier changes.

### 7.5 How duplication is prevented going forward

Three concrete mechanisms, each already partially built by this session's work and formalized here:
1. **AMI-001 as mandatory pre-drafting check** — already stated in AMI-001's own text ("AI collaborators shall... search the index before recommending new documents"), now made binding by this proposal for any new constitutional-tier document specifically (not just as a general best practice).
2. **One document per constitutional subject, full stop** — the rule `docs/implementation/IC-014, Article IV` already states ("Each subject shall have one canonical source") is adopted explicitly into the constitutional tier itself, closing the gap that let ALC-003–013 happen in the first place (IC-014 existed but wasn't applied to constitutional drafting).
3. **CIA-001 as the standing audit protocol** — per Decision 2 of the earlier Constitutional Stabilization approval, CIA-001 (not a new competing framework) is the permanent audit process for detecting recurrence of this defect class, run periodically (a cadence this proposal does not itself set, deferring to CIA-001's own future population of that detail).

## 8. Reason for this proposal

CAR-001 found that Aureus's constitutional documents currently have no single, explicit statement of which document governs which subject, and that the absence of that statement is precisely what allowed both the OAS/ALC supremacy ambiguity (MDR-002) and the nine-fold ALC values duplication to occur undetected until this audit. This proposal supplies that statement.

## 9. Expected constitutional impact

- **Resolves MDR-002 and MDR-015 in principle** by naming OAS-001 (once ratified) as Tier 0/supreme, rather than leaving both lineages claiming supremacy. This is a **material change from ALC-001's current self-declared status** and must be understood as such before approval — it is not a neutral bookkeeping choice.
- **Does not resolve MDR-001 (Steward definition)** — that remains a separate, already-approved-in-principle decision (Article V's sense becomes canonical for the bare term) whose execution still sits behind the standing freeze.
- **Sets up, but does not execute,** the ALC-003–013 consolidation (Decision 3's proposal, referenced in §7.1 Tier 2, remains a separate approval).
- **Directly enables** the previously-paused Member AI Steward Constitution to resume, once this proposal and the Steward-definition decision are both approved, by giving it an explicit Tier (0 or 2, depending on scope) to be drafted into.

## 10. Risks and tradeoffs

- **Risk: declaring OAS-001 supreme before it is ratified** creates a period where the "supreme" document is itself not yet Founder-approved. Mitigation: this proposal's Tier 0 designation takes effect only upon OAS-001's ratification (resolving its nine open Founder questions); until then, the *status quo ambiguity* continues, but is now at least documented as a known, tracked gap rather than a silent one.
- **Risk: ALC-001 loses its currently-claimed supremacy.** This may be read as diminishing ALC-001's institutional weight. Mitigation: Tier 2 is explicitly framed as indispensable, not subordinate-in-the-sense-of-lesser — OAS-006 through OAS-011 have no equivalent expressive power, and this proposal's own §7.2 states neither tier is "complete" without the other.
- **Risk: a six-tier system is more complex than the two-lineage status quo.** Mitigation: the complexity already exists in practice (CAR-001 found it); this proposal makes it explicit and navigable rather than inventing new complexity.
- **Tradeoff accepted:** routine Tier 3 domain-canon work does not require the full CAP process, trading some rigor for practicality, consistent with how Production/AI/Engineering Canons already operate today.

## 11. Dependencies

- Depends on Founder resolution of OAS-001's nine open questions (N1–N9) before Tier 0 formally activates.
- Depends on Founder approval of the separate ALC-Values-Consolidation-Design-Proposal before Tier 2 consolidation executes.
- Depends on the Steward-definition decision (already approved in principle) being executed once the standing freeze is addressed.
- Does not depend on, and does not itself resolve, the original standing freeze on `docs/constitution/`, `docs/docs/constitution/`, `docs/constitutional/`, `docs/sessions/`, `docs/drafts/` — that remains a separate, still-open question this proposal does not attempt to close.

## 12. Recommendation

Approve the six-tier framework in §7.1 as the governing architecture, with Tier 0's supremacy designation contingent on OAS-001's ratification rather than immediate. Approve §7.3–7.5's anti-duplication mechanisms for immediate adoption, since they impose no cost on existing documents and only govern future drafting. Treat §7.2 (division of labor) as already effectively decided by Decision 1's approval of Option B.

## 13. Status

**Draft — Under Review.** Per Decision 5: *"No repository restructuring should occur until CAP-001 is approved."* No file has been moved, merged, or amended in producing this proposal.
