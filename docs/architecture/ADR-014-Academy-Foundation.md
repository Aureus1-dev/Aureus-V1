# ADR-014 — Academy Foundation

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-07-15 |
| Work Order | WO-028 |
| Authority | PA-010, PA-018, ADR-003, ADR-006, ADR-010, ADR-012, ADR-013 |

---

## Context

PA-010 (Academy) is one of the twelve Version 1 systems named in PA-020, and — per `docs/releases/version-1-readiness.md`'s post-WO-027 audit — the last remaining backend domain not blocked on a founder scope decision. The founder's canonical WO-026 decision established two governing constraints for this domain before any engineering began: the Academy must serve both members and stewards while staying modular and extensible, and the Media Center (steward-authored video/document/image/audio content) is not a standalone domain — it belongs inside the Academy as the "Steward Content Studio."

Academy is the largest single domain built so far — five sub-domains (Courses, Learning Paths, Enrollments/Certifications, Steward Content Studio media) sharing one module, four cross-domain integrations (Member Core, Stewardship, Communication, Knowledge, Business Portal), and the first domain to combine the verification-workflow pattern (Resources → Opportunities → Organizations → Knowledge, now a fifth consumer) with a genuinely new capability (auto-completion and certification issuance) in the same Work Order.

---

## Decisions

### 1. One `AcademyModule`, four internal sub-domains, reusing the verification-workflow shape a fifth time

