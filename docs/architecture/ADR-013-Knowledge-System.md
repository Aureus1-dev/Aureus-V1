# ADR-013 — Knowledge System

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-027 |
| Authority | PA-013, PA-018, ADR-003, ADR-006, ADR-012 |

---

## Context

PA-013 (Knowledge System) is one of the twelve Version 1 systems named in PA-020. Prior to this Work Order it had zero implementation. Per the founder's Version 1 architectural decision (2026-07-15), the canonical backend is being completed domain-by-domain before any frontend work begins. WO-027 is the next Work Order in that sequence: per the Remaining Backend Domains audit recorded in `docs/releases/version-1-readiness.md` after WO-026, Knowledge System was the *only* remaining domain not blocked on a founder scope decision (AI Intelligence Engine) or product-scoping decisions (Academy, Pods).

PA-013's Core Responsibilities are, almost verbatim, the same problem WO-020 (Resource Directory, ADR-006) already solved: maintain a structured repository, verify information before publication, organize into categories, support search, and archive outdated records while preserving history. The one responsibility Resources does *not* already cover is "track revisions and version history" — Resources overwrites a listing in place on every update, with no record of what it looked like before.

---

## Decisions

### 1. A new bounded `KnowledgeModule`, reusing the Resources/Opportunities/Organizations verification-workflow shape verbatim

**Decision:** Knowledge lives in a new `apps/api/src/knowledge/` module (`KnowledgeModule`, `KnowledgeController`, `KnowledgeService`). `KnowledgeArticle` reuses the pre-existing, domain-agnostic shared `VerificationStatus` enum (`DRAFT`/`PENDING_REVIEW`/`VERIFIED`/`REJECTED`/`ARCHIVED`) and the same four-action workflow (`submit-for-review` → `verify`/`reject`, plus `archive`) with identical state-transition rules, `CREATOR_ROLES` (Steward/Organization/Business representative/Administrator), and `MODERATOR_ROLES` (Steward/Administrator) gating, mirroring ADR-006's Resource Directory almost exactly.

**Rationale:** PA-013's "verify information before publication" is functionally the same shape of problem WO-020/WO-023's predecessor domains already solved — unverified articles must not appear in default discovery until a Steward or Administrator reviews them. `VerificationStatus` was designed from the start to be domain-agnostic (ADR-006 Decision 2); reusing it here for a fourth domain (after Resources, Opportunities, Organizations) is exactly the kind of "reuse existing infrastructure" outcome that design choice was made to enable, not an accidental coincidence.

---

### 2. `KnowledgeArticleRevision` is the one genuinely new capability — a pre-edit snapshot model, not a full temporal-table system

**Decision:** Before any *substantive* edit (a change to `title`, `summary`, `content`, or `category`), `KnowledgeService.update()` writes a `KnowledgeArticleRevision` row snapshotting the article's pre-edit state at its current `version` number, then increments `KnowledgeArticle.version`. Non-substantive edits (tags, source URL) do not create a revision. `@@unique([articleId, versionNumber])` makes the revision sequence append-only and gap-free.

**Rationale:** PA-013 explicitly requires "track revisions and version history" — the one Core Responsibility with no precedent anywhere else in the codebase. A full temporal/audit-log table (snapshotting *every* field change, including moderation metadata) would be significantly more machinery than "version history" actually implies, and no other domain in this codebase maintains one (ADR-004 §7's structured-logging-as-interim-audit-trail remains the platform-wide position). Scoping revisions to the four fields a reader would recognize as "the content of the article" — not `status`/`verificationStatus`/`rejectionReason`, which already have their own workflow-level history via `dateLastVerified`/logs — keeps the feature proportional to what was asked for. The pre-edit-snapshot design (rather than post-edit) means the live row is always the current version and the revision table is purely historical, avoiding a redundant "is this the current version" flag.

---

### 3. Simplified authorship fields: `authorId` + `lastUpdatedById`, not Resource's four-field `ownerId`/`submittedById`/`createdById`/`lastUpdatedById` quadruple

**Decision:** `KnowledgeArticle` carries two loose (no-FK) audit pointers — `authorId` and `lastUpdatedById` — rather than replicating Resource's four overlapping fields.

**Rationale:** Resource's four-field shape exists because Resources can be *submitted on behalf of* an organization by a different person than who *manages* it day-to-day (`submittedById` vs `ownerId`), a distinction that matters for Business Portal integration. Knowledge articles have no equivalent second party — the author who writes an article is also the one accountable for it, and `createdById`/`submittedById`/`ownerId` would all be identical for every row in practice. Two fields capture everything the domain actually needs: who wrote it (authorization + attribution) and who last touched it (audit trail), without carrying three redundant copies of the same UUID on every insert. Both remain loose pointers with no FK, consistent with `Resource.ownerId` (ADR-006 §3) — authorship is attribution, not a relational identity requiring referential integrity.

---

### 4. Second real Communication System integration call site: author notification on verify/reject

**Decision:** `KnowledgeService.verify()` and `.reject()` each call `NotificationsService.notify()` (category `KNOWLEDGE`, a new, additive `NotificationCategory` enum value) to notify the article's author of the verification-workflow outcome, using a `dedupeKey` of `${type}:${articleId}:${version}` so a retried call never double-notifies.

**Rationale:** ADR-012 Decision 4 deliberately deferred wiring `notify()` into *already-shipped* domains (Stewardship, Business Portal, etc.) to avoid touching stable, tested code for a WO whose job was building the notification infrastructure itself, not consuming it. Knowledge System is different: it is being built *now*, in this WO, so wiring its own natural notification point (an author learning their submission was verified or rejected) from day one is not a retrofit — it is the domain's own lifecycle, authored alongside the rest of the service in the same commit. This is deliberately the second proven real call site (after WO-026's Announcements fan-out), directly validating ADR-012 Decision 3's design goal: a new domain can mint its own `NotificationCategory`/`type` values and call the same `notify()` method every other domain uses, with zero changes to the Communication System itself beyond one additive enum value.

