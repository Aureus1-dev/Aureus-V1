IC-017 — Versioning Standard

Canonical Designation: IC-017

Title: Versioning Standard

Status: Canonical

Authority: This document establishes the mandatory standards governing versioning throughout the Aureus platform. It is subordinate to the OAS Series, the Product Constitution, the Architecture Decision Records (ADRs), the Implementation Decision Records (IDRs), and IC-001 through IC-016.

---

Article I — Purpose

The purpose of this Standard is to establish a consistent, transparent, and traceable versioning system for all significant Aureus assets.

Versioning shall communicate change, preserve history, and support long-term stewardship.

---

Article II — Scope

This Standard applies to:

- Software releases
- APIs
- Database schemas
- Infrastructure
- Documentation
- Constitutional documents
- Work Orders
- ADRs
- IDRs
- Configuration standards

---

Article III — Versioning Principles

Version numbers shall:

- Clearly identify released states.
- Preserve historical traceability.
- Communicate compatibility expectations.
- Support reproducible deployments.
- Remain permanent once published.

Published version identifiers shall never be reused.

---

Article IV — Software Versioning

Software releases shall use Semantic Versioning:

MAJOR.MINOR.PATCH

A:

- MAJOR version indicates incompatible or intentionally breaking changes.
- MINOR version indicates backward-compatible functionality additions.
- PATCH version indicates backward-compatible corrections or maintenance updates.

Pre-release identifiers may be used where appropriate.

---

Article V — Document Versioning

Canonical governance documents shall maintain:

- Canonical designation
- Status
- Revision history
- Amendment references where applicable

Document history shall remain permanently traceable.

---

Article VI — API Versioning

Public APIs shall expose explicit version identifiers.

Breaking API changes shall require a new major API version unless an approved governance process authorizes otherwise.

Deprecated API versions should remain available for an appropriate transition period when practical.

---

Article VII — Database Versioning

Database schema changes shall:

- Be version-controlled.
- Be traceable to Work Orders.
- Include migration history.
- Support reliable deployment and rollback where reasonably practical.

---

Article VIII — Release Identification

Each release shall identify:

- Version number
- Release date
- Included Work Orders
- Related ADRs
- Related IDRs
- Release notes

Release identifiers shall remain immutable after publication.

---

Article IX — Deprecation

When functionality is scheduled for removal, the platform shall document:

- What is being deprecated.
- Why it is being deprecated.
- The recommended replacement, if any.
- The anticipated removal timeline, where known.

Deprecation shall precede removal whenever reasonably practical.

---

Article X — Long-Term Stewardship

Versioning exists to preserve continuity across generations of contributors.

Every version should improve the ability to understand, reproduce, maintain, and evolve the Aureus platform while protecting institutional memory and engineering integrity.

This Standard shall evolve only through approved amendments consistent with the governing implementation documents.