OAS-TECH-103 — Source Control and Version Management Standard Operating Procedure (SOP)

Canonical Designation: OAS-TECH-103
Status: Canonical Draft v1.0
Authority: OAS-TECH-009 — Engineering Standards and Development Framework
Owner: Chief Engineering Steward
Effective Date: July 13, 2026
Review Cycle: Annual

---

Purpose

This Standard Operating Procedure establishes the canonical process for managing source code, repositories, version control, branching, releases, and collaboration throughout Aureus.

Its purpose is to preserve software quality, institutional knowledge, development traceability, and operational stability while enabling safe collaboration between human engineers and AI development agents.

---

Scope

This procedure applies to:

- Source code repositories
- Git workflows
- Branch management
- Pull requests
- Merge approvals
- Release tags
- Version numbering
- Repository governance
- Code ownership
- AI-generated code contributions

---

Objectives

Source control practices shall:

- Protect the integrity of the codebase.
- Preserve complete development history.
- Support collaboration.
- Enable traceability.
- Reduce merge conflicts.
- Encourage frequent, reviewable changes.
- Support reliable releases.
- Strengthen long-term maintainability.

---

Roles and Responsibilities

Developer

Responsible for:

- Creating feature branches.
- Writing clear commit messages.
- Maintaining code quality.
- Opening pull requests.
- Responding to review feedback.

---

Engineering Reviewer

Responsible for:

- Reviewing proposed changes.
- Confirming compliance with engineering standards.
- Evaluating maintainability.
- Approving or requesting revisions.
- Protecting production quality.

---

AI Development Agent

Responsible for:

- Assisting with implementation.
- Suggesting improvements.
- Preparing documentation.
- Supporting reviews.
- Detecting potential conflicts.

AI shall not merge changes directly into protected branches without human approval.

---

Prerequisites

Before beginning development:

- Work is approved.
- Repository access is authorized.
- Branch naming follows institutional standards.
- Related work items are identified.

---

Procedure

Step 1 — Create a Branch

Create a new branch for each independent unit of work.

Branch names should clearly describe the purpose of the work.

---

Step 2 — Development

Implement changes using approved engineering standards.

Commits should be:

- Small.
- Focused.
- Well described.
- Logically organized.

---

Step 3 — Commit

Each commit should include a clear message describing:

- What changed.
- Why it changed.
- Related work items where applicable.

Commit history should remain meaningful.

---

Step 4 — Pull Request

Open a Pull Request including:

- Summary.
- Purpose.
- Testing completed.
- Documentation updates.
- Known limitations.
- Related issues.

---

Step 5 — Review

Reviewers shall evaluate:

- Code quality.
- Security.
- Maintainability.
- Architecture compliance.
- Testing.
- Documentation.
- Operational impact.

---

Step 6 — Approval

Changes may be approved, returned for revision, or rejected.

Protected branches require documented approval before merging.

---

Step 7 — Merge

Merge approved changes using the approved repository strategy.

Following merge:

- Verify automated checks.
- Confirm deployment readiness.
- Update documentation where required.

---

Step 8 — Release

Production releases shall include:

- Version number.
- Release notes.
- Deployment approval.
- Rollback plan.
- Operational verification.

---

Version Management

Software versions shall be:

- Clearly identified.
- Consistently numbered.
- Documented.
- Traceable.
- Linked to release history.

Version history preserves institutional knowledge.

---

Repository Governance

Repositories shall maintain:

- Protected branches.
- Defined ownership.
- Access controls.
- Review requirements.
- Archived release history.
- Documentation standards.

Governance protects long-term software quality.

---

Success Metrics

Monitor:

- Review completion time.
- Merge success rate.
- Release quality.
- Branch protection compliance.
- Documentation completeness.
- Repository health.
- Deployment success.
- Engineering satisfaction.

---

Exceptions

Emergency production fixes may use expedited workflows when necessary to restore critical operations.

Emergency changes shall receive retrospective review and documentation.

---

Documentation

Maintain:

- Repository policies.
- Branch strategy.
- Pull request history.
- Release notes.
- Version history.
- Approval records.
- Audit logs.

---

Continuous Improvement

Source control practices shall be reviewed regularly to improve collaboration, automation, engineering quality, AI integration, repository governance, and long-term maintainability.

---

Related Documents

- OAS-TECH-003 — Software Architecture Framework
- OAS-TECH-009 — Engineering Standards and Development Framework
- OAS-TECH-102 — Software Development Lifecycle SOP
- OAS-TECH-101 — Technology Governance and Architecture Review SOP

---

Revision History

Version 1.0 — Initial canonical release.