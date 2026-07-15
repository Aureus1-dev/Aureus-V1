# ENG-004 — Engineering Standards

**Document ID:** ENG-004
**Title:** Engineering Standards
**Status:** Draft for Founder Approval
**Authority:** Canonical upon Founder Approval
**Version:** 1.0

---

# 1. Purpose

This document establishes the mandatory engineering standards for all software developed within Aureus.

Every AI engineer, human engineer, contributor, contractor, or automated system shall follow these standards.

The purpose of these standards is to produce software that remains secure, maintainable, understandable, scalable, and trustworthy over the lifetime of the institution.

---

# 2. Engineering Philosophy

Engineering shall prioritize:

1. Correctness
2. Security
3. Readability
4. Maintainability
5. Simplicity
6. Scalability
7. Performance

Performance improvements shall never compromise correctness.

Short-term convenience shall never compromise long-term maintainability.

---

# 3. Repository Organization

Every file shall have one clear responsibility.

Directory structure shall reflect business domains rather than technical convenience.

Business logic shall remain inside domain services.

Utility code shall remain centralized.

Duplicate implementations are prohibited.

---

# 4. Code Quality

Every implementation shall:

- Be readable.
- Be self-documenting where practical.
- Minimize complexity.
- Minimize duplication.
- Follow repository naming conventions.
- Prefer explicit behavior over implicit behavior.

Large methods shall be decomposed into smaller reusable units.

---

# 5. Naming Standards

Names shall be:

- Descriptive
- Consistent
- Unambiguous

Avoid abbreviations unless they are universally understood.

Business terminology shall match canonical documents.

---

# 6. Error Handling

Every error shall:

- Be intentional.
- Be meaningful.
- Be logged where appropriate.
- Return stable API responses.

Silent failures are prohibited.

Unhandled exceptions are prohibited.

---

# 7. Validation

Every external input shall be validated.

Validation shall occur before business logic executes.

Validation rules shall be centralized whenever practical.

No service shall assume client input is trustworthy.

---

# 8. Authorization

Every protected operation shall verify:

- Authentication
- Permission
- Ownership
- Organization scope
- Platform authority where applicable

Authorization shall never rely solely upon client-provided identifiers.

---

# 9. Database Standards

Database changes shall:

- Use migrations.
- Preserve data integrity.
- Maintain referential integrity.
- Minimize breaking changes.
- Be reversible where practical.

Historical migrations shall not be rewritten without explicit Founder approval.

---

# 10. API Standards

Every endpoint shall provide:

- Stable request formats
- Stable response formats
- Predictable error handling
- Pagination where appropriate
- Filtering where appropriate
- Sorting where appropriate

Breaking API changes shall be documented.

---

# 11. Logging Standards

Logging shall support:

- Operational troubleshooting
- Security auditing
- Production diagnostics

Sensitive information shall never be written to logs.

Passwords, secrets, authentication tokens, and private keys shall never appear in log output.

---

# 12. Security Standards

Security requirements include:

- Least privilege
- Secure defaults
- Defense in depth
- Input validation
- Output sanitization
- Audit logging
- Secure secret management

Security shortcuts are prohibited.

---

# 13. Testing Standards

Every implementation shall include testing appropriate to its scope.

Testing shall verify:

- Expected behavior
- Error behavior
- Authorization
- Validation
- Business rules
- Regression prevention

Tests shall increase confidence, not merely improve coverage percentages.

---

# 14. Documentation Standards

Documentation shall remain synchronized with implementation.

Every completed domain shall update:

- API documentation
- Architecture references
- Domain documentation
- Operational documentation
- Implementation reports

Documentation shall describe actual behavior.

---

# 15. AI Engineering Conduct

AI engineers shall:

- Read before modifying.
- Search before duplicating.
- Extend before replacing.
- Verify before declaring success.
- Document significant architectural decisions.
- Respect all canonical authority.

AI engineers shall not invent business policy.

---

# 16. Continuous Improvement

Engineering standards may evolve through Founder approval.

Improvements shall strengthen:

- Security
- Reliability
- Maintainability
- Scalability
- Institutional longevity

Changes shall remain backward compatible whenever practical.

---

# 17. Compliance

Compliance with this document is mandatory.

No implementation shall be considered production-ready unless it conforms to ENG-004.

---

# 18. Amendment

Only the Founder may amend this Engineering Standard.

All engineering work performed within Aureus shall remain subordinate to this document.