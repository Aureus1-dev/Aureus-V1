IC-007 — Testing Standard

Canonical Designation: IC-007

Title: Testing Standard

Status: Canonical

Authority: This document establishes the mandatory testing standards for the Aureus platform. It is subordinate to the OAS Series, the Product Constitution, the Architecture Decision Records (ADRs), and IC-001 through IC-006.

---

Article I — Purpose

The purpose of this Testing Standard is to ensure that every implementation is verified through repeatable, objective, and documented testing before it is accepted.

Testing is a required engineering activity and is not optional.

---

Article II — Scope

These standards apply to:

- All production code.
- Backend services.
- Frontend applications.
- APIs.
- Database migrations.
- Infrastructure automation.
- Security-sensitive functionality.
- AI-assisted implementations.

---

Article III — Testing Principles

Testing shall:

- Verify correctness.
- Detect regressions.
- Protect architectural integrity.
- Be repeatable.
- Be automated whenever practical.
- Produce clear pass/fail outcomes.
- Be maintained alongside the implementation.

---

Article IV — Testing Levels

Testing may include, as applicable:

- Unit Testing
- Integration Testing
- End-to-End Testing
- Regression Testing
- Performance Testing
- Security Testing
- Accessibility Testing
- Smoke Testing

Each Work Order shall identify the required testing levels.

---

Article V — Test Design

Tests shall:

- Verify expected behavior.
- Exercise error conditions where appropriate.
- Validate boundary conditions.
- Be deterministic whenever practical.
- Avoid unnecessary duplication.
- Be understandable and maintainable.

---

Article VI — Automation

Automated testing is the preferred default.

Manual testing may supplement automated testing where automation is impractical, but it shall not replace automated testing without documented justification.

---

Article VII — Test Environment

Testing shall be conducted in environments appropriate to the implementation stage.

Where practical, testing environments should reasonably reflect production behavior.

---

Article VIII — Failure Handling

A failed required test shall prevent a Work Order from being declared complete until:

- the failure has been corrected; or
- the failure has been formally approved as an exception through the project's governance process.

Known failures shall never be hidden or ignored.

---

Article IX — Test Documentation

Testing records shall identify:

- the Work Order;
- the functionality tested;
- the testing level performed;
- the outcome;
- any known limitations or exceptions.

Documentation shall be sufficient for another contributor to understand what was verified.

---

Article X — Regression Protection

Whenever implementation changes existing functionality, contributors shall take reasonable steps to ensure that previously verified behavior continues to function as intended.

Regression testing shall be proportionate to the risk introduced by the change.

---

Article XI — Completion Requirements

Testing is complete only when:

- all required test suites have been executed;
- required tests pass;
- failures have been resolved or formally approved as exceptions;
- testing documentation has been updated where required.

---

Article XII — Continuous Improvement

The Aureus testing process shall evolve through approved amendments to improve reliability, coverage, maintainability, and confidence in the software while remaining consistent with the governing implementation documents.