# WO-028 — Academy Foundation

| Field | Value |
|---|---|
| Work Order Number | WO-028 |
| Title | Academy Foundation (PA-010) |
| Status | Complete |
| Priority | High (the only remaining canonical backend domain unblocked by the founder's WO-028 directive) |
| Date | 2026-07-15 |

---

## Objective

Implement the Academy Foundation — Courses, Learning Paths, Modules, Lessons, Enrollments, Progress tracking, Course completion, a steward-certification foundation, versioned curriculum, Draft/Published lifecycle, and role-based permissions — with the Steward Content Studio (Media Center) built inside the Academy as the founder's WO-026 canonical decision requires, integrating with Member Core, Stewardship, Communication, Knowledge, and Business Portal without duplicating any existing authorization, notification, or repository logic.

## Scope

- `Course`: title/descriptions, `LearningDomain` (10 values), `AcademyContentStatus`/`VerificationStatus` dual lifecycle, versioned via `CourseRevision` pre-edit snapshots, optional Business Portal (`organizationId`) attribution, `grantsCertification` flag.
- `Module`/`Lesson`: structural children of `Course`, nested CRUD with course-ownership-derived authorization, `Lesson.relatedArticleId` optional Knowledge System integration.
- `LearningPath`/`LearningPathCourse`: a curated, ordered sequence of `Course`s, sharing `Course`'s verification-workflow and `AcademyContentStatus` shape; no learning-path-level enrollment/completion (Course-scoped only — see ADR-014 Decision 5).
- `Enrollment`/`LessonProgress`: real-FK member participation in a `Course`, with lesson-by-lesson progress tracking and auto-completion when every lesson reaches `COMPLETED`.
- `Certification`: auto-issued on course completion when `Course.grantsCertification` is true, sequence-numbered `certificateRef` (`AUR-CERT-000001`).
- Steward Content Studio: `MediaAsset` (video/document/image/audio/attachment metadata with an opaque `storageRef` — no cloud provider implemented) and `CourseMedia` (course/lesson media relationships), Steward/Admin-only.
- Full CRUD + verification workflow for `Course`/`LearningPath` (create, list/search default VERIFIED-only, get by ID/ref, update with revision tracking, soft-delete, submit-for-review/verify/reject/archive).
- Course/learning-path-author and Steward/Admin notifications via `NotificationsService.notify()` on verify/reject, course completion, and certification issuance — the third real Communication System integration call site.
- Full Swagger documentation (`academy` tag).
- Unit, Prisma integration, and end-to-end automated tests.

## Out of Scope

- Real cloud storage provider integration (upload endpoints, signed URLs) — explicitly excluded by the WO text; `MediaAsset.storageRef` is an opaque reference only.
- Learning-path-level aggregate completion/progress tracking — Enrollment is Course-scoped only (ADR-014 Decision 5).
- `StewardshipRecommendationType.COURSE` (stewards recommending specific courses) — would introduce a circular module dependency; role-based Stewardship integration only (ADR-014 Decision 6).
- Certification renewal, expiration, or external verification — a genuine but minimal foundation, not a complete certification-management system.
- Frontend implementation — per the founder's standing backend-before-frontend directive.
- Any change to `KnowledgeModule`/`OrganizationsModule`/`CommunicationModule`/`StewardshipModule` business logic — Academy integrates with each via existing exported repository tokens/services only.

## Dependencies

- WO-026 (Communication System) — supplies `NotificationsService.notify()` and the forward-provisioned `NotificationCategory.ACADEMY` value, consumed with zero further schema migration.
- WO-027 (Knowledge System) — supplies `KNOWLEDGE_ARTICLE_REPOSITORY`, consumed for `Lesson.relatedArticleId` validation.
- WO-024 (Business Portal) — supplies `ORGANIZATION_REPOSITORY`, consumed for `Course.organizationId` validation.
- WO-020 (Resource Directory) — supplies the verification-workflow pattern (shared `VerificationStatus`, `submit-for-review`/`verify`/`reject`/`archive` action-endpoint shape) reused for a fifth domain.

## Source Documents

- PA-010 — Academy Architecture
- PA-018 — Permissions & Access Architecture
- ADR-003 — User Module (layering pattern)
- ADR-006 — Resource Directory (verification-workflow pattern reused a fifth time)
- ADR-012 — Communication System (`notify()` integration point, `NotificationCategory.ACADEMY` forward provisioning)
- ADR-013 — Knowledge System (revision-snapshot pattern reused for `CourseRevision`)
- Founder's WO-026 canonical decision text — Steward Content Studio placement, `ACADEMY_STAFF_ROLES` scope

## Deliverables

- ADR-014 — Academy Foundation
- `apps/api/src/academy/**` (module, four sub-domain services/controllers/repositories/DTOs, unit + integration + e2e tests)
- Prisma migrations `add_academy`, `add_certification_sequence_number`
- `docs/verification/WO-028-OPERATIONAL-VERIFICATION.md`
- `docs/releases/version-1-readiness.md` (updated, not replaced)

## Files Created

- `prisma/migrations/20260715123745_add_academy/`
- `prisma/migrations/20260715140000_add_certification_sequence_number/`
- `apps/api/src/academy/academy.module.ts`
- `apps/api/src/academy/academy.integration.spec.ts`
- `apps/api/src/academy/academy.e2e.spec.ts`
- `apps/api/src/academy/common/academy-roles.util.ts`
- `apps/api/src/academy/courses/{courses,modules,lessons}.{service,controller}.ts` (+ specs)
- `apps/api/src/academy/courses/dto/{create,update}-{course,module,lesson}.dto.ts`, `reject-course.dto.ts`, `list-courses-query.dto.ts`, `{course,module,lesson}-response.dto.ts`, `paginated-courses-response.dto.ts`, `revision-response.dto.ts`
- `apps/api/src/academy/courses/repositories/{course,course-revision,module,lesson}.repository.interface.ts` + Prisma implementations
- `apps/api/src/academy/learning-paths/{learning-paths,path-courses}.{service,controller}.ts` (+ specs)
- `apps/api/src/academy/learning-paths/dto/{create,update,reject}-learning-path.dto.ts`, `list-learning-paths-query.dto.ts`, `learning-path-response.dto.ts`, `paginated-learning-paths-response.dto.ts`, `add-path-course.dto.ts`, `reorder-path-course.dto.ts`, `path-course-response.dto.ts`
- `apps/api/src/academy/learning-paths/repositories/{learning-path,learning-path-course}.repository.interface.ts` + Prisma implementations
- `apps/api/src/academy/enrollments/{enrollments,certifications}.{service,controller}.ts` (+ specs)
- `apps/api/src/academy/enrollments/dto/{enrollment,lesson-progress,certification}-response.dto.ts`, `update-lesson-progress.dto.ts`
- `apps/api/src/academy/enrollments/repositories/{enrollment,lesson-progress,certification}.repository.interface.ts` + Prisma implementations
- `apps/api/src/academy/media/{media-assets,course-media}.{service,controller}.ts` (+ specs)
- `apps/api/src/academy/media/dto/{create,update}-media-asset.dto.ts`, `list-media-assets-query.dto.ts`, `media-asset-response.dto.ts`, `paginated-media-assets-response.dto.ts`, `add-course-media.dto.ts`, `course-media-response.dto.ts`
- `apps/api/src/academy/media/repositories/{media-asset,course-media}.repository.interface.ts` + Prisma implementations
- `docs/architecture/ADR-014-Academy-Foundation.md`
- `docs/work-orders/WO-028-Academy-Foundation.md` (this file)
- `docs/verification/WO-028-OPERATIONAL-VERIFICATION.md`

## Files Modified

- `prisma/schema.prisma` — `Course`, `CourseRevision`, `Module`, `Lesson`, `LearningPath`, `LearningPathCourse`, `Enrollment`, `LessonProgress`, `Certification`, `MediaAsset`, `CourseMedia` models; `AcademyContentStatus`, `LearningDomain`, `EnrollmentStatus`, `LessonProgressStatus`, `MediaType` enums; back-relations on `User`/`Organization`/`KnowledgeArticle`.
- `apps/api/src/app.module.ts` — registers `AcademyModule`.
- `apps/api/src/main.ts` — Swagger `academy` tag.
- `docs/releases/version-1-readiness.md` — WO-028 marked complete, Academy moved off the Remaining Backend Domains list, scores recomputed, next WO recommendation updated.

## Database Changes

Two migrations: `add_academy` (eleven new tables, five new enums, back-relations on `User`/`Organization`/`KnowledgeArticle`, no changes to any existing table's columns) and `add_certification_sequence_number` (adds `Certification.sequenceNumber`, matching the platform-wide `AUR-XXX-000001` reference-number pattern already used by every other ref-bearing model — a gap in the initial schema design caught and corrected before this domain shipped).

## API Changes

New: `POST/GET /academy/courses`, `GET /academy/courses/by-ref/:ref`, `GET /academy/courses/:id`, `GET /academy/courses/:id/revisions`, `PATCH/DELETE /academy/courses/:id`, `POST /academy/courses/:id/{submit-for-review,verify,reject,archive}`, `POST/GET /academy/courses/:courseId/modules`, `PATCH/DELETE /academy/courses/:courseId/modules/:id`, `POST/GET /academy/modules/:moduleId/lessons`, `PATCH/DELETE /academy/modules/:moduleId/lessons/:id`, `POST/GET /academy/learning-paths`, equivalent learning-path verification-workflow/CRUD routes, `POST/GET/PATCH/DELETE /academy/learning-paths/:learningPathId/courses[/:courseId]`, `POST /academy/courses/:courseId/enroll`, `GET /academy/enrollments/me`, `GET /academy/enrollments/:id[/progress]`, `PATCH /academy/enrollments/:id/lessons/:lessonId/progress`, `GET /academy/certifications/me`, `GET /academy/certifications/:id`, `POST/GET/PATCH/DELETE /academy/media[/:id]`, `GET /academy/media/by-ref/:ref`, `POST/GET/DELETE /academy/courses/:courseId/media[/:id]`.

## Security Requirements

- All mutating endpoints require `JwtAuthGuard`; course/learning-path/media creation and moderation additionally require `RolesGuard` with `ACADEMY_STAFF_ROLES` (`STEWARD`/`PLATFORM_ADMINISTRATOR`/`SYSTEM_ADMINISTRATOR` — a deliberately narrower set than Resources'/Knowledge's four-role creator set, per the founder's WO-026 canonical decision, ADR-014 Decision 3).
- Course/module/lesson/learning-path/media management requires the caller to be the resource's author/uploader, or hold `ACADEMY_STAFF_ROLES` — authorship is always resolved server-side from the loaded entity, never trusted from the request body.
- Enrollment/certification access is owner-or-`ACADEMY_STAFF_ROLES`-only — a learner may only view their own enrollments/progress/certifications, mirroring Notifications' `assertOwnerOrAdmin` shape (WO-026).
- Course completion and certification issuance always target the enrollment's real `userId`, never body-supplied; certification issuance is idempotent (checks for an existing `Certification` row before creating another).
- Default course/learning-path listing excludes unverified content from general discovery (PA-010's "trustworthy by default" boundary, matching the Resources/Knowledge precedent); direct-ID/ref access remains available to authors and reviewers.

## Testing Requirements

- Unit: 9 spec files (69 tests) — `CoursesService` (authorization, revision-creation-vs-not, full verification-workflow, organization-existence validation), `ModulesService`/`LessonsService` (nested course-ownership-derived authorization, Knowledge-article-existence validation), `LearningPathsService`/`PathCoursesService` (verification workflow, ordered-course-management authorization/conflict handling), `EnrollmentsService` (enroll/duplicate-conflict, access control, the full auto-completion + certification-issuance branch tree including the "already completed" idempotency guard and the "course does not grant certification" branch), `CertificationsService`/`MediaAssetsService`/`CourseMediaService` (ownership authorization, existence validation).
- Integration: `academy.integration.spec.ts` (7 tests) — real PostgreSQL, no mocks: the unique `courseRef` constraint, the `[courseId, versionNumber]` revision constraint, the nested `module.courseId` lesson query ordered across two relation levels, ordered `LearningPathCourse` positioning with uniqueness enforcement, the unique `(userId, courseId)` `Enrollment`/`Certification` constraints with idempotent `LessonProgress` upserts, and the `MediaAsset`/`CourseMedia` storage-abstraction relationship.
- End-to-end: `academy.e2e.spec.ts` (23 tests) — full HTTP lifecycle via Supertest against a booted application: creation role-gating (401/403), the complete course lifecycle (author → modules → lessons → revision-on-substantive-edit → submit → verify → default-listing → by-ref), the complete enrollment lifecycle (enroll → duplicate-conflict → cross-user access denial → partial-progress-does-not-complete → last-lesson-completes-and-issues-certification-and-notifies → archive), the complete learning-path lifecycle (create → sequence two courses → duplicate-conflict → reorder → remove), and the complete media lifecycle (role-gated registration → course attachment → listing). The `learner` persona is a real registered user via `/auth/register` (required — `Enrollment.userId`/`Certification.userId` carry real FKs, per ADR-014); author/moderator personas remain synthetic self-minted tokens, matching the WO-020/WO-027 e2e precedent (`Course.authorId` is a loose pointer).

## Acceptance Criteria

- [x] An unauthenticated caller cannot create, update, or manage any Academy resource (401).
- [x] A caller without `ACADEMY_STAFF_ROLES` cannot create a course, learning path, or media asset (403).
- [x] A non-author, non-privileged caller cannot update/delete/submit/archive another author's course or learning path (403).
- [x] Only `ACADEMY_STAFF_ROLES` may verify or reject a course/learning path (403 otherwise).
- [x] `GET /academy/courses` and `/academy/learning-paths` default to `VERIFIED`-only; unverified content is directly fetchable by id/ref.
- [x] A substantive course edit (title/descriptions) creates exactly one `CourseRevision` snapshot and increments `version`; a non-substantive edit does not.
- [x] Modules/lessons can only be managed by the parent course's author or `ACADEMY_STAFF_ROLES`.
- [x] `Lesson.relatedArticleId` and `Course.organizationId` are validated against the real Knowledge/Organization repositories when supplied (404 if missing).
- [x] A learner can enroll in a verified course exactly once (409 on duplicate); only the enrollment's owner or `ACADEMY_STAFF_ROLES` may view it.
- [x] Completing all of a course's lessons auto-transitions the enrollment to `COMPLETED` and, if `grantsCertification` is true, auto-issues exactly one `Certification` with a sequence-numbered `certificateRef`.
- [x] Course completion and certification issuance each notify the learner via the Communication System (`category: ACADEMY`).
- [x] Learning-path courses can be added in order, reordered, and removed, with duplicate-add returning 409.
- [x] Media assets can only be created/managed by `ACADEMY_STAFF_ROLES`; `storageRef` is stored as an opaque reference with no storage-provider dereferencing.
- [x] All existing tests continue to pass; new tests cover every new branch.
- [x] `tsc --noEmit`, `eslint`, `jest` (full monorepo suite, serial), `prisma migrate deploy`, and `pnpm run build` are clean for the whole monorepo.
- [x] Live verification confirms the compiled application boots with zero DI errors and all 33 Academy routes registered against a running database.

## Definition of Done

Met — see `docs/verification/WO-028-OPERATIONAL-VERIFICATION.md`.

## Known Limitations

- `MediaAsset.storageRef` is an opaque, unvalidated string — no cloud storage provider is implemented (ADR-014 Decision 9, explicitly out of scope per the WO text).
- `LearningPath` has no aggregate completion/progress tracking of its own — only the per-course `Enrollment` completions that make it up (ADR-014 Decision 5).
- `StewardshipRecommendationType.COURSE` was not built — Stewardship integration is role-based gating only, to avoid a circular module dependency (ADR-014 Decision 6).
- `Certification` has no renewal, expiration, or external-verification mechanism — a genuine but minimal foundation (ADR-014 Decision 7).
- `NotificationCategory.ACADEMY` now has three producers (verify/reject on Course and LearningPath, plus completion/certification on Enrollment) but Academy events are not yet consumed by Stewardship recommendations or any AI system, both unbuilt.

## Recommended Next Work Order

See `docs/releases/version-1-readiness.md` § Recommended Next Work Order for the current, canonical recommendation.