---

### 5. Default listing is VERIFIED-only; unverified articles remain directly fetchable by ID/ref

**Decision:** `GET /knowledge/articles` defaults `verificationStatus` to `VERIFIED` when the caller doesn't specify otherwise — identical to Resources' default. `GET /knowledge/articles/:id` and `/by-ref/:ref` have no such filter; any unverified article is directly fetchable if you already know its ID.

**Rationale:** Matches PA-013's "publish unverified information as authoritative" prohibition (Architectural Boundaries) — the *discovery* surface (search/list, and therefore what AI systems and casual readers see by default) only ever surfaces trusted content, while direct-ID access remains available for the author, reviewers, and anyone with a specific link (e.g., a Steward reviewing a `PENDING_REVIEW` submission via a shared URL) — identical precedent to Resources (ADR-006) and Organizations (ADR-010).

---

## Risks

| Risk | Mitigation |
|---|---|
| `KnowledgeArticleRevision` only snapshots title/summary/content/category — a change to `tags` or `sourceUrl` alone leaves no historical record | Deliberate scope decision (Decision 2): those fields are metadata, not "the content" a reader would consider a distinct version; acceptable given PA-013 asks for "version history," not a full field-level audit log. |
| No search relevance ranking or scoring (unlike Resources' `confidenceScore`/`freshnessScore`) | Not requested by PA-013's Core Responsibilities, which ask for "search and retrieval," not ranking; can be added later if search quality becomes a real product need, following the same YAGNI discipline applied elsewhere (ADR-009 Decision 2). |
| Article creation and `articleRef` assignment are two sequential, non-transactional writes (no `$transaction`) | Consistent with the existing codebase-wide precedent (ADR-006 §Risks, ADR-010 §Risks — no service anywhere uses `$transaction`); a failure between the two writes leaves an article with a `null` `articleRef`, recoverable by re-running `setRef`, not a corrupted invariant. |
| `NotificationCategory.KNOWLEDGE` has exactly one producer (this domain) and one real notification type pair (`verified`/`rejected`) | Expected for a newly-built domain — mirrors how `ANNOUNCEMENT` had exactly one producer (Announcements) when WO-026 shipped it; more notification types can be added as free-text `type` values with zero further schema change (ADR-012 Decision 3). |

---

## Future Extension Points

- AI Intelligence Engine and Academy consuming verified Knowledge articles as "AI knowledge context" / "educational content" (PA-013 Outputs) — both are unbuilt; Knowledge System's read endpoints require no changes to serve them once they exist.
- Revision *rollback* (restore a prior version as the live row) — currently revisions are read-only history; restoring one is a manual copy-paste via `PATCH` today, not a dedicated endpoint.
- Search relevance scoring or full-text-search-engine integration (Postgres `tsvector`/`pg_trgm`) if `contains`-based search proves insufficient at scale.
- A `helpfulness`/usage-analytics layer, if member-facing article ratings become a real product need.
- Additional `NotificationCategory.KNOWLEDGE` notification types (e.g., "an article you follow was updated") once a following/subscription mechanism exists for any domain.
