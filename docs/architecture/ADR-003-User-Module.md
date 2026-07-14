# ADR-003 — User Module Architecture

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-11 |
| Deciders | Engineering Lead |
| Work Order | WO-003 |

---

## Context

The Aureus Core Domain Layer (WO-002) produced an approved, production-ready Prisma schema. WO-003 delivers the first vertical slice of the API: the **User Module**. This module must be consumed by future authentication, authorisation, and profile modules, so its design choices have long-term implications.

---

## Architectural Decisions

### 1. Repository Abstraction via Injection Token

**Decision:** Define `IUserRepository` as a TypeScript interface and bind it to the injection token `USER_REPOSITORY`. The concrete implementation (`PrismaUserRepository`) is registered in `UsersModule`.

**Rationale:**
- The service layer depends on the _interface_, not on Prisma. This satisfies the Dependency Inversion Principle.
- Swapping persistence (e.g., moving to a different ORM or an in-memory store for tests) requires changing only the module binding — zero changes to service or controller.
- Unit tests mock the interface, which is simpler, faster, and has no I/O.

**Alternatives considered:**
- Direct `PrismaService` injection into the service — rejected because it couples business logic to persistence technology.
- NestJS `@InjectRepository()` with TypeORM — rejected because Prisma is already the approved ORM.

---

### 2. Composition over Inheritance for PrismaService

**Decision:** `PrismaService` wraps (composes) a `PrismaClient` instance rather than extending it. The client is exposed via `.db`.

**Rationale:**
- Prisma 7 requires a driver adapter in the `PrismaClient` constructor. Extending the class and calling `super({ adapter })` is technically possible but fragile given how Prisma 7 inlines engine setup.
- Composition is easier to mock in tests and avoids tight coupling to Prisma's internal class hierarchy.
- `@Global()` on `PrismaModule` makes `PrismaService` available throughout the application without repeated imports.

---

### 3. Soft Delete — Database-level, Repository-enforced

**Decision:** Soft deletion sets `deletedAt` on the record. Every repository read (findById, findByEmail, findAll) filters `deletedAt: null`. Hard deletion is never performed at the application layer.

**Rationale:**
- The approved domain schema already carries `deletedAt DateTime?` on all models.
- Soft deletion preserves audit trails and enables data recovery workflows.
- Centralising the `deletedAt: null` filter in the repository prevents accidental exposure of deleted data in the service/controller.

**Trade-offs:**
- Unique constraints on `email` become a future concern: a soft-deleted user with a given email blocks re-registration. This is acceptable now (no auth in scope) and can be addressed with a partial unique index or a reactivation flow in a future WO.

---

### 4. DTOs and Validation

**Decision:** Use `class-validator` decorators on DTOs. `UpdateUserDto` extends `PartialType(CreateUserDto)` from `@nestjs/swagger` to inherit validation and Swagger metadata automatically. A global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` is applied.

**Rationale:**
- `whitelist` strips unknown properties, preventing over-posting attacks.
- `forbidNonWhitelisted` returns a 400 error for unrecognised fields rather than silently ignoring them — fail-fast behaviour is preferable.
- `transform: true` allows query params to be coerced to their typed counterparts (e.g., `page` from string to number).

---

### 5. Offset-based Pagination

**Decision:** List endpoint uses page/limit offset pagination. Max limit is capped at 100.

**Rationale:**
- Offset pagination is straightforward to implement, understand, and document.
- Suitable for admin-style dashboards and moderate dataset sizes.

**Alternatives considered:**
- Cursor-based pagination — more performant at scale but significantly more complex to implement and document. Deferred to a future WO when dataset sizes warrant it.

---

### 6. Response Mapping via Static Factory

**Decision:** `UserResponseDto.fromEntity(user: User)` is a static factory that maps a Prisma `User` to the response shape.

**Rationale:**
- Centralises the entity → DTO mapping in one place.
- Keeps controllers thin (no mapping logic).
- Makes the mapping easily testable: `expect(UserResponseDto.fromEntity(user)).toMatchObject({ id: user.id, ... })`.

---

## Alternatives Considered and Rejected

| Alternative | Reason rejected |
|---|---|
| `class-transformer` `@Exclude()`/`@Expose()` + `plainToInstance` | More magic, harder to trace in test assertions |
| Extending `PrismaClient` in `PrismaService` | Fragile with Prisma 7's adapter-based constructor |
| Cursor pagination | Unnecessary complexity at this stage |
| Direct Prisma calls in the service | Violates DIP; harder to unit-test |
| Separate `CreateUserInput` / domain entity | Acceptable for larger systems; over-engineering at this scale |

---

## Future Extension Points

| Area | Extension |
|---|---|
| Authentication | `AuthModule` injects `UsersService.findByEmail()` for credential lookup |
| Authorisation | Add role-based access guards at the controller level; `UserStatus` enum already supports `SUSPENDED` |
| Profile hydration | `GET /users/:id` can be extended to `?include=profile` using query param and Prisma `include` |
| Cursor pagination | Replace offset pagination in `findAll` when dataset sizes exceed ~10k rows |
| Soft-delete uniqueness | Add partial unique index `WHERE deleted_at IS NULL` on `email` via a future migration |
| Events | Emit a `user.created` / `user.deleted` domain event via NestJS `EventEmitter2` for downstream modules |
| Email verification flow | `emailVerified` field is already present; add a token-based verification endpoint in an auth WO |

---

## Technical Debt Introduced

| Item | Risk | Mitigation |
|---|---|---|
| Soft-delete + email unique constraint | Re-registering a deleted email fails at DB level | Planned: partial unique index in future migration |
| No email-change uniqueness check in `update` | DB constraint violation surfaces as an unhandled Prisma error | Planned: add email conflict check in service `update` |
| `process.env.DATABASE_URL` accessed directly in `PrismaService` | No validation at startup | Planned: replace with `@nestjs/config` + `Joi` schema validation |
| No request logging | Difficult to trace requests in production | Planned: add `nestjs-pino` or `morgan` middleware |

---

## Consequences

- The User Module is the reference implementation for all future domain modules (Goal, Journey, Milestone, Task).
- Every future module should follow the same layering: `IXyzRepository` → `PrismaXyzRepository` → `XyzService` → `XyzController`.
- The `PrismaModule` is global, so future modules do not need to import it.
