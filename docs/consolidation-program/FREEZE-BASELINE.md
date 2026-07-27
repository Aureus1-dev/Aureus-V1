# Constitutional Consolidation Program — Freeze Baseline

**Status:** Active
**Phase:** 0 (Freeze Baseline) — complete. Phase 1 (Inventory) — complete (see `CONSTITUTION-INVENTORY.md` and `DUPLICATION-MAP.md`).

## Baseline

- **Baseline commit SHA:** `ce0e630ab47806ad2174c64cd4275c8d6ce74d05`
- **Baseline commit timestamp:** 2026-07-26T22:59:54-04:00
- **Recorded at (freeze declaration time):** 2026-07-27T03:07:09Z
- **Working branch:** `docs/repository-consolidation`, created directly from the baseline SHA (branch did not previously exist, confirmed via `git ls-remote --heads origin docs/repository-consolidation` returning empty before creation).

This SHA is immutable for the purposes of this program's Phase 1 inventory. All inventory findings, duplication maps, and registries produced under this program are measured against this exact tree. `main` is not modified by this program until a controlled, reviewed merge at Phase 12.

## Context for the freeze point

Immediately before this program was chartered, 105 commits / 101 files landed directly on `main` (no PR) between `64d581f` and `ce0e630`, adding a large wave of new constitutional/canon material (Founder's Office, Personal Steward, Steward, Experience Canon, Governance canons GV-001–008, Brand & Identity, Member Stewardship, Flourishing, Safety & Trust, Frontend Blueprints, Execution Center, Opportunity Center, and more). Per Founder direction, the baseline is locked **after** this wave, not before it — `ce0e630` is the frozen point, not `64d581f`.

## Freeze declaration

Effective from this baseline commit forward: no new constitutional, canon, or governance-authority document is to be added directly to `main` outside this consolidation program until the program reaches Phase 12 (Ratification and Final Freeze) and the temporary freeze is lifted. Any commit landing on `main` after `ce0e630` is a **post-baseline change** and requires a separate delta review before this program's consolidation work is merged — it is not incorporated into the Phase 1 inventory below.

## Scope manifest

Paths included in the constitutional/governance inventory (Phase 1), as they exist at the baseline SHA:

| Path | Files (baseline) | Note |
|---|---|---|
| `docs/constitution/` | 16 | OAS/ALC constitutional series |
| `docs/docs/constitution/` | 9 | **Anomalous nested path** — see Duplication Map. Not a legitimate directory name; included in scope precisely because it holds constitutional-labeled content that needs disposition. |
| `docs/constitutional/register/` | 1 | Singular/plural variant of `docs/constitution/` — needs disposition |
| `docs/canon/` (all subtrees) | 173 | Largest single tree: ai, brand-and-identity, branding (+ emotional-foundations, experience-architecture), engineering, execution-center, experience, flourishing-and-human-development, governance, member-journey, member-stewardship, opportunity-center, safety-and-trust, steward/foundation |
| `docs/00-foundation/` | 3 | FOUNDATION-001/002/003 |
| `docs/governance/` | 4 top-level + `audits/`, `protocols/`, `registry/` subtrees (from prior consolidation work, PR #49) | |
| `docs/foundry/founders-office/` | 7 | |
| `docs/foundry/personal-steward/` | 1 | |
| `docs/steward/foundation/` | 1 | Parallel to `docs/canon/steward/foundation/` — see Duplication Map (SC-001) |
| `docs/architecture/` (+ `experience/`) | 17 | Screened for constitutional-authority claims per Phase 0 definition — not all files here are in-scope, only those claiming governing authority |
| `docs/03-member-experience/` (`experience-canon/`, `frontend-blueprints/`) | 27 | |
| `docs/frontend/` (`blueprints/`, `canon/`) | 23 | |
| `docs/production-canons/` | 60 | Screened for constitutional-authority claims per Phase 0 definition |
| `docs/branding/` | ~16 | Parallel to `docs/canon/branding/` — see Duplication Map (BRAND-* series) |
| `docs/launch/` | 6 | Screened — launch operations doc, not constitutional, but includes `EXECUTION-AUTHORITY.md` which needs an authority-claim check |
| `docs/work-orders/` | 33 | Not constitutional by genre; included for ID-collision cross-check only (see WO-* / DOMAIN-002 / PR-002 findings) |
| `docs/verification/` | ~30 | Same as above — cross-check only |
| `docs/drafts/` | 1 | `OAS-001_Draft_0.95.md` — the unratified draft that the entire OAS constitutional series and ~100 department Charter/Framework documents cite as supreme authority. **Added below — see note.** |
| `docs/implementation/` | 19 | `IC-001-Implementation-Constitution.md` (self-declared "Canonical," subordinate to "the OAS Series") plus `IC-002`–`IC-020` (18 engineering standards, explicitly subordinate to IC-001). **Added below — see note.** |
| `docs/communications/` (incl. `sops/`) | 9 | `OAS-COM-001` Charter, `OAS-COM-002`–`005` Frameworks (incl. a 92-byte stub at `OAS-COM-002`), `sops/OAS-COM-101`–`104`. **Added below — see note.** |
| `docs/data/` (incl. `sops/`) | 9 | `OAS-DATA-001` Charter, `OAS-DATA-002`–`005` Frameworks, `sops/OAS-DATA-101`–`104`. **Added below — see note.** |
| `docs/finance/` (incl. `sops/`) | 29 | `OAS-FIN-001` Charter ×2 (ID collision), `OAS-FIN-002`–`010` Frameworks (incl. 4 collision pairs), `sops/OAS-FIN-101`–`110` (incl. 4 collision pairs). **Added below — see note.** |
| `docs/human-resources/` (incl. `sops/`) | 9 | `OAS-HR-001` Charter, `OAS-HR-002`–`005` Frameworks, `sops/OAS-HR-101`–`104`. **Added below — see note.** |
| `docs/legal/` (incl. `sops/`) | 20 | `OAS-LEG-001` Charter ×2 (ID collision), `OAS-LEG-002`–`008` Frameworks, `sops/OAS-LEG-101`–`107` (incl. 4 collision pairs). **Added below — see note.** |
| `docs/operations/` (incl. `sops/`) | 67 | `OAS-OPS-001` Charter ×2 (ID collision, most severe of the four — disagree on supreme authority itself), `OAS-OPS-002`–`015` Frameworks (incl. 9 collision groups), `sops/OAS-OPS-101`–`120` (incl. 13 collision groups), plus `production-runbook.md` (explicitly disclaims governance-canon status). **Added below — see note.** |
| `docs/risk/` (incl. `sops/`) | 9 | `OAS-RISK-001` Charter, `OAS-RISK-002`–`005` Frameworks, `sops/OAS-RISK-101`–`104`. **Added below — see note.** |
| `docs/security/` (incl. `sops/`) | 12 | `OAS-SEC-001` Charter, `OAS-SEC-002`–`007` Frameworks, `sops/OAS-SEC-101`–`105`. **Added below — see note.** |
| `docs/technology/` (incl. `sops/`) | 42 | `OAS-TECH-001` Charter ×2 (ID collision), `OAS-TECH-002`–`010` Frameworks (incl. 5 collision groups), `sops/OAS-TECH-101`–`115` (incl. 4 collision groups). **Added below — see note.** |
| `docs/architecture/experience/` | 2 | `AEX-000` (Experience Constitution — self-declared "Constitutional" authority, no superior cited) and `AEX-001` (Living Hall Canon, subordinate to AEX-000). **Added below — see note.** |

**Total `.md` files under `docs/` at baseline:** 670 (full corpus, hashed — see `raw-evidence/all-docs-sha256.txt`).

Any file anywhere in the tree whose own text self-describes it as a constitution, charter, law, canon, doctrine, governing authority, supremacy rule, or institutional foundation is in scope regardless of directory, per the program's governing task. The directory list above is a starting map, not a filter — Phase 1's exhaustive pass screens content, not just paths.

> **Note on the rows above marked "Added below":** `docs/drafts/`, `docs/implementation/`, all 9 department directories (`docs/communications/`, `docs/data/`, `docs/finance/`, `docs/human-resources/`, `docs/legal/`, `docs/operations/`, `docs/risk/`, `docs/security/`, `docs/technology/`, each with `sops/`), and `docs/architecture/experience/` were **not present in the original version of this scope manifest**. They were discovered during Phase 1 itself — not by any agent's originally assigned directory list, but by a repo-wide grep sweep (Fragment 4) that surfaced a large, previously-uncataloged "OAS Departmental Charter/Framework/SOP" corpus and the `docs/drafts/OAS-001_Draft_0.95.md` root document, which Fragment 5 then fully inventoried. This is a **scope-manifest correction to match what Phase 1 actually covered, not a retroactive baseline change**: the baseline SHA (`ce0e630ab47806ad2174c64cd4275c8d6ce74d05`) and the freeze declaration above are unchanged — every file in these directories already existed in the repository at the baseline commit and was already subject to the freeze declaration's "no new constitutional/canon/governance-authority document on `main`" rule; this table is simply being corrected to document that fact. The 670-file total `.md` count under `docs/` at baseline already included these files (it was computed by a full-tree hash sweep, not by the directory list above) — only the human-readable scope-manifest table above was incomplete. See `CONSTITUTION-INVENTORY.md` (Section 5 and the "Total scope" table at the top) for the full per-file inventory of everything added here.

## Explicitly out of scope for this program

- PR #48 (ship-ready application engineering: C9, PD-007, PD-008, PD-009) — untouched.
- PR #47 — already closed, superseded by #48/#49.
- Application code, tests, CI configuration, Prisma schema — untouched.
