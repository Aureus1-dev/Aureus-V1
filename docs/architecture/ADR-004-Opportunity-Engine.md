# ADR-004 — Opportunity Intelligence Engine

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-14 |
| Work Order | Phase 2 |
| Authority | PA-007, PA-016, PA-018, PA-019, PA-020 |

---

## Context

Phase 2 implements the Opportunity Intelligence Engine as defined in PA-007. The engine must discover, classify, verify, score, and surface opportunities to members. It also provides the data foundation for future AI-powered recommendations.

---

## Decisions

### 1. Stable Human-Readable ID (AUR-OPP-XXXXXX)

**Decision:** Every Opportunity stores a `sequenceNumber Int @default(autoincrement())` and an `opportunityRef String? @unique`. The service computes the reference immediately after insert:

```typescript
const opportunityRef = `AUR-OPP-${opp.sequenceNumber.toString().padStart(6, '0')}`;
await this.repo.setRef(opp.id, opportunityRef);
```

**Rationale:** A stable, human-readable ID is essential for support tickets, analytics, and future integrations. The two-step insert+update pattern is reliable and avoids database trigger complexity. The opportunityRef is nullable only during the millisecond window between insert and update.

---

### 2. Verification Workflow as Service State Machine

**Decision:** Five states — `DRAFT → PENDING_REVIEW → VERIFIED → REJECTED (→ DRAFT) → ARCHIVED`. Transitions enforced in the service layer, not the database.

**Rationale:** Business rules (which states allow which transitions) belong in the application layer where they can be tested and modified without migrations. Only VERIFIED opportunities appear in the default public listing.

---

### 3. Confidence Score: Deterministic, Formula-Based (V1)

**Decision:** Confidence is computed from observable data quality signals. See scoring service for formula.

| Signal | Points |
|---|---|
| 7 required fields complete | 0–40 |
| applicationUrl present | 10 |
| location present | 5 |
| country present | 5 |
| deadline present | 5 |
| benefitAmount present | 5 |
| tags present | 5 |
| VERIFIED status | 25 |
| **Max** | **100** |

**Rationale:** Deterministic scoring is auditable, testable, and requires no AI infrastructure. Scores are recomputed on every update so they stay fresh.

---

### 4. Freshness Score: Decay from Last Verification

**Decision:** 100 within 7 days of last verification or update; linear decay to 0 at 365 days.

**Rationale:** Simple, transparent, and aligns with data governance principles. Members can understand why a score is low. No AI required.

---

### 5. Tags as String[] (PostgreSQL Array)

**Decision:** Tags stored as `String[] @default([])` on the Opportunity model.

**Rationale:** For V1 search volumes, PostgreSQL array operators (`hasSome`, `hasEvery`) are sufficient. A normalised Tag table with a join would require additional complexity (tag management API, deduplication). This can be migrated to a normalised structure if needed.

---

### 6. Authorization Placeholder

**Decision:** The service layer accepts `createdById`, `submittedById`, and `lastUpdatedById` as required fields in DTOs. No JWT guards are applied yet.

**Rationale:** Authentication has not been implemented. The field structure is correct; guards will be added when the auth WO is executed. This is clearly documented as technical debt.

---

### 7. Audit Logging via NestJS Logger

**Decision:** Significant operations (create, verify, reject, archive) are logged with NestJS Logger at INFO level. No separate AuditLog database table in Phase 2.

**Rationale:** The user specified to use the "existing audit logging system." Since no DB-level audit system exists yet, structured logging via the built-in Logger is the correct V1 approach. A dedicated AuditLog table should be created in a future phase when the platform-wide audit infrastructure (referenced in IC-018, OAS-SEC-101) is established.

---

## Risks

| Risk | Mitigation |
|---|---|
| Two-step insert for opportunityRef creates brief null window | Acceptable for V1; could be solved with a DB trigger in a future migration |
| Email unique index is partial; opportunityRef has same risk | The null state is transient and within a single transaction scope in practice |
| No auth guards on workflow actions | Documented in technical debt; auth WO must precede production deployment |
| Tags as String[] limits tag-based analytics | Sufficient for V1; migrate to join table when tag catalog management is needed |

---

## Future Extension Points

- Replace formula-based scoring with ML-powered scoring (PA-006 AI Intelligence Engine)
- Add `GET /opportunities/recommended?userId=xxx` using stored UserInterest categories
- Migrate tags to a normalised Tag model when a tag catalog is needed
- Add pagination cursor support for large opportunity datasets
- Add geographic search (PostGIS) for location-based filtering
- Add vector similarity search when AI engine is integrated