**Decision:** Academy lives in `apps/api/src/academy/` as a single `AcademyModule` (mirroring Communication System's one-module/many-sub-domains shape, ADR-012) with four internal sub-domain folders: `courses/` (Courses, Modules, Lessons), `learning-paths/` (LearningPath, LearningPathCourse), `enrollments/` (Enrollment, LessonProgress, Certification), and `media/` (MediaAsset, CourseMedia — the Steward Content Studio). `Course` and `LearningPath` each reuse the shared `VerificationStatus` enum and the `submit-for-review` → `verify`/`reject`, plus `archive` action-endpoint shape verbatim from Resources (WO-020) → Opportunities → Organizations (WO-024) → Knowledge (WO-027) → now Academy — the fifth independent domain to adopt this exact pattern with zero modification to the shared enum or workflow shape.

**Rationale:** The founder's WO-026 decision that the Media Center belongs *inside* Academy, not beside it, settles the module-boundary question directly — one bounded context, not two. Within that boundary, Courses/Learning Paths/Enrollments/Media are cohesive but distinct concerns (content authoring vs. curated sequencing vs. member participation vs. asset storage), justifying separate sub-folders and services without justifying separate NestJS modules — the same reasoning Communication System applied to Notifications/Preferences/Announcements/Messaging. Reusing `VerificationStatus` for a fifth domain is direct, continuing evidence the enum was designed correctly as domain-agnostic infrastructure (ADR-006 Decision 2), not a one-off.

---

### 2. A new, domain-specific `AcademyContentStatus` enum shared by two sibling entities — the first shared status enum in the codebase

**Decision:** `Course` and `LearningPath` both carry an `AcademyContentStatus` (`DRAFT`/`ACTIVE`/`ARCHIVED`) alongside their `VerificationStatus`, deliberately named generically rather than `CourseStatus`/`LearningPathStatus`, because it is shared by both sibling entities within the same domain.

**Rationale:** Every prior domain minted its own single-purpose status enum (`KnowledgeArticleStatus`, `OrganizationStatus`, etc.) because each had exactly one entity needing a lifecycle-status field. Academy is the first domain with two independent, top-level content types (`Course`, `LearningPath`) that share an identical DRAFT/ACTIVE/ARCHIVED lifecycle shape — minting two structurally-identical enums would be pure duplication with no semantic gain, so one shared enum is the correct generalization, named for what it represents (content lifecycle status) rather than which entity happens to use it.

---

### 3. A narrower, WO-026-directed content-authority role set: Steward/Admin only, no Organization/Business representative

**Decision:** `ACADEMY_STAFF_ROLES = [STEWARD, PLATFORM_ADMINISTRATOR, SYSTEM_ADMINISTRATOR]` — used identically for both content creation (courses, learning paths, media) and verification-workflow moderation. This deliberately excludes `ORGANIZATION_REPRESENTATIVE`/`BUSINESS_REPRESENTATIVE`, unlike Resources'/Knowledge's four-role `CREATOR_ROLES`.

**Rationale:** The founder's WO-026 canonical decision text names only "Stewards and Platform Administrators" as authorized to create, manage, review, and publish Academy and public-facing media content — a deliberate, explicit narrowing from the wider creator sets used elsewhere, not an oversight. Because the same role set already equals what Resources/Knowledge use as their *moderator* set, no separate narrower moderator subset is needed here — creation and moderation authority collapse into one role list for this domain.

---

### 4. Versioned curriculum via a pre-edit revision snapshot, structurally identical to `KnowledgeArticleRevision`

**Decision:** `CourseRevision` snapshots a course's pre-edit `title`/`shortDescription`/`fullDescription` at its current `version` number immediately before a substantive edit (the same three-field-equivalent trigger set Knowledge uses), then `Course.version` increments. `@@unique([courseId, versionNumber])` keeps the history append-only and gap-free. `LearningPath` deliberately has no revision model.

**Rationale:** PA-010 explicitly requires "versioned curriculum," the exact shape of problem ADR-013 Decision 2 already solved for Knowledge articles — reusing that design (rather than a full temporal table) keeps the feature proportional and consistent. `LearningPath` is a curated *sequence* of already-versioned `Course`s, not itself a body of written content a reader would expect version history for — its "content" is the ordering, which `LearningPathCourse.position` already makes fully reconstructable from current state, so a revision model would track information nobody asked for.

---

### 5. Enrollment and completion are Course-scoped only — `LearningPath` has no enrollment or aggregate completion of its own

**Decision:** `Enrollment` has a real FK to `Course`, not `LearningPath`. Working through every course in a learning path is tracked implicitly (per-course enrollments), not via a second, parallel path-level completion/progress model.

**Rationale:** Building genuine path-level completion aggregation (rolling up N course completions into a path-completion state, handling partial progress, path-level certification) is a second, materially different feature from course completion — PA-010's Core Responsibilities name "course completion" and "progress tracking" without describing path-level aggregate completion as a distinct requirement. Scoping Enrollment to Course keeps the auto-completion/certification logic (Decision 7) singular and well-tested rather than duplicated across two levels; path-level aggregation is recorded below as a Future Extension Point rather than silently omitted.

---

### 6. Circular-dependency avoidance: Stewardship integration is role-based gating only, not a `COURSE` recommendation type

**Decision:** Extending `StewardshipRecommendationType` with a `COURSE` value (letting stewards recommend specific courses to members, mirroring the existing `OPPORTUNITY`/`RESOURCE` recommendation types) was evaluated and **dropped from this Work Order's scope**. "Integrate with the Stewardship System" is instead satisfied entirely by `ACADEMY_STAFF_ROLES` including `STEWARD` for content authority and moderation.

**Rationale:** Implementing course recommendations would require `StewardshipModule` to import `AcademyModule` (to validate a recommended course exists), but `AcademyModule` already imports `CommunicationModule` (for `notify()`), and `CommunicationModule` already imports `StewardshipModule` — producing a hard cycle: `Stewardship → Academy → Communication → Stewardship`. Rather than restructuring already-shipped, stable module boundaries to accommodate one new feature (mirroring the ADR-012 Decision 4 precedent of not touching already-shipped domains' code for a new WO's convenience), this integration is deferred to a Future Extension Point. Stewardship integration is not skipped — `STEWARD` already sits in `ACADEMY_STAFF_ROLES`, giving stewards real content and moderation authority over the Academy today — only the *recommendation-linking* feature specifically is deferred.

---

### 7. Course completion and steward-certification issuance are one code path, triggered by lesson-progress aggregation

**Decision:** `EnrollmentsService.updateLessonProgress()` upserts a `LessonProgress` row and, whenever that call results in a lesson reaching `COMPLETED`, checks whether every `Lesson` in the course now has a `COMPLETED` `LessonProgress` row for that enrollment. If so, `Enrollment.status` auto-transitions to `COMPLETED` (`completedAt` set), and — if `Course.grantsCertification` is `true` and no `Certification` already exists for that (user, course) pair — a `Certification` row is auto-created with a sequence-numbered `certificateRef` (`AUR-CERT-000001`, matching the platform-wide reference-number pattern), and the learner is notified of both the completion and the certification via `NotificationsService.notify()`.

**Rationale:** PA-010 names "course completion," "progress tracking," and "steward certification foundation" as three separate Core Responsibilities, but they are not three separate mechanisms — a certification is definitionally *proof of course completion*, and completion is definitionally *the aggregate of lesson-level progress*. Implementing them as one triggered code path (rather than three independently-invoked ones) avoids a class of bug where completion and certification could drift out of sync, and keeps the "foundation" honest: this is a genuinely functional certification issuance flow, not a stub, while deliberately not building renewal, expiration, or external verification (Known Limitations) which PA-010 does not ask for at V1.

---

### 8. Third real Communication System integration call site, and zero-migration proof of `NotificationCategory.ACADEMY`'s forward provisioning

**Decision:** `CoursesService`, `LearningPathsService`, and `EnrollmentsService` each call `NotificationsService.notify()` — for verify/reject outcomes (mirroring Knowledge) and, newly, for course-completion and certification-issuance events — using `NotificationCategory.ACADEMY`, which required **zero schema migration** because it was added speculatively in WO-026 (ADR-012 Decision 3, alongside `POD` and `AI_GUIDANCE`) specifically anticipating this moment.

**Rationale:** This is the third proven real call site (after Announcements/WO-026 and Knowledge/WO-027), and specifically validates the forward-provisioning design choice made two Work Orders ago: a category value minted before its consuming domain existed required no migration, no code change to `NotificationCategory`'s definition, and no coordination with Communication System's owners — exactly the "future domains can use this without duplicating infrastructure" goal ADR-012 Decision 3 was designed around, now demonstrated for a third, independently-built domain.

---

### 9. Storage abstraction only — `MediaAsset.storageRef` is an opaque pointer, no cloud provider implemented

**Decision:** `MediaAsset` stores `storageRef: String` — an opaque key/URL with no format contract enforced beyond being a non-empty string — plus type/title/description/mimeType/sizeBytes/durationSeconds metadata. No upload endpoint, no signed-URL generation, no S3/GCS/Azure Blob SDK integration exists in this Work Order.

**Rationale:** The WO text is explicit: "Upload references (storage abstraction only; do not implement cloud storage providers yet)." Building a real upload flow requires a founder decision this WO was not asked to make (which provider, direct-upload vs. server-proxied, CDN strategy) — implementing one anyway would be scope creep into a decision that belongs to a future, dedicated Work Order. `storageRef` as a bare string is the minimal abstraction that lets every other Academy feature (course-media relationships, certificate display, lesson video attachment) be built and tested today against a stable contract, with the actual storage backend swappable later with zero change to any consuming code.

---

## Risks

| Risk | Mitigation |
|---|---|
| No cloud storage provider means `storageRef` values are currently unvalidated, opaque strings a client could point at anything | Deliberate scope decision (Decision 9); acceptable because the WO explicitly excludes storage provider implementation, and no functionality in this WO depends on `storageRef` being dereferenceable — only on it existing and being attributable. |
| `LearningPath` has no aggregate completion — a learner working through an entire path sees only individual course completions, not "path progress" | Deliberate scope decision (Decision 5); recorded below as a Future Extension Point rather than silently omitted. |
| Stewardship's course-recommendation integration was dropped to avoid a circular module dependency | Deliberate, documented decision (Decision 6); role-based Stewardship integration (`STEWARD` in `ACADEMY_STAFF_ROLES`) remains fully functional today. |
| Certification has no renewal, expiration, or external-verification mechanism | Explicitly a "foundation" per the WO text, not a complete certification-management system; PA-010 does not name those as V1 requirements. |
| Course/module/lesson creation, ref assignment, and revision-snapshot writes are multiple sequential, non-transactional writes (no `$transaction`) | Consistent with the existing codebase-wide precedent (ADR-006 §Risks through ADR-013 §Risks — no service anywhere uses `$transaction`); a failure mid-sequence leaves a recoverable partial state (e.g. a `null` `courseRef`), not a corrupted invariant. |

---

## Future Extension Points

- Learning-path-level aggregate completion/progress tracking, rolling up per-course `Enrollment` completions into a path-level state (Decision 5).
- `StewardshipRecommendationType.COURSE` — stewards recommending specific courses to members — once a non-circular integration path exists, or once Stewardship's own module boundary is revisited (Decision 6).
- Real cloud storage provider integration (upload endpoints, signed URLs, a CDN strategy) behind the existing `storageRef` abstraction (Decision 9) — swappable with zero change to `CourseMedia`/`MediaAsset` consumers.
- Certification renewal, expiration, and external verification/sharing (e.g. a public verification URL) (Decision 7).
- AI Intelligence Engine consuming Course/Lesson content as guided-learning context, once that domain exists (PA-010/PA-006 adjacency, mirroring the Knowledge-System-as-AI-context extension point named in ADR-013).
- Pods consuming Learning Paths as shared group-learning curricula, once Pods exists (PA-009/PA-010 adjacency).
