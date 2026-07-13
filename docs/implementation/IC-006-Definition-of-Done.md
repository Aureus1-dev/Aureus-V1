IC-006 — Definition of Done

Canonical Designation: IC-006

Title: Definition of Done

Status: Canonical

Authority: This document establishes the mandatory criteria that every Aureus Work Order must satisfy before it may be declared complete. It is subordinate to the OAS Series, the Product Constitution, the Architecture Decision Records (ADRs), and IC-001 through IC-005.

---

Article I — Purpose

The Definition of Done establishes a uniform standard for determining when implementation work is complete.

Its purpose is to ensure that completed work is production-ready, verifiable, maintainable, and consistent with the Aureus engineering process.

No Work Order may be marked complete unless every applicable requirement in this document has been satisfied.

---

Article II — Scope Completion

The implementation shall:

- Fully satisfy the approved Work Order.
- Implement every required deliverable.
- Remain within the approved scope.
- Leave no required functionality unfinished.

Features that are deferred shall be assigned to a separate approved Work Order.

---

Article III — Architectural Compliance

The implementation shall:

- Conform to the canonical architecture.
- Respect all approved Architecture Decision Records (ADRs).
- Preserve established module boundaries.
- Avoid unauthorized architectural changes.

---

Article IV — Code Quality

All implementation shall:

- Compile successfully.
- Follow project formatting standards.
- Pass linting requirements.
- Avoid unnecessary complexity.
- Remove obsolete or dead code introduced during implementation.

---

Article V — Security

Before completion, the implementation shall:

- Validate external inputs.
- Enforce authorization rules.
- Protect confidential information.
- Avoid introducing known security vulnerabilities.
- Comply with applicable security requirements defined by the Work Order.

---

Article VI — Testing

All required testing shall be complete.

Where applicable, this includes:

- Unit testing
- Integration testing
- End-to-end testing
- Regression testing
- Performance testing
- Security testing

Required tests shall pass before completion.

---

Article VII — Documentation

Documentation shall be updated to reflect the completed implementation.

This includes, where applicable:

- Technical documentation
- API documentation
- Architecture documentation
- Configuration documentation
- Operational documentation

Documentation shall accurately reflect the implementation at the time of completion.

---

Article VIII — Acceptance Criteria

Every acceptance criterion defined by the Work Order shall be verified.

Acceptance criteria shall be:

- Complete
- Objective
- Testable
- Measurable

Unverified acceptance criteria prevent completion.

---

Article IX — Operational Readiness

Before completion, the implementation shall be suitable for its intended deployment stage.

Where production readiness is required, the implementation shall demonstrate:

- Operational stability
- Appropriate logging
- Error handling
- Monitoring support
- Configuration integrity

---

Article X — Completion Report

Every completed Work Order shall include a completion report containing:

- Work Order identifier
- Summary of implementation
- Files created
- Files modified
- Test results
- Acceptance criteria verification
- Known limitations, if any
- Recommended follow-up Work Orders

---

Article XI — Definition of Complete

A Work Order is complete only when:

- All approved scope has been implemented.
- All applicable engineering standards have been satisfied.
- Required tests pass.
- Documentation is current.
- Acceptance criteria are verified.
- Architectural compliance is maintained.
- Required security standards are met.
- The implementation is approved for the next stage of the Implementation Lifecycle.

No implementation may be represented as complete unless these conditions have been fulfilled.

---

Article XII — Continuous Integrity

The Definition of Done shall remain a permanent safeguard against incomplete, unverifiable, or low-quality implementation.

Future amendments shall strengthen clarity, quality, and accountability while remaining consistent with higher-authority governing documents.