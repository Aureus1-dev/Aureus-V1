# ENG-008 — Pull Request Review Checklist

**Document ID:** ENG-008
**Title:** Pull Request Review Checklist
**Status:** Draft for Founder Approval
**Authority:** Canonical upon Founder Approval
**Version:** 1.0

---

# 1. Purpose

This document establishes the mandatory review process for every Pull Request submitted to the Aureus repository.

Its purpose is to ensure that all code entering the canonical repository has been independently validated, reviewed, and determined to satisfy the Engineering Canon.

A Pull Request is not merely a mechanism for merging code.

It is the institutional checkpoint through which every engineering change becomes part of Aureus.

---

# 2. Review Philosophy

Every Pull Request shall answer one question:

**Does this change strengthen Aureus without weakening any existing capability?**

Reviewers shall optimize for:

- Correctness
- Security
- Maintainability
- Institutional consistency
- Long-term stewardship

---

# 3. Scope Verification

Confirm:

- PR has one clearly defined purpose.
- Scope matches the approved domain or work order.
- No unrelated functionality included.
- No hidden architectural changes.
- No accidental file modifications.

---

# 4. Repository Integrity

Verify:

- Repository structure preserved.
- Naming conventions followed.
- Existing architecture respected.
- No duplicate implementations introduced.
- No unnecessary dependencies added.

---

# 5. Business Rule Verification

Confirm:

- Approved Founder decisions implemented correctly.
- Business rules enforced.
- Domain boundaries respected.
- Deferred functionality documented.
- No unauthorized policy changes introduced.

---

# 6. Security Review

Verify:

- Authentication enforced.
- Authorization enforced.
- Ownership enforced.
- Organization boundaries respected.
- Sensitive data protected.
- Audit logging preserved.
- No plaintext secrets introduced.

Any unresolved security issue blocks approval.

---

# 7. Database Review

Where applicable, verify:

- Schema changes are correct.
- Migrations execute successfully.
- Constraints remain valid.
- Indexes are appropriate.
- Existing data remains protected.
- Prisma generation succeeds.

---

# 8. API Review

Verify:

- Controllers complete.
- Services complete.
- DTOs validated.
- Stable request formats.
- Stable response formats.
- Error handling consistent.
- Pagination, filtering, and search implemented where required.

---

# 9. Testing Review

Confirm successful execution of:

- Unit Tests
- Integration Tests
- End-to-End Tests
- Authorization Tests
- Validation Tests
- Regression Tests

Reviewers shall verify that tests meaningfully exercise business behavior.

---

# 10. Validation Review

Verify successful completion of:

- Dependency installation
- Prisma generation
- TypeScript
- ESLint
- Build
- Health verification
- Operational verification

No known validation failures shall remain.

---

# 11. Documentation Review

Confirm updates to:

- Domain documentation
- API documentation
- Architecture references
- ADRs where applicable
- Implementation report
- Validation report

Documentation shall accurately describe implemented behavior.

---

# 12. Operational Readiness

Verify:

- Critical workflows execute successfully.
- No blocking runtime errors.
- Domain integrates correctly with existing systems.
- Existing domains remain functional.

---

# 13. Reviewer Decision

The reviewer shall select exactly one outcome:

## Approved

All checklist items satisfied.

Ready to merge.

---

## Approved with Non-Blocking Follow-Up

Implementation is production-ready.

Minor improvements documented for future work.

---

## Changes Requested

Blocking issue exists.

Merge prohibited until resolved.

---

# 14. Merge Requirements

A Pull Request may be merged only when:

- Review completed.
- Blocking issues resolved.
- Validation successful.
- Production Ready requirements satisfied.
- Founder approval granted where required.

---

# 15. Institutional Record

Every merged Pull Request becomes part of the permanent engineering history of Aureus.

Implementation reports, validation reports, and review outcomes shall remain permanently associated with the change.

---

# 16. Amendment

Only the Founder may amend this Pull Request Review Checklist.

All Pull Requests submitted to Aureus shall conform to this document.