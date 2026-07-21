AQP-001 — Aureus Quality Protocol

Status: Living Draft

Authority: Repository Governance

Purpose

The Aureus Quality Protocol establishes the minimum quality standards that every document, feature, workflow, service, deployment, and institutional process must satisfy before it is considered complete.

Quality is not measured by speed alone. It is measured by correctness, consistency, usability, security, maintainability, and alignment with the mission of Aureus.

---

Core Principles

Every deliverable shall strive to be:

- Correct
- Complete
- Secure
- Maintainable
- Understandable
- Accessible
- Consistent
- Traceable
- Testable
- Respectful of Member trust

No work is considered complete until it satisfies the applicable quality requirements.

---

Universal Quality Gates

Every change shall pass the following gates before completion:

1. Constitutional Alignment
   
   - Does the work align with governing authority?
   - Does it conflict with any higher-authority document?

2. Repository Integrity
   
   - Correct location
   - Correct numbering
   - Correct naming
   - Correct references

3. Documentation
   
   - Required documentation updated
   - Cross-references verified
   - Related documents reviewed

4. Engineering
   
   - Builds successfully
   - No known critical defects introduced
   - Code reviewed
   - Configuration verified

5. Testing
   
   - Relevant tests pass
   - Manual validation completed where appropriate
   - Regression risks considered

6. User Experience
   
   - Clear
   - Accessible
   - Understandable
   - Consistent with Aureus design principles

7. Security
   
   - Secrets protected
   - Authorization verified
   - Input validation reviewed
   - Privacy respected

8. Operational Readiness
   
   - Monitoring considered
   - Logging appropriate
   - Recovery path understood
   - Documentation sufficient for future maintenance

---

Evidence Standard

Completion shall be supported by evidence whenever practical.

Evidence may include:

- Repository inspection
- Test results
- Build verification
- Documentation updates
- Audit findings
- Review notes

Claims without supporting evidence should be identified as assumptions or recommendations rather than established facts.

---

AI Collaboration

AI collaborators shall:

- identify risks before implementation;
- distinguish facts from recommendations;
- clearly communicate uncertainty;
- avoid inventing institutional policy;
- reference governing authority when making recommendations;
- recommend additional review whenever evidence is incomplete.

---

Defect Classification

Every identified issue shall be classified.

Severity:

- Critical
- High
- Medium
- Low
- Informational

Status:

- Open
- Under Review
- Approved
- In Progress
- Blocked
- Resolved
- Verified
- Closed

---

Definition of Done

Work is considered complete only when:

- required quality gates have been satisfied;
- documentation reflects the current state;
- dependencies remain consistent;
- unresolved risks have been documented;
- implementation matches approved intent;
- required approvals have been obtained.

---

Continuous Improvement

Quality is an ongoing responsibility.

Lessons learned from defects, incidents, audits, Member feedback, and operational experience should be incorporated into future work through documented improvements.

---

Launch Readiness

Before any public release, Aureus should verify that:

- critical known issues have been addressed or consciously accepted;
- repository governance is current;
- operational procedures are documented;
- monitoring and recovery plans exist;
- legal and privacy requirements applicable to the release have been reviewed;
- the release aligns with the mission and standards of the institution.

---

Stewardship Commitment

Every contributor—human or AI—shares responsibility for preserving the quality, integrity, and trustworthiness of Aureus.

The goal is not perfection. The goal is responsible, transparent, and continually improving stewardship.