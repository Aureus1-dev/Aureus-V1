OAS-TECH-104 — Software Testing and Quality Assurance Standard Operating Procedure (SOP)

Canonical Designation: OAS-TECH-104
Status: Canonical Draft v1.0
Authority: OAS-TECH-009 — Engineering Standards and Development Framework
Owner: Chief Quality Engineering Steward
Effective Date: July 13, 2026
Review Cycle: Annual

---

Purpose

This Standard Operating Procedure establishes the canonical software testing and quality assurance process for every Aureus technology system.

Its purpose is to ensure software is verified for correctness, reliability, security, performance, maintainability, and operational readiness before deployment into production.

---

Scope

This procedure applies to:

- Web applications
- Mobile applications
- Backend services
- APIs
- AI systems
- Infrastructure automation
- Shared libraries
- Internal operational tools
- Production releases

---

Objectives

Every software release shall:

- Advance the mission.
- Protect members.
- Meet engineering standards.
- Satisfy documented requirements.
- Pass required quality gates.
- Minimize production defects.
- Preserve operational stability.
- Support continuous improvement.

---

Roles and Responsibilities

Software Engineer

Responsible for:

- Writing testable software.
- Creating unit tests.
- Resolving defects.
- Updating documentation.

---

Quality Assurance Steward

Responsible for:

- Planning verification.
- Executing quality reviews.
- Confirming release readiness.
- Recording test results.
- Reporting quality metrics.

---

AI Quality Agent

Responsible for:

- Generating test suggestions.
- Identifying edge cases.
- Detecting regression risks.
- Reviewing test coverage.
- Supporting defect analysis.

Human approval is required before production release.

---

Prerequisites

Before testing begins:

- Requirements are approved.
- Development is complete.
- Build succeeds.
- Test environment is available.
- Test data is prepared.

---

Procedure

Step 1 — Test Planning

Define:

- Test scope.
- Acceptance criteria.
- Required environments.
- Test strategy.
- Success metrics.

---

Step 2 — Unit Testing

Verify individual components function correctly.

Unit tests should remain automated whenever practical.

---

Step 3 — Integration Testing

Verify interactions between services, APIs, databases, and external systems.

---

Step 4 — End-to-End Testing

Validate complete user workflows using production-like environments whenever practical.

---

Step 5 — Security Testing

Evaluate:

- Authentication.
- Authorization.
- Input validation.
- Dependency vulnerabilities.
- Sensitive data protection.

Critical security findings shall be resolved before release.

---

Step 6 — Performance Testing

Where applicable, verify:

- Response times.
- Resource utilization.
- Scalability.
- Stability under expected workloads.

---

Step 7 — Regression Testing

Confirm previously functioning capabilities continue operating correctly after changes.

---

Step 8 — Quality Review

Review:

- Test results.
- Defects.
- Documentation.
- Release readiness.
- Operational risks.

---

Step 9 — Release Approval

Production deployment may proceed only after required quality gates have been satisfied.

---

Step 10 — Post-Release Verification

Confirm:

- Successful deployment.
- Service availability.
- Operational stability.
- Monitoring status.
- Member impact.

Document any issues requiring follow-up.

---

Success Metrics

Monitor:

- Test coverage.
- Defect escape rate.
- Production incidents.
- Regression failures.
- Automated test execution.
- Release quality.
- Mean time to detect defects.
- Mean time to resolve defects.

---

Exceptions

Emergency production fixes may use expedited testing procedures when necessary to protect members or restore critical services.

Emergency releases shall receive comprehensive retrospective verification.

---

Documentation

Maintain:

- Test plans.
- Test results.
- Defect records.
- Quality reports.
- Release approvals.
- Regression history.
- Lessons learned.

---

Continuous Improvement

Software testing and quality assurance practices shall be reviewed regularly to improve automation, coverage, efficiency, engineering quality, AI-assisted verification, and long-term software reliability.

---

Related Documents

- OAS-TECH-009 — Engineering Standards and Development Framework
- OAS-TECH-102 — Software Development Lifecycle SOP
- OAS-TECH-103 — Source Control and Version Management SOP
- OAS-TECH-005 — Information Security and Cybersecurity Framework

---

Revision History

Version 1.0 — Initial canonical release.