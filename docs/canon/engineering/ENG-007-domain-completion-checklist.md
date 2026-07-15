# ENG-007 — Domain Completion Checklist

**Document ID:** ENG-007
**Title:** Domain Completion Checklist
**Status:** Draft for Founder Approval
**Authority:** Canonical upon Founder Approval
**Version:** 1.0

---

# 1. Purpose

This document establishes the mandatory completion checklist for every Aureus business domain.

No domain shall be presented for Founder review, pull request creation, or merge until every applicable checklist item has been completed.

The checklist exists to ensure that every completed domain satisfies the standards established by ENG-001 through ENG-006.

---

# 2. General Rule

Completion means:

- The business capability is complete.
- The engineering implementation is complete.
- Validation is complete.
- Documentation is complete.
- Operational verification is complete.

A partially completed domain shall not be represented as complete.

---

# 3. Repository Review

Before implementation is considered complete, verify:

- Repository synchronized with latest main.
- No unresolved merge conflicts.
- No duplicated implementations.
- Repository organization preserved.
- Existing architecture respected.

---

# 4. Domain Review

Confirm:

- Business requirements implemented.
- Domain boundaries respected.
- No unrelated functionality added.
- Approved Founder decisions implemented.
- Deferred items documented.

---

# 5. Database Checklist

Where applicable:

- Schema updated.
- Migration created.
- Migration tested.
- Constraints verified.
- Indexes verified.
- Foreign keys verified.
- Referential integrity preserved.
- Existing data protected.

---

# 6. API Checklist

Verify:

- Controllers complete.
- Services complete.
- DTOs complete.
- Validation complete.
- Authorization enforced.
- Stable request formats.
- Stable response formats.
- Error responses standardized.
- Pagination implemented where appropriate.
- Filtering implemented where appropriate.
- Search implemented where appropriate.

---

# 7. Security Checklist

Verify:

- Authentication enforced.
- Authorization enforced.
- Ownership checks complete.
- Organization isolation enforced.
- Audit logging preserved.
- No plaintext secrets.
- Secure defaults maintained.

---

# 8. Testing Checklist

Verify successful execution of:

- Unit tests.
- Integration tests.
- End-to-end tests.
- Authorization tests.
- Validation tests.
- Regression tests.
- Domain workflow tests.

All failures shall be resolved before completion.

---

# 9. Build Checklist

Verify:

- Dependencies install successfully.
- Prisma generation succeeds.
- TypeScript passes.
- ESLint passes.
- Build succeeds.
- Health endpoint succeeds.
- Application starts successfully.

---

# 10. Operational Verification Checklist

Verify:

- Critical workflows execute.
- Database connectivity confirmed.
- Authentication works.
- Authorization works.
- Domain functionality verified.
- No blocking runtime errors.

Operational verification shall be documented.

---

# 11. Documentation Checklist

Verify:

- Domain documentation updated.
- API documentation updated.
- Architecture references updated.
- ADRs updated where applicable.
- Implementation report completed.
- Validation report completed.

Documentation shall accurately reflect implementation.

---

# 12. Pull Request Checklist

Every completed domain shall include:

- One cohesive Pull Request.
- Clear title.
- Scope summary.
- Validation summary.
- Migration notes.
- Security considerations.
- Reviewer checklist.

---

# 13. Founder Review Checklist

Founder review shall confirm:

- Business intent satisfied.
- Domain scope complete.
- Canonical documents respected.
- Engineering quality acceptable.
- Production Ready requirements satisfied.

---

# 14. Completion Declaration

A domain may be declared complete only after every applicable checklist item has been satisfied.

Passing tests alone does not constitute completion.

Implementation alone does not constitute completion.

Completion requires the successful integration of engineering quality, operational verification, documentation, and Founder review.

---

# 15. Amendment

Only the Founder may amend this checklist.

Every Aureus business domain shall satisfy this document before being considered complete.