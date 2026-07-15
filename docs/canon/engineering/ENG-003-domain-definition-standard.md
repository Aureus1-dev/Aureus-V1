# ENG-003 — Domain Definition Standard

**Document ID:** ENG-003
**Title:** Domain Definition Standard
**Status:** Draft for Founder Approval
**Authority:** Canonical upon Founder Approval
**Version:** 1.0

---

# 1. Purpose

This document establishes the official definition of a Business Domain within Aureus.

Every AI engineer shall implement complete business domains rather than isolated features.

A Business Domain is the smallest unit of implementation that delivers a complete, coherent, production-ready business capability.

No implementation shall be considered complete until the entire domain satisfies this standard.

---

# 2. Definition of a Business Domain

A Business Domain is a cohesive collection of functionality centered around a single institutional responsibility.

A domain owns:

- Its business rules.
- Its lifecycle.
- Its data.
- Its workflows.
- Its authorization rules.
- Its validation.
- Its integrations.
- Its documentation.
- Its tests.

Domains shall expose capabilities—not implementation details.

---

# 3. Domain Ownership

Each business capability shall belong to exactly one primary domain.

Domains shall not duplicate responsibilities.

Shared functionality shall be implemented as reusable platform services rather than copied between domains.

---

# 4. Required Components

Every production-ready domain shall include, where applicable:

## Data Layer

- Database schema
- Migrations
- Enums
- Relationships
- Indexes
- Constraints

---

## Domain Model

- Entities
- Value Objects
- Business Rules
- State Machines
- Lifecycle Definitions

---

## Application Layer

- Services
- Use Cases
- Transactions
- Error Handling

---

## API Layer

- Controllers
- DTOs
- Validation
- Pagination
- Filtering
- Sorting
- Search
- API Documentation

---

## Security

- Authentication
- Authorization
- Ownership Enforcement
- Organization Isolation
- Audit Logging

---

## Integration

Where appropriate:

- Background Jobs
- Events
- Notifications
- External Service Adapters
- AI Integration
- Queue Processing

---

## Testing

Every domain shall include:

- Unit Tests
- Integration Tests
- End-to-End Tests
- Authorization Tests
- Validation Tests
- Negative Tests
- Regression Tests

---

## Documentation

Every domain shall update:

- API Documentation
- Domain Documentation
- Architecture References
- Operational Documentation
- Implementation Report

---

# 5. Domain Lifecycle

Every domain shall progress through the following lifecycle:

1. Planned
2. Approved
3. In Development
4. Operationally Verified
5. Review Ready
6. Canonically Merged
7. Production Ready

No stage may be skipped.

---

# 6. Domain Completion Requirements

A domain shall not be considered complete until:

- Business rules are fully implemented.
- Authorization is enforced.
- Validation is complete.
- Database changes are verified.
- Tests pass.
- TypeScript passes.
- Lint passes.
- Build succeeds.
- Documentation is complete.
- Operational verification succeeds.
- Pull Request is review-ready.

Partial completion shall not satisfy this standard.

---

# 7. AI Engineering Responsibilities

AI engineers shall:

- Complete the current domain before beginning another.
- Avoid unrelated repository modifications.
- Preserve architectural consistency.
- Respect all canonical documents.
- Reuse existing services whenever possible.
- Avoid duplicate implementations.

---

# 8. Founder Responsibilities

The Founder shall determine:

- Domain boundaries.
- Business policy.
- Institutional governance.
- Product philosophy.
- Domain sequencing.
- Constitutional changes.

Engineering implementation remains delegated to AI systems within these boundaries.

---

# 9. Domain Quality Principles

Every completed domain shall be:

- Secure
- Testable
- Observable
- Maintainable
- Extensible
- Documented
- Production Ready

Temporary implementations, shortcuts, or placeholder behavior shall not be considered complete unless explicitly approved by the Founder.

---

# 10. Cross-Domain Communication

Domains shall communicate through well-defined interfaces.

Direct coupling between unrelated domains should be minimized.

Shared infrastructure shall remain centralized within the platform layer.

---

# 11. Definition of Success

A Business Domain is successful when it can operate as an independent, production-quality institutional capability while integrating cleanly with the rest of Aureus.

The goal is not merely working code.

The goal is a durable institutional building block that can be maintained and extended for decades.

---

# 12. Amendment

Only the Founder may redefine domain boundaries, completion requirements, or implementation standards established by this document.

All future engineering work shall conform to ENG-003.