# CAP-015 Closure Gate and Founder Walkthrough

**Prepared:** 2026-08-13  
**Current state:** Closure packet prepared; canonization gates remain open

## 1. Definition of done

CAP-015 constitutional closure is complete only when all of the following are true:

1. The four independent reviews required by CAP-015 Article 31 are preserved with responses and dispositions.
2. The OAS-010 constitutional conflict review is completed by a constitutionally valid reviewer and recorded.
3. Any required CAP revisions are made transparently, with previous versions preserved.
4. The Canonizing Authority approves the final identified text at an exact commit SHA.
5. The approved proposal is entered in the permanent Constitutional Record; approval alone is not enough.
6. OAS-012 is extracted into its canonical home without substantive drift from the approved CAP.
7. CAP-015 is marked Canonized, with effective date and record-entry cross-reference.
8. CRR-001-001, CRR-001-002, CRR-001-003, CRR-001-004 and CRR-001-006 are implemented and marked Resolved with evidence.
9. A final Certification of Constitutional State is recorded only after those CRR items are resolved.
10. Link, identifier, duplicate-path and constitutional-integrity checks pass at the exact release SHA.

## 2. Gate ledger

| Gate | Owner | Evidence | State |
|---|---|---|---|
| Internal inventory and proposed dispositions | Steward + governed tooling | Disposition matrix | READY FOR REVIEW |
| Practitioner/lived-experience review | Independent human reviewer | Findings, response, disposition | OPEN |
| Qualified legal-counsel review | Qualified counsel | Findings, jurisdiction/qualification, response, disposition | OPEN |
| Independent security/safety review | Independent reviewer | Threat/failure analysis, response, disposition | OPEN |
| Independent critic review | Independent critic | Unrestricted critique, response, disposition | OPEN |
| OAS-010 conflict determination | Constitutionally valid reviewer/Tribunal | Signed or otherwise attributable determination | OPEN |
| Final text reconciliation | Steward + governed tooling | Versioned CAP and exact diff | BLOCKED BY REVIEWS |
| Canonizing Authority decision | Founder during the founding period unless validly changed | Exact SHA approval | BLOCKED |
| Constitutional Record entry | Office of Constitutional Record or lawfully recorded founding-period action | Permanent record entry | BLOCKED |
| OAS-012 extraction and register updates | Repository steward | Integrity comparison and cross-references | BLOCKED |
| CRR implementation and certification | Repository steward + approving authority | Resolved entries and certification record | BLOCKED |

## 3. Proposed execution sequence

### Phase A — Review packet

- Approve or revise the proposed corpus dispositions.
- Freeze a review SHA containing CAP-015, its conformance matrix and this closure packet.
- Give the same review packet to all required reviewers.

### Phase B — Adversarial review

- Preserve every finding, including disagreement and recommendations Aureus rejects.
- For every finding record: accept, accept with modification, defer with owner/date, or reject with rationale.
- Re-run the conflict analysis after material amendments.

### Phase C — Canonization

- Present one final CAP-015 text and exact SHA to the Canonizing Authority.
- Record the decision and effective date in Constitutional Record Entry 004.
- Create canonical OAS-012 from the approved text and update the CAP register and cross-reference map.

### Phase D — Corpus closure

- Implement the five proposed CRR rulings using moves and provenance notices that preserve history.
- Run integrity, links, labels, duplicate-path, build, test and Docker checks.
- Record each CRR item as Resolved only when its evidence exists.
- Record Certification of Constitutional State as Entry 005 only after every listed CRR gate is closed.

## 4. Founder walkthrough agenda

The walkthrough should be decision-focused and use the exact review SHA.

1. **Purpose:** Does CAP-015 express the intended institutional restraints and counterpower?
2. **Conflicts:** Review every conditional or disputed construction in the conflict docket.
3. **Corpus:** Approve, revise or reject each KEEP / REPAIR / ARCHIVE / DUPLICATE disposition.
4. **Adversarial findings:** Examine what each independent reviewer found and how Aureus responded.
5. **Reserved exclusions:** Confirm that founding-period transition, veto, compensation, ownership, credentials/property and succession remain excluded and non-operative.
6. **Exact text:** Review the final diff and identify the exact commit SHA.
7. **Decision:** Approve, reject or return for revision. Do not use an ambiguous “looks good” as canonization approval.
8. **Record:** Confirm Constitutional Record entry, effective date, OAS-012 integrity and all CRR evidence before certification.

## 5. Approval language for the final step

Use only after every open gate above is satisfied:

> I have reviewed CAP-015, the preserved independent findings and responses, the constitutional conflict determination, and the corpus disposition record. I approve the final CAP-015 text at commit `[FULL SHA]` for canonization as OAS-012, authorize Constitutional Record Entry 004 with effective date `[DATE]`, and authorize the listed CRR repairs and archival moves. This approval does not enact any Founder-reserved exclusion identified in CAP-015 Article 36.

Certification of Constitutional State requires a separate confirmation after implementation evidence is verified.

