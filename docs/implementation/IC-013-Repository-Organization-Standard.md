IC-013 — Repository Organization Standard

Canonical Designation: IC-013

Title: Repository Organization Standard

Status: Canonical

Authority: This document establishes the canonical organization of the Aureus source repository. It is subordinate to the OAS Series, the Product Constitution, the Architecture Decision Records (ADRs), the Implementation Decision Records (IDRs), and IC-001 through IC-012.

---

Article I — Purpose

The Aureus repository shall remain organized, predictable, and maintainable throughout its lifetime.

Every contributor shall place code, documentation, configuration, tests, and operational assets in their canonical locations.

Repository organization exists to reduce complexity, improve discoverability, simplify onboarding, and preserve institutional engineering knowledge.

---

Article II — Canonical Structure

The repository shall maintain clearly defined top-level directories.

These include, where applicable:

- "/apps"
- "/packages"
- "/docs"
- "/infrastructure"
- "/scripts"
- "/tests"
- "/tools"
- "/configs"

Additional top-level directories require approval through the established governance process.

---

Article III — Documentation Organization

The "/docs" directory shall contain canonical documentation, including:

- Constitutional Documents
- Product Constitution
- Architecture
- ADRs
- IDRs
- Implementation Canon (IC Series)
- Work Orders
- Release Notes
- Operational Documentation

Documentation shall not be duplicated across multiple locations without explicit justification.

---

Article IV — Source Code Organization

Source code shall be organized according to approved architectural boundaries.

Modules shall:

- have clearly defined responsibilities;
- minimize coupling;
- maximize cohesion;
- expose only approved public interfaces.

Cross-module dependencies shall follow the approved architecture.

---

Article V — Naming Standards

Directory names, file names, and module names shall:

- be descriptive;
- use consistent conventions;
- avoid unnecessary abbreviations;
- remain stable whenever practical.

Names shall communicate purpose rather than implementation detail.

---

Article VI — Ownership

Each major module or subsystem should identify its responsible owner or stewardship team where applicable.

Ownership exists to improve accountability, maintenance, and continuity.

---

Article VII — Repository Integrity

Contributors shall avoid:

- duplicate implementations;
- obsolete files;
- abandoned experimental code;
- undocumented generated artifacts;
- inconsistent organizational patterns.

Repository cleanliness is a continuous responsibility.

---

Article VIII — Refactoring

Repository reorganization shall occur only when it strengthens clarity, maintainability, or architectural consistency.

Large-scale structural changes shall be governed through the approved Work Order and Change Control processes.

---

Article IX — Traceability

Repository organization shall preserve traceability between:

- Work Orders
- ADRs
- IDRs
- Documentation
- Source Code
- Tests
- Releases

Every significant implementation should be traceable from governing specification through deployed software.

---

Article X — Long-Term Stewardship

The repository is a permanent institutional asset.

Every organizational decision should improve the ability of future contributors—human or AI—to understand, navigate, maintain, and extend the Aureus platform without unnecessary complexity.

Repository organization shall favor long-term stewardship over short-term convenience.