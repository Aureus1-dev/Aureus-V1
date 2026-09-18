from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f"{path}: expected one match, found {text.count(old)} for {old[:80]!r}")
    p.write_text(text.replace(old, new, 1))


def append_before(path: str, marker: str, addition: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(marker) != 1:
        raise RuntimeError(f"{path}: expected one marker {marker!r}, got {text.count(marker)}")
    p.write_text(text.replace(marker, addition + "\n" + marker, 1))


# ---------------------------------------------------------------------------
# Prisma schema
# ---------------------------------------------------------------------------
schema = "prisma/schema.prisma"
replace_once(
    schema,
    "  CONNECTED_ACCOUNT\n  DOCUMENT\n  CALENDAR",
    "  CONNECTED_ACCOUNT\n  DOCUMENT\n  RESPONSIBILITY\n  CALENDAR",
)
replace_once(
    schema,
    '  policyVersion      String                  @default("people-step2-v2")',
    '  policyVersion      String                  @default("people-step3-v3")',
)
replace_once(
    schema,
    "  organization      Organization?          @relation(\"AuthorityRequestOrganization\", fields: [organizationId], references: [id], onDelete: Cascade)\n  capability        AuthorityCapability",
    "  organization      Organization?          @relation(\"AuthorityRequestOrganization\", fields: [organizationId], references: [id], onDelete: Cascade)\n  delegateUserId     String?                @db.Uuid\n  capability        AuthorityCapability",
)
replace_once(
    schema,
    "  @@index([capability, resourceClass, status])\n  @@index([shareScopeKey])\n}\n\nmodel AuthorityGrant",
    "  @@index([capability, resourceClass, status])\n  @@index([shareScopeKey])\n  @@index([delegateUserId, status])\n}\n\nmodel AuthorityGrant",
)
replace_once(
    schema,
    "  organization    Organization?          @relation(\"AuthorityGrantOrganization\", fields: [organizationId], references: [id], onDelete: Cascade)\n  capability      AuthorityCapability",
    "  organization    Organization?          @relation(\"AuthorityGrantOrganization\", fields: [organizationId], references: [id], onDelete: Cascade)\n  delegateUserId   String?                @db.Uuid\n  capability      AuthorityCapability",
)
replace_once(
    schema,
    "  @@index([expiresAt])\n  @@index([shareScopeKey])\n}\n\nmodel AuthorityCapabilityState",
    "  @@index([expiresAt])\n  @@index([shareScopeKey])\n  @@index([delegateUserId, status])\n}\n\nmodel AuthorityCapabilityState",
)
replace_once(
    schema,
    "  subjectUserId  String?                 @db.Uuid\n  organizationId String?                 @db.Uuid\n  capability     AuthorityCapability\n  resourceClass AuthorityResourceClass",
    "  subjectUserId  String?                 @db.Uuid\n  organizationId String?                 @db.Uuid\n  delegateUserId String?                 @db.Uuid\n  capability     AuthorityCapability\n  resourceClass AuthorityResourceClass",
)
replace_once(
    schema,
    "  @@index([result, createdAt])\n  @@index([shareScopeKey])\n}\n\n// ===========================================================================\n// Responsibility Core",
    "  @@index([result, createdAt])\n  @@index([shareScopeKey])\n  @@index([delegateUserId, createdAt])\n}\n\n// ===========================================================================\n// Household & Relationship Continuity — PEOPLE-HOUSEHOLD-001\n// Household context never grants authority by itself. All ids are linkage\n// metadata; private source-domain content is never copied into these models.\n// ===========================================================================\n\nenum HouseholdMembershipRole {\n  ORGANIZER\n  MEMBER\n}\n\nenum HouseholdMembershipStatus {\n  PENDING\n  ACTIVE\n  DECLINED\n  LEFT\n  REMOVED\n}\n\nenum HouseholdRelationshipKind {\n  PARTNER\n  PARENT_OR_GUARDIAN\n  ADULT_CHILD\n  SIBLING\n  CAREGIVER\n  CARE_RECIPIENT\n  ROOMMATE\n  OTHER\n}\n\nenum HouseholdDependencyDirection {\n  NONE\n  I_DEPEND_ON_THEM\n  THEY_DEPEND_ON_ME\n  MUTUAL\n}\n\nenum HouseholdFactProvenance {\n  REPORTED\n}\n\nmodel Household {\n  id              String   @id @default(uuid()) @db.Uuid\n  name            String\n  createdByUserId String   @db.Uuid\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n\n  @@index([createdByUserId, createdAt])\n}\n\nmodel HouseholdMembership {\n  id              String                    @id @default(uuid()) @db.Uuid\n  householdId     String                    @db.Uuid\n  userId          String                    @db.Uuid\n  role            HouseholdMembershipRole   @default(MEMBER)\n  status          HouseholdMembershipStatus @default(PENDING)\n  invitedByUserId String?                   @db.Uuid\n  joinedAt        DateTime?\n  endedAt         DateTime?\n  createdAt       DateTime                  @default(now())\n  updatedAt       DateTime                  @updatedAt\n\n  @@unique([householdId, userId])\n  @@index([userId, status, updatedAt])\n  @@index([householdId, status])\n}\n\nmodel HouseholdRelationship {\n  id              String                       @id @default(uuid()) @db.Uuid\n  householdId     String                       @db.Uuid\n  reportedByUserId String                      @db.Uuid\n  relatedUserId   String                       @db.Uuid\n  kind            HouseholdRelationshipKind\n  dependency      HouseholdDependencyDirection @default(NONE)\n  provenance      HouseholdFactProvenance      @default(REPORTED)\n  createdAt       DateTime                     @default(now())\n  updatedAt       DateTime                     @updatedAt\n\n  @@unique([householdId, reportedByUserId, relatedUserId])\n  @@index([householdId, reportedByUserId])\n  @@index([householdId, relatedUserId])\n}\n\nmodel HouseholdResponsibilityShare {\n  id                String   @id @default(uuid()) @db.Uuid\n  householdId       String   @db.Uuid\n  responsibilityId  String   @db.Uuid\n  sharedByUserId    String   @db.Uuid\n  sharedWithUserId  String   @db.Uuid\n  authorityGrantId  String   @db.Uuid\n  createdAt         DateTime @default(now())\n  removedAt         DateTime?\n\n  @@unique([householdId, responsibilityId, sharedWithUserId])\n  @@index([sharedWithUserId, removedAt])\n  @@index([authorityGrantId])\n}\n\n// ===========================================================================\n// Responsibility Core",
)

# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------
Path("prisma/migrations/20260918060000_people_household_continuity").mkdir(parents=True, exist_ok=True)
Path("prisma/migrations/20260918060000_people_household_continuity/migration.sql").write_text(r'''-- PEOPLE-HOUSEHOLD-001 — Household & Relationship Continuity

ALTER TYPE "AuthorityResourceClass" ADD VALUE 'RESPONSIBILITY';

ALTER TABLE "AuthorityRequest" ADD COLUMN "delegateUserId" UUID;
ALTER TABLE "AuthorityGrant" ADD COLUMN "delegateUserId" UUID;
ALTER TABLE "AuthorityDecision" ADD COLUMN "delegateUserId" UUID;
ALTER TABLE "AuthorityRequest" ALTER COLUMN "policyVersion" SET DEFAULT 'people-step3-v3';

CREATE INDEX "AuthorityRequest_delegateUserId_status_idx" ON "AuthorityRequest"("delegateUserId", "status");
CREATE INDEX "AuthorityGrant_delegateUserId_status_idx" ON "AuthorityGrant"("delegateUserId", "status");
CREATE INDEX "AuthorityDecision_delegateUserId_createdAt_idx" ON "AuthorityDecision"("delegateUserId", "createdAt");

ALTER TABLE "AuthorityRequest"
  ADD CONSTRAINT "AuthorityRequest_delegate_personal_ck" CHECK (
    "delegateUserId" IS NULL OR (
      "contextType" = 'PERSONAL' AND
      "subjectUserId" IS NOT NULL AND
      "delegateUserId" <> "subjectUserId"
    )
  );
ALTER TABLE "AuthorityGrant"
  ADD CONSTRAINT "AuthorityGrant_delegate_personal_ck" CHECK (
    "delegateUserId" IS NULL OR (
      "contextType" = 'PERSONAL' AND
      "subjectUserId" IS NOT NULL AND
      "delegateUserId" <> "subjectUserId"
    )
  );
ALTER TABLE "AuthorityDecision"
  ADD CONSTRAINT "AuthorityDecision_delegate_personal_ck" CHECK (
    "delegateUserId" IS NULL OR (
      "contextType" = 'PERSONAL' AND
      "subjectUserId" IS NOT NULL AND
      "delegateUserId" <> "subjectUserId"
    )
  );

-- Close the prior review LOW at the persistence layer for current/new policy
-- versions. Legacy v1 rows remain historical and fail closed at runtime.
ALTER TABLE "AuthorityRequest"
  ADD CONSTRAINT "AuthorityRequest_share_scope_ck" CHECK (
    "policyVersion" NOT IN ('people-step2-v2', 'people-step3-v3') OR
    (
      ("capability" = 'SHARE' AND "shareRecipientKind" IS NOT NULL AND NULLIF(BTRIM("shareRecipientRef"), '') IS NOT NULL AND COALESCE(array_length("shareDataFields", 1), 0) > 0 AND "shareScopeKey" IS NOT NULL)
      OR
      ("capability" <> 'SHARE' AND "shareRecipientKind" IS NULL AND "shareRecipientRef" IS NULL AND COALESCE(array_length("shareDataFields", 1), 0) = 0 AND "shareScopeKey" IS NULL)
    )
  );
ALTER TABLE "AuthorityGrant"
  ADD CONSTRAINT "AuthorityGrant_share_scope_ck" CHECK (
    "policyVersion" NOT IN ('people-step2-v2', 'people-step3-v3') OR
    (
      ("capability" = 'SHARE' AND "shareRecipientKind" IS NOT NULL AND NULLIF(BTRIM("shareRecipientRef"), '') IS NOT NULL AND COALESCE(array_length("shareDataFields", 1), 0) > 0 AND "shareScopeKey" IS NOT NULL)
      OR
      ("capability" <> 'SHARE' AND "shareRecipientKind" IS NULL AND "shareRecipientRef" IS NULL AND COALESCE(array_length("shareDataFields", 1), 0) = 0 AND "shareScopeKey" IS NULL)
    )
  );

CREATE TYPE "HouseholdMembershipRole" AS ENUM ('ORGANIZER', 'MEMBER');
CREATE TYPE "HouseholdMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'LEFT', 'REMOVED');
CREATE TYPE "HouseholdRelationshipKind" AS ENUM ('PARTNER', 'PARENT_OR_GUARDIAN', 'ADULT_CHILD', 'SIBLING', 'CAREGIVER', 'CARE_RECIPIENT', 'ROOMMATE', 'OTHER');
CREATE TYPE "HouseholdDependencyDirection" AS ENUM ('NONE', 'I_DEPEND_ON_THEM', 'THEY_DEPEND_ON_ME', 'MUTUAL');
CREATE TYPE "HouseholdFactProvenance" AS ENUM ('REPORTED');

CREATE TABLE "Household" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HouseholdMembership" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "householdId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "HouseholdMembershipRole" NOT NULL DEFAULT 'MEMBER',
  "status" "HouseholdMembershipStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" UUID,
  "joinedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HouseholdMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HouseholdRelationship" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "householdId" UUID NOT NULL,
  "reportedByUserId" UUID NOT NULL,
  "relatedUserId" UUID NOT NULL,
  "kind" "HouseholdRelationshipKind" NOT NULL,
  "dependency" "HouseholdDependencyDirection" NOT NULL DEFAULT 'NONE',
  "provenance" "HouseholdFactProvenance" NOT NULL DEFAULT 'REPORTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HouseholdRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdRelationship_distinct_people_ck" CHECK ("reportedByUserId" <> "relatedUserId")
);

CREATE TABLE "HouseholdResponsibilityShare" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "householdId" UUID NOT NULL,
  "responsibilityId" UUID NOT NULL,
  "sharedByUserId" UUID NOT NULL,
  "sharedWithUserId" UUID NOT NULL,
  "authorityGrantId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removedAt" TIMESTAMP(3),
  CONSTRAINT "HouseholdResponsibilityShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HouseholdResponsibilityShare_distinct_people_ck" CHECK ("sharedByUserId" <> "sharedWithUserId")
);

CREATE UNIQUE INDEX "HouseholdMembership_householdId_userId_key" ON "HouseholdMembership"("householdId", "userId");
CREATE INDEX "HouseholdMembership_userId_status_updatedAt_idx" ON "HouseholdMembership"("userId", "status", "updatedAt");
CREATE INDEX "HouseholdMembership_householdId_status_idx" ON "HouseholdMembership"("householdId", "status");
CREATE UNIQUE INDEX "HouseholdRelationship_householdId_reportedByUserId_relatedUserId_key" ON "HouseholdRelationship"("householdId", "reportedByUserId", "relatedUserId");
CREATE INDEX "HouseholdRelationship_householdId_reportedByUserId_idx" ON "HouseholdRelationship"("householdId", "reportedByUserId");
CREATE INDEX "HouseholdRelationship_householdId_relatedUserId_idx" ON "HouseholdRelationship"("householdId", "relatedUserId");
CREATE UNIQUE INDEX "HouseholdResponsibilityShare_householdId_responsibilityId_sharedWithUserId_key" ON "HouseholdResponsibilityShare"("householdId", "responsibilityId", "sharedWithUserId");
CREATE INDEX "HouseholdResponsibilityShare_sharedWithUserId_removedAt_idx" ON "HouseholdResponsibilityShare"("sharedWithUserId", "removedAt");
CREATE INDEX "HouseholdResponsibilityShare_authorityGrantId_idx" ON "HouseholdResponsibilityShare"("authorityGrantId");
CREATE INDEX "Household_createdByUserId_createdAt_idx" ON "Household"("createdByUserId", "createdAt");

ALTER TABLE "Household" ADD CONSTRAINT "Household_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HouseholdRelationship" ADD CONSTRAINT "HouseholdRelationship_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdRelationship" ADD CONSTRAINT "HouseholdRelationship_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdRelationship" ADD CONSTRAINT "HouseholdRelationship_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibilityShare" ADD CONSTRAINT "HouseholdResponsibilityShare_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibilityShare" ADD CONSTRAINT "HouseholdResponsibilityShare_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "Responsibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibilityShare" ADD CONSTRAINT "HouseholdResponsibilityShare_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibilityShare" ADD CONSTRAINT "HouseholdResponsibilityShare_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdResponsibilityShare" ADD CONSTRAINT "HouseholdResponsibilityShare_authorityGrantId_fkey" FOREIGN KEY ("authorityGrantId") REFERENCES "AuthorityGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthorityRequest" ADD CONSTRAINT "AuthorityRequest_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthorityDecision" ADD CONSTRAINT "AuthorityDecision_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
''')

# ---------------------------------------------------------------------------
# Authority DTO + service
# ---------------------------------------------------------------------------
dto = "apps/api/src/authority/dto/authority.dto.ts"
replace_once(
    dto,
    "  @ApiPropertyOptional()\n  @IsOptional() @IsString() @MaxLength(500)\n  resourceRef?: string;\n\n\n  @ApiPropertyOptional({ enum: AuthorityShareRecipientKind })",
    "  @ApiPropertyOptional()\n  @IsOptional() @IsString() @MaxLength(500)\n  resourceRef?: string;\n\n  @ApiPropertyOptional({ description: 'Exact household delegate user id. Personal authority only.' })\n  @IsOptional() @IsUUID()\n  delegateUserId?: string;\n\n  @ApiPropertyOptional({ enum: AuthorityShareRecipientKind })",
)
# Same block occurs again in AuthorityEvaluationDto after first replacement.
replace_once(
    dto,
    "  @ApiPropertyOptional()\n  @IsOptional() @IsString() @MaxLength(500)\n  resourceRef?: string;\n\n\n  @ApiPropertyOptional({ enum: AuthorityShareRecipientKind })",
    "  @ApiPropertyOptional()\n  @IsOptional() @IsString() @MaxLength(500)\n  resourceRef?: string;\n\n  @ApiPropertyOptional({ description: 'Exact household delegate user id. Personal authority only.' })\n  @IsOptional() @IsUUID()\n  delegateUserId?: string;\n\n  @ApiPropertyOptional({ enum: AuthorityShareRecipientKind })",
)

svc = "apps/api/src/authority/authority.service.ts"
replace_once(svc, "  AuthorityGrantStatus,\n  AuthorityRequest,", "  AuthorityGrantStatus,\n  HouseholdMembershipStatus,\n  ResponsibilityContextType,\n  AuthorityRequest,")
replace_once(svc, "const POLICY_VERSION = 'people-step2-v2';", "const POLICY_VERSION = 'people-step3-v3';")
replace_once(svc, "  AuthorityResourceClass.DOCUMENT,\n]);", "  AuthorityResourceClass.DOCUMENT,\n  AuthorityResourceClass.RESPONSIBILITY,\n]);")
replace_once(
    svc,
    "          organizationId: dto.organizationId ?? null,\n          capability: dto.capability,",
    "          organizationId: dto.organizationId ?? null,\n          delegateUserId: dto.delegateUserId ?? null,\n          capability: dto.capability,",
)
replace_once(
    svc,
    "          organizationId: request.organizationId,\n          capability: request.capability,",
    "          organizationId: request.organizationId,\n          delegateUserId: request.delegateUserId,\n          capability: request.capability,",
)
replace_once(
    svc,
    "        organizationId: selected.organizationId,\n        capability: selected.capability,",
    "        organizationId: selected.organizationId,\n        delegateUserId: selected.delegateUserId,\n        capability: selected.capability,",
)
replace_once(
    svc,
    "  async evaluateForCaller(dto: AuthorityEvaluationDto, caller: AuthenticatedUser) {\n    await this.assertCanInspect(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);\n    return this.evaluate(dto, caller.id);\n  }",
    "  async evaluateForCaller(dto: AuthorityEvaluationDto, caller: AuthenticatedUser) {\n    if (dto.delegateUserId) {\n      if (caller.id !== dto.delegateUserId) throw new NotFoundException('Authority scope not found');\n      return this.evaluate(dto, caller.id);\n    }\n    await this.assertCanInspect(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);\n    return this.evaluate(dto, caller.id);\n  }",
)
replace_once(
    svc,
    "    const shapeError = await this.scopeError(dto.contextType, dto.subjectUserId, dto.organizationId);\n    if (shapeError) return this.recordDecision(dto, AuthorityDecisionResult.DENY, shapeError, null, actorUserId);\n\n    if (dto.contextType === AuthorityContextType.BUSINESS_TENANT) {",
    "    const shapeError = await this.scopeError(dto.contextType, dto.subjectUserId, dto.organizationId);\n    if (shapeError) return this.recordDecision(dto, AuthorityDecisionResult.DENY, shapeError, null, actorUserId);\n\n    if (dto.delegateUserId) {\n      if (dto.contextType !== AuthorityContextType.PERSONAL || !dto.subjectUserId) {\n        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Delegated authority is Personal-only', null, actorUserId);\n      }\n      if (dto.delegateUserId === dto.subjectUserId || actorUserId !== dto.delegateUserId) {\n        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Delegated authority may only be used by the exact delegate', null, actorUserId);\n      }\n      if (!(await this.shareActiveHousehold(dto.subjectUserId, dto.delegateUserId))) {\n        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Delegate no longer shares an active household with the authority subject', null, actorUserId);\n      }\n    }\n\n    if (dto.contextType === AuthorityContextType.BUSINESS_TENANT) {",
)
replace_once(
    svc,
    "        dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT ||\n        (dto.resourceClass === AuthorityResourceClass.DOCUMENT && PERSONAL_EXACT_DOCUMENT_CAPABILITIES.has(dto.capability))",
    "        dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT ||\n        (dto.resourceClass === AuthorityResourceClass.DOCUMENT && PERSONAL_EXACT_DOCUMENT_CAPABILITIES.has(dto.capability)) ||\n        (dto.resourceClass === AuthorityResourceClass.RESPONSIBILITY && PERSONAL_EXACT_DOCUMENT_CAPABILITIES.has(dto.capability))",
)
replace_once(
    svc,
    "    if (dto.resourceClass === AuthorityResourceClass.DOCUMENT && dto.resourceRef) {\n      const document = await this.prisma.db.document.findFirst({\n        where: { id: dto.resourceRef, userId: dto.subjectUserId!, deletedAt: null },\n        select: { id: true },\n      });\n      if (!document) {\n        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Document does not belong to this authority subject', null, actorUserId);\n      }\n    }\n\n    const scopeKey",
    "    if (dto.resourceClass === AuthorityResourceClass.DOCUMENT && dto.resourceRef) {\n      const document = await this.prisma.db.document.findFirst({\n        where: { id: dto.resourceRef, userId: dto.subjectUserId!, deletedAt: null },\n        select: { id: true },\n      });\n      if (!document) {\n        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Document does not belong to this authority subject', null, actorUserId);\n      }\n    }\n    if (dto.resourceClass === AuthorityResourceClass.RESPONSIBILITY) {\n      if (dto.contextType !== AuthorityContextType.PERSONAL || !dto.resourceRef) {\n        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Responsibility authority is Personal and requires an exact responsibility reference', null, actorUserId);\n      }\n      const responsibility = await this.prisma.db.responsibility.findFirst({\n        where: { id: dto.resourceRef, principalUserId: dto.subjectUserId!, contextType: ResponsibilityContextType.PERSONAL },\n        select: { id: true },\n      });\n      if (!responsibility) {\n        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Responsibility does not belong to this authority subject', null, actorUserId);\n      }\n    }\n\n    const scopeKey",
)
replace_once(
    svc,
    "    if (dto.contextType === AuthorityContextType.PERSONAL) {\n      if (dto.subjectUserId !== caller.id) throw new ForbiddenException('Personal authority can only be requested for yourself');\n    } else {",
    "    if (dto.contextType === AuthorityContextType.PERSONAL) {\n      if (dto.subjectUserId !== caller.id) throw new ForbiddenException('Personal authority can only be requested for yourself');\n      if (dto.delegateUserId) {\n        if (dto.delegateUserId === dto.subjectUserId) throw new BadRequestException('A delegate must be another member');\n        if (!(await this.shareActiveHousehold(dto.subjectUserId!, dto.delegateUserId))) {\n          throw new BadRequestException('Delegate must be an active member of a household you share');\n        }\n      }\n    } else {\n      if (dto.delegateUserId) throw new BadRequestException('Delegated authority is Personal-only');",
)
replace_once(
    svc,
    "    if (dto.resourceClass === AuthorityResourceClass.DOCUMENT) {\n      if (PERSONAL_EXACT_DOCUMENT_CAPABILITIES.has(dto.capability) && !dto.resourceRef) {\n        throw new BadRequestException('Document authority requires an exact document reference');\n      }\n      if (dto.resourceRef) {\n        const document = await this.prisma.db.document.findFirst({\n          where: { id: dto.resourceRef, userId: dto.subjectUserId!, deletedAt: null },\n          select: { id: true },\n        });\n        if (!document) throw new NotFoundException('Document not found');\n      }\n    }\n\n    if (creation && dto.capability",
    "    if (dto.resourceClass === AuthorityResourceClass.DOCUMENT) {\n      if (PERSONAL_EXACT_DOCUMENT_CAPABILITIES.has(dto.capability) && !dto.resourceRef) {\n        throw new BadRequestException('Document authority requires an exact document reference');\n      }\n      if (dto.resourceRef) {\n        const document = await this.prisma.db.document.findFirst({\n          where: { id: dto.resourceRef, userId: dto.subjectUserId!, deletedAt: null },\n          select: { id: true },\n        });\n        if (!document) throw new NotFoundException('Document not found');\n      }\n    }\n\n    if (dto.resourceClass === AuthorityResourceClass.RESPONSIBILITY) {\n      if (dto.contextType !== AuthorityContextType.PERSONAL) throw new BadRequestException('Responsibility authority is Personal-only');\n      if (PERSONAL_EXACT_DOCUMENT_CAPABILITIES.has(dto.capability) && !dto.resourceRef) {\n        throw new BadRequestException('Responsibility authority requires an exact responsibility reference');\n      }\n      if (dto.resourceRef) {\n        const responsibility = await this.prisma.db.responsibility.findFirst({\n          where: { id: dto.resourceRef, principalUserId: dto.subjectUserId!, contextType: ResponsibilityContextType.PERSONAL },\n          select: { id: true },\n        });\n        if (!responsibility) throw new NotFoundException('Responsibility not found');\n      }\n    }\n\n    if (creation && dto.capability",
)
replace_once(
    svc,
    "      organizationId: dto.organizationId ?? null,\n      capability: dto.capability,",
    "      organizationId: dto.organizationId ?? null,\n      delegateUserId: dto.delegateUserId ?? null,\n      capability: dto.capability,",
)
replace_once(
    svc,
    "        organizationId: dto.organizationId ?? null,\n        capability: dto.capability,",
    "        organizationId: dto.organizationId ?? null,\n        delegateUserId: dto.delegateUserId ?? null,\n        capability: dto.capability,",
)
replace_once(
    svc,
    "  private async ownerOrganizationIds(userId: string) {",
    "  private async shareActiveHousehold(subjectUserId: string, delegateUserId: string) {\n    const subjectMemberships = await this.prisma.db.householdMembership.findMany({\n      where: { userId: subjectUserId, status: HouseholdMembershipStatus.ACTIVE },\n      select: { householdId: true },\n    });\n    if (subjectMemberships.length === 0) return false;\n    const shared = await this.prisma.db.householdMembership.findFirst({\n      where: {\n        userId: delegateUserId,\n        status: HouseholdMembershipStatus.ACTIVE,\n        householdId: { in: subjectMemberships.map((row) => row.householdId) },\n      },\n      select: { id: true },\n    });\n    return Boolean(shared);\n  }\n\n  private async ownerOrganizationIds(userId: string) {",
)
replace_once(
    svc,
    "      organizationId: dto.organizationId ?? null,\n      capability: dto.capability,\n      resourceClass: dto.resourceClass,",
    "      organizationId: dto.organizationId ?? null,\n      delegateUserId: dto.delegateUserId ?? null,\n      capability: dto.capability,\n      resourceClass: dto.resourceClass,",
)

# ---------------------------------------------------------------------------
# Household backend
# ---------------------------------------------------------------------------
base = Path("apps/api/src/households")
base.mkdir(parents=True, exist_ok=True)
(base / "dto").mkdir(exist_ok=True)

(base / "dto/households.dto.ts").write_text(r'''import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HouseholdDependencyDirection,
  HouseholdRelationshipKind,
} from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateHouseholdDto {
  @ApiPropertyOptional({ default: 'My household' })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120)
  name?: string;
}

export class InviteHouseholdMemberDto {
  @ApiProperty()
  @IsEmail() @MaxLength(320)
  email: string;
}

export class TransferHouseholdOrganizerDto {
  @ApiProperty()
  @IsUUID()
  newOrganizerUserId: string;
}

export class CreateHouseholdRelationshipDto {
  @ApiProperty()
  @IsUUID()
  relatedUserId: string;

  @ApiProperty({ enum: HouseholdRelationshipKind })
  @IsEnum(HouseholdRelationshipKind)
  kind: HouseholdRelationshipKind;

  @ApiProperty({ enum: HouseholdDependencyDirection })
  @IsEnum(HouseholdDependencyDirection)
  dependency: HouseholdDependencyDirection;
}

export class ShareHouseholdResponsibilityDto {
  @ApiProperty()
  @IsUUID()
  sharedWithUserId: string;

  @ApiProperty({ description: 'Exact approved AuthorityGrant id backing this bounded share.' })
  @IsUUID()
  authorityGrantId: string;
}
''')

(base / "households.module.ts").write_text(r'''import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuthorityModule } from '../authority/authority.module';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';

@Module({
  imports: [AuthGuardsModule, AuthorityModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}
''')

(base / "households.controller.ts").write_text(r'''import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  CreateHouseholdDto,
  CreateHouseholdRelationshipDto,
  InviteHouseholdMemberDto,
  ShareHouseholdResponsibilityDto,
  TransferHouseholdOrganizerDto,
} from './dto/households.dto';
import { HouseholdsService } from './households.service';

@ApiTags('people-households')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('people/households')
export class HouseholdsController {
  constructor(private readonly service: HouseholdsService) {}

  @Post()
  create(@Body() dto: CreateHouseholdDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.create(dto, caller);
  }

  @Get()
  listMine(@CurrentUser() caller: AuthenticatedUser) {
    return this.service.listMine(caller);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.get(id, caller);
  }

  @Post(':id/invitations')
  invite(@Param('id') id: string, @Body() dto: InviteHouseholdMemberDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.invite(id, dto, caller);
  }

  @Post(':id/invitations/accept')
  accept(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.accept(id, caller);
  }

  @Post(':id/invitations/decline')
  decline(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.decline(id, caller);
  }

  @Post(':id/leave')
  leave(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.leave(id, caller);
  }

  @Post(':id/members/:userId/remove')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.removeMember(id, userId, caller);
  }

  @Post(':id/organizer')
  transferOrganizer(@Param('id') id: string, @Body() dto: TransferHouseholdOrganizerDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.transferOrganizer(id, dto, caller);
  }

  @Post(':id/relationships')
  upsertRelationship(@Param('id') id: string, @Body() dto: CreateHouseholdRelationshipDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.upsertRelationship(id, dto, caller);
  }

  @Delete(':id/relationships/:relationshipId')
  deleteRelationship(@Param('id') id: string, @Param('relationshipId') relationshipId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.deleteRelationship(id, relationshipId, caller);
  }

  @Post(':id/responsibilities/:responsibilityId/share')
  shareResponsibility(
    @Param('id') id: string,
    @Param('responsibilityId') responsibilityId: string,
    @Body() dto: ShareHouseholdResponsibilityDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.shareResponsibility(id, responsibilityId, dto, caller);
  }
}
''')

(base / "households.service.ts").write_text(r'''import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityDecisionResult,
  AuthorityGrantStatus,
  AuthorityResourceClass,
  AuthorityShareRecipientKind,
  HouseholdFactProvenance,
  HouseholdMembershipRole,
  HouseholdMembershipStatus,
  ResponsibilityContextType,
  UserStatus,
} from '@prisma/client';
import { AuthorityService } from '../authority/authority.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHouseholdDto,
  CreateHouseholdRelationshipDto,
  InviteHouseholdMemberDto,
  ShareHouseholdResponsibilityDto,
  TransferHouseholdOrganizerDto,
} from './dto/households.dto';

export const HOUSEHOLD_RESPONSIBILITY_SHARE_PURPOSE = 'Coordinate this household responsibility';
export const HOUSEHOLD_RESPONSIBILITY_SHARE_FIELDS = ['objective', 'status'] as const;

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authority: AuthorityService,
  ) {}

  async create(dto: CreateHouseholdDto, caller: AuthenticatedUser) {
    const name = dto.name?.trim() || 'My household';
    return this.prisma.db.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { name, createdByUserId: caller.id },
      });
      await tx.householdMembership.create({
        data: {
          householdId: household.id,
          userId: caller.id,
          role: HouseholdMembershipRole.ORGANIZER,
          status: HouseholdMembershipStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
      return { id: household.id, name: household.name, role: HouseholdMembershipRole.ORGANIZER };
    });
  }

  async listMine(caller: AuthenticatedUser) {
    const memberships = await this.prisma.db.householdMembership.findMany({
      where: {
        userId: caller.id,
        status: { in: [HouseholdMembershipStatus.ACTIVE, HouseholdMembershipStatus.PENDING] },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const householdIds = [...new Set(memberships.map((row) => row.householdId))];
    const households = await this.prisma.db.household.findMany({
      where: { id: { in: householdIds } },
      select: { id: true, name: true, createdAt: true },
    });
    const byId = new Map(households.map((household) => [household.id, household]));
    return {
      households: memberships
        .filter((row) => row.status === HouseholdMembershipStatus.ACTIVE)
        .map((row) => ({ ...byId.get(row.householdId)!, role: row.role })),
      invitations: memberships
        .filter((row) => row.status === HouseholdMembershipStatus.PENDING)
        .map((row) => ({ ...byId.get(row.householdId)!, invitedAt: row.createdAt })),
    };
  }

  async get(householdId: string, caller: AuthenticatedUser) {
    const callerMembership = await this.requireActiveMembership(householdId, caller.id);
    const household = await this.prisma.db.household.findUnique({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');

    const activeMemberships = await this.prisma.db.householdMembership.findMany({
      where: { householdId, status: HouseholdMembershipStatus.ACTIVE },
      orderBy: { joinedAt: 'asc' },
    });
    const activeIds = new Set(activeMemberships.map((row) => row.userId));
    const profiles = await this.prisma.db.user.findMany({
      where: { id: { in: [...activeIds] } },
      select: { id: true, profile: { select: { displayName: true } } },
    });
    const names = new Map(profiles.map((row) => [row.id, row.profile?.displayName ?? 'Household member']));

    const rawRelationships = await this.prisma.db.householdRelationship.findMany({
      where: {
        householdId,
        OR: [{ reportedByUserId: caller.id }, { relatedUserId: caller.id }],
      },
      orderBy: { updatedAt: 'desc' },
    });
    const relationships = rawRelationships
      .filter((row) => activeIds.has(row.reportedByUserId) && activeIds.has(row.relatedUserId))
      .map((row) => ({
        ...row,
        reportedByDisplayName: names.get(row.reportedByUserId) ?? 'Household member',
        relatedDisplayName: names.get(row.relatedUserId) ?? 'Household member',
      }));

    const shareRows = await this.prisma.db.householdResponsibilityShare.findMany({
      where: { householdId, sharedWithUserId: caller.id, removedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const sharedResponsibilities = [];
    for (const share of shareRows) {
      if (!activeIds.has(share.sharedByUserId) || !activeIds.has(share.sharedWithUserId)) continue;
      const projected = await this.projectResponsibilityShare(share);
      if (projected) sharedResponsibilities.push(projected);
    }

    return {
      id: household.id,
      name: household.name,
      currentMemberRole: callerMembership.role,
      privacyNotice: 'Same household does not mean shared private data. Sharing and acting require separate explicit permission.',
      members: activeMemberships.map((row) => ({
        userId: row.userId,
        displayName: names.get(row.userId) ?? 'Household member',
        role: row.role,
        joinedAt: row.joinedAt,
      })),
      relationships,
      sharedResponsibilities,
    };
  }

  async invite(householdId: string, dto: InviteHouseholdMemberDto, caller: AuthenticatedUser) {
    await this.requireOrganizer(householdId, caller.id);
    const neutral = { acceptedForDelivery: true };
    const email = dto.email.trim().toLowerCase();
    const target = await this.prisma.db.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
        status: UserStatus.ACTIVE,
        isGuest: false,
      },
      select: { id: true },
    });
    if (!target || target.id === caller.id) return neutral;

    const existing = await this.prisma.db.householdMembership.findUnique({
      where: { householdId_userId: { householdId, userId: target.id } },
    });
    if (existing?.status === HouseholdMembershipStatus.ACTIVE) return neutral;

    await this.prisma.db.householdMembership.upsert({
      where: { householdId_userId: { householdId, userId: target.id } },
      create: {
        householdId,
        userId: target.id,
        role: HouseholdMembershipRole.MEMBER,
        status: HouseholdMembershipStatus.PENDING,
        invitedByUserId: caller.id,
      },
      update: {
        role: HouseholdMembershipRole.MEMBER,
        status: HouseholdMembershipStatus.PENDING,
        invitedByUserId: caller.id,
        joinedAt: null,
        endedAt: null,
      },
    });
    return neutral;
  }

  async accept(householdId: string, caller: AuthenticatedUser) {
    const membership = await this.prisma.db.householdMembership.findUnique({
      where: { householdId_userId: { householdId, userId: caller.id } },
    });
    if (!membership || membership.status !== HouseholdMembershipStatus.PENDING) {
      throw new NotFoundException('Household invitation not found');
    }
    return this.prisma.db.householdMembership.update({
      where: { id: membership.id },
      data: { status: HouseholdMembershipStatus.ACTIVE, joinedAt: new Date(), endedAt: null },
      select: { householdId: true, role: true, status: true },
    });
  }

  async decline(householdId: string, caller: AuthenticatedUser) {
    const membership = await this.prisma.db.householdMembership.findUnique({
      where: { householdId_userId: { householdId, userId: caller.id } },
    });
    if (!membership || membership.status !== HouseholdMembershipStatus.PENDING) {
      throw new NotFoundException('Household invitation not found');
    }
    return this.prisma.db.householdMembership.update({
      where: { id: membership.id },
      data: { status: HouseholdMembershipStatus.DECLINED, endedAt: new Date() },
      select: { householdId: true, status: true },
    });
  }

  async leave(householdId: string, caller: AuthenticatedUser) {
    const membership = await this.requireActiveMembership(householdId, caller.id);
    if (membership.role === HouseholdMembershipRole.ORGANIZER) {
      throw new BadRequestException('Transfer organizer before leaving this household');
    }
    return this.prisma.db.householdMembership.update({
      where: { id: membership.id },
      data: { status: HouseholdMembershipStatus.LEFT, endedAt: new Date() },
      select: { householdId: true, status: true },
    });
  }

  async removeMember(householdId: string, targetUserId: string, caller: AuthenticatedUser) {
    await this.requireOrganizer(householdId, caller.id);
    if (targetUserId === caller.id) throw new BadRequestException('Transfer organizer before leaving this household');
    const target = await this.requireActiveMembership(householdId, targetUserId);
    return this.prisma.db.householdMembership.update({
      where: { id: target.id },
      data: { status: HouseholdMembershipStatus.REMOVED, endedAt: new Date() },
      select: { householdId: true, status: true },
    });
  }

  async transferOrganizer(householdId: string, dto: TransferHouseholdOrganizerDto, caller: AuthenticatedUser) {
    const current = await this.requireOrganizer(householdId, caller.id);
    const target = await this.requireActiveMembership(householdId, dto.newOrganizerUserId);
    if (target.userId === caller.id) throw new BadRequestException('This member already organizes the household');
    await this.prisma.db.$transaction([
      this.prisma.db.householdMembership.update({ where: { id: current.id }, data: { role: HouseholdMembershipRole.MEMBER } }),
      this.prisma.db.householdMembership.update({ where: { id: target.id }, data: { role: HouseholdMembershipRole.ORGANIZER } }),
    ]);
    return { householdId, organizerUserId: target.userId };
  }

  async upsertRelationship(householdId: string, dto: CreateHouseholdRelationshipDto, caller: AuthenticatedUser) {
    await this.requireActiveMembership(householdId, caller.id);
    if (dto.relatedUserId === caller.id) throw new BadRequestException('Relationship must involve another household member');
    await this.requireActiveMembership(householdId, dto.relatedUserId);
    return this.prisma.db.householdRelationship.upsert({
      where: {
        householdId_reportedByUserId_relatedUserId: {
          householdId,
          reportedByUserId: caller.id,
          relatedUserId: dto.relatedUserId,
        },
      },
      create: {
        householdId,
        reportedByUserId: caller.id,
        relatedUserId: dto.relatedUserId,
        kind: dto.kind,
        dependency: dto.dependency,
        provenance: HouseholdFactProvenance.REPORTED,
      },
      update: {
        kind: dto.kind,
        dependency: dto.dependency,
        provenance: HouseholdFactProvenance.REPORTED,
      },
    });
  }

  async deleteRelationship(householdId: string, relationshipId: string, caller: AuthenticatedUser) {
    await this.requireActiveMembership(householdId, caller.id);
    const row = await this.prisma.db.householdRelationship.findFirst({
      where: { id: relationshipId, householdId, reportedByUserId: caller.id },
    });
    if (!row) throw new NotFoundException('Relationship report not found');
    await this.prisma.db.householdRelationship.delete({ where: { id: row.id } });
    return { deleted: true };
  }

  async shareResponsibility(
    householdId: string,
    responsibilityId: string,
    dto: ShareHouseholdResponsibilityDto,
    caller: AuthenticatedUser,
  ) {
    await this.requireActiveMembership(householdId, caller.id);
    if (dto.sharedWithUserId === caller.id) throw new BadRequestException('Choose another household member');
    await this.requireActiveMembership(householdId, dto.sharedWithUserId);
    const responsibility = await this.prisma.db.responsibility.findFirst({
      where: {
        id: responsibilityId,
        principalUserId: caller.id,
        contextType: ResponsibilityContextType.PERSONAL,
      },
      select: { id: true },
    });
    if (!responsibility) throw new NotFoundException('Responsibility not found');

    const evaluation = await this.authority.evaluate({
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: caller.id,
      capability: AuthorityCapability.SHARE,
      resourceClass: AuthorityResourceClass.RESPONSIBILITY,
      resourceRef: responsibilityId,
      shareRecipientKind: AuthorityShareRecipientKind.PERSON,
      shareRecipientRef: dto.sharedWithUserId,
      shareDataFields: [...HOUSEHOLD_RESPONSIBILITY_SHARE_FIELDS],
      purpose: HOUSEHOLD_RESPONSIBILITY_SHARE_PURPOSE,
    }, caller.id);
    if (evaluation.result !== AuthorityDecisionResult.PERMIT || evaluation.grantId !== dto.authorityGrantId) {
      throw new ForbiddenException('This household share is not backed by the exact active permission');
    }

    return this.prisma.db.householdResponsibilityShare.upsert({
      where: {
        householdId_responsibilityId_sharedWithUserId: {
          householdId,
          responsibilityId,
          sharedWithUserId: dto.sharedWithUserId,
        },
      },
      create: {
        householdId,
        responsibilityId,
        sharedByUserId: caller.id,
        sharedWithUserId: dto.sharedWithUserId,
        authorityGrantId: dto.authorityGrantId,
      },
      update: {
        sharedByUserId: caller.id,
        authorityGrantId: dto.authorityGrantId,
        removedAt: null,
      },
      select: { id: true, householdId: true, responsibilityId: true, sharedWithUserId: true, createdAt: true },
    });
  }

  private async projectResponsibilityShare(share: {
    responsibilityId: string;
    sharedByUserId: string;
    sharedWithUserId: string;
    authorityGrantId: string;
  }) {
    const grant = await this.prisma.db.authorityGrant.findUnique({ where: { id: share.authorityGrantId } });
    const now = new Date();
    if (
      !grant ||
      grant.status !== AuthorityGrantStatus.ACTIVE ||
      (grant.expiresAt && grant.expiresAt <= now) ||
      grant.contextType !== AuthorityContextType.PERSONAL ||
      grant.subjectUserId !== share.sharedByUserId ||
      grant.delegateUserId !== null ||
      grant.capability !== AuthorityCapability.SHARE ||
      grant.resourceClass !== AuthorityResourceClass.RESPONSIBILITY ||
      grant.resourceRef !== share.responsibilityId ||
      grant.shareRecipientKind !== AuthorityShareRecipientKind.PERSON ||
      grant.shareRecipientRef !== share.sharedWithUserId ||
      grant.purpose !== HOUSEHOLD_RESPONSIBILITY_SHARE_PURPOSE ||
      [...grant.shareDataFields].sort().join(',') !== [...HOUSEHOLD_RESPONSIBILITY_SHARE_FIELDS].sort().join(',') ||
      !grant.shareScopeKey
    ) return null;

    const responsibility = await this.prisma.db.responsibility.findFirst({
      where: {
        id: share.responsibilityId,
        principalUserId: share.sharedByUserId,
        contextType: ResponsibilityContextType.PERSONAL,
      },
      select: { id: true, objective: true, status: true },
    });
    if (!responsibility) return null;
    return responsibility;
  }

  private async requireActiveMembership(householdId: string, userId: string) {
    const membership = await this.prisma.db.householdMembership.findUnique({
      where: { householdId_userId: { householdId, userId } },
    });
    if (!membership || membership.status !== HouseholdMembershipStatus.ACTIVE) {
      throw new NotFoundException('Household not found');
    }
    return membership;
  }

  private async requireOrganizer(householdId: string, userId: string) {
    const membership = await this.requireActiveMembership(householdId, userId);
    if (membership.role !== HouseholdMembershipRole.ORGANIZER) throw new NotFoundException('Household not found');
    return membership;
  }
}
''')

# Wire AppModule
app = "apps/api/src/app.module.ts"
replace_once(app, "import { LegalMattersModule } from './legal-matters/legal-matters.module';", "import { LegalMattersModule } from './legal-matters/legal-matters.module';\nimport { HouseholdsModule } from './households/households.module';")
replace_once(app, "    LegalMattersModule,\n  ],", "    LegalMattersModule,\n    HouseholdsModule,\n  ],")

# ---------------------------------------------------------------------------
# API E2E coverage
# ---------------------------------------------------------------------------
(base / "households.e2e.spec.ts").write_text(r'''import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityResourceClass,
  AuthorityShareRecipientKind,
  HouseholdDependencyDirection,
  HouseholdRelationshipKind,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
} from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import {
  HOUSEHOLD_RESPONSIBILITY_SHARE_FIELDS,
  HOUSEHOLD_RESPONSIBILITY_SHARE_PURPOSE,
} from './households.service';

describe('PEOPLE-HOUSEHOLD-001 — Household continuity E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const marker = `household-${randomUUID()}`;
  const people: Record<string, { id: string; token: string; email: string }> = {};
  let householdId: string;
  let responsibilityId: string;
  let aliceDocumentId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);

    for (const name of ['alice', 'bob', 'carol', 'outsider']) {
      const email = `${name}-${marker}@example.test`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'Str0ng!Passw0rd' })
        .expect(201);
      people[name] = { id: response.body.user.id, token: response.body.tokens.accessToken, email };
      await prisma.db.profile.create({ data: { userId: people[name].id, displayName: name[0].toUpperCase() + name.slice(1) } });
    }

    responsibilityId = (await prisma.db.responsibility.create({
      data: {
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        objective: 'Keep the rent plan on track',
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId: people.alice.id,
        successCriteria: { done: 'rent plan resolved' },
        authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
        authorityPolicyVersion: 'household-test',
        privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
        privacyPolicyVersion: 'household-test',
      },
    })).id;

    aliceDocumentId = (await prisma.db.document.create({
      data: {
        userId: people.alice.id,
        title: 'Alice private document',
        originalFilename: 'alice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        storageRef: `test/${marker}/alice.pdf`,
      },
    })).id;
  });

  afterAll(async () => {
    const userIds = Object.values(people).map((person) => person.id);
    await prisma.db.householdResponsibilityShare.deleteMany({ where: { sharedByUserId: { in: userIds } } });
    await prisma.db.householdRelationship.deleteMany({ where: { reportedByUserId: { in: userIds } } });
    await prisma.db.householdMembership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.db.household.deleteMany({ where: { createdByUserId: { in: userIds } } });
    await prisma.db.authorityDecision.deleteMany({ where: { OR: [{ subjectUserId: { in: userIds } }, { actorUserId: { in: userIds } }] } });
    await prisma.db.authorityEvent.deleteMany({ where: { OR: [{ subjectUserId: { in: userIds } }, { actorUserId: { in: userIds } }] } });
    await prisma.db.authorityCapabilityState.deleteMany({ where: { subjectUserId: { in: userIds } } });
    await prisma.db.authorityGrant.deleteMany({ where: { subjectUserId: { in: userIds } } });
    await prisma.db.authorityRequest.deleteMany({ where: { OR: [{ subjectUserId: { in: userIds } }, { requestedByUserId: { in: userIds } }] } });
    await prisma.db.document.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.db.responsibilityEvent.deleteMany({ where: { responsibilityId } });
    await prisma.db.responsibility.deleteMany({ where: { id: responsibilityId } });
    await prisma.db.profile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.db.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it('creates a household, keeps invitations non-enumerating, and blocks pending/non-members', async () => {
    const created = await request(app.getHttpServer())
      .post('/people/households')
      .set(auth(people.alice.token))
      .send({ name: 'Alice household' })
      .expect(201);
    householdId = created.body.id;

    const unknown = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/invitations`)
      .set(auth(people.alice.token))
      .send({ email: `unknown-${marker}@example.test` })
      .expect(201);
    const known = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/invitations`)
      .set(auth(people.alice.token))
      .send({ email: people.bob.email })
      .expect(201);
    expect(unknown.body).toEqual(known.body);
    expect(known.body).toEqual({ acceptedForDelivery: true });

    await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.bob.token)).expect(404);
    await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.outsider.token)).expect(404);

    const bobList = await request(app.getHttpServer()).get('/people/households').set(auth(people.bob.token)).expect(200);
    expect(bobList.body.invitations).toHaveLength(1);
    expect(bobList.body.invitations[0]).toMatchObject({ id: householdId, name: 'Alice household' });
    expect(JSON.stringify(bobList.body)).not.toContain(people.alice.email);
  });

  it('requires acceptance and scopes relationship facts to only the people involved', async () => {
    await request(app.getHttpServer()).post(`/people/households/${householdId}/invitations/accept`).set(auth(people.bob.token)).send({}).expect(201);
    await request(app.getHttpServer()).post(`/people/households/${householdId}/invitations`).set(auth(people.alice.token)).send({ email: people.carol.email }).expect(201);
    await request(app.getHttpServer()).post(`/people/households/${householdId}/invitations/accept`).set(auth(people.carol.token)).send({}).expect(201);

    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/relationships`)
      .set(auth(people.alice.token))
      .send({
        relatedUserId: people.bob.id,
        kind: HouseholdRelationshipKind.PARTNER,
        dependency: HouseholdDependencyDirection.MUTUAL,
      })
      .expect(201);

    const alice = await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.alice.token)).expect(200);
    const bob = await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.bob.token)).expect(200);
    const carol = await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.carol.token)).expect(200);
    expect(alice.body.relationships).toHaveLength(1);
    expect(bob.body.relationships).toHaveLength(1);
    expect(carol.body.relationships).toHaveLength(0);
    expect(alice.body.relationships[0].provenance).toBe('REPORTED');
    expect(alice.body.privacyNotice).toMatch(/does not mean shared private data/i);
  });

  it('does not expose a Responsibility from household membership alone and requires the exact bounded grant', async () => {
    let bob = await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.bob.token)).expect(200);
    expect(bob.body.sharedResponsibilities).toHaveLength(0);

    const wrongRequest = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(people.alice.token))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: people.alice.id,
        capability: AuthorityCapability.SHARE,
        resourceClass: AuthorityResourceClass.RESPONSIBILITY,
        resourceRef: responsibilityId,
        purpose: HOUSEHOLD_RESPONSIBILITY_SHARE_PURPOSE,
        shareRecipientKind: AuthorityShareRecipientKind.PERSON,
        shareRecipientRef: people.carol.id,
        shareDataFields: [...HOUSEHOLD_RESPONSIBILITY_SHARE_FIELDS],
      })
      .expect(201);
    const wrongGrant = await request(app.getHttpServer()).post(`/authority/requests/${wrongRequest.body.id}/approve`).set(auth(people.alice.token)).send({}).expect(201);
    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/responsibilities/${responsibilityId}/share`)
      .set(auth(people.alice.token))
      .send({ sharedWithUserId: people.bob.id, authorityGrantId: wrongGrant.body.id })
      .expect(403);

    const requestRow = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(people.alice.token))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: people.alice.id,
        capability: AuthorityCapability.SHARE,
        resourceClass: AuthorityResourceClass.RESPONSIBILITY,
        resourceRef: responsibilityId,
        purpose: HOUSEHOLD_RESPONSIBILITY_SHARE_PURPOSE,
        shareRecipientKind: AuthorityShareRecipientKind.PERSON,
        shareRecipientRef: people.bob.id,
        shareDataFields: [...HOUSEHOLD_RESPONSIBILITY_SHARE_FIELDS],
      })
      .expect(201);
    const grant = await request(app.getHttpServer()).post(`/authority/requests/${requestRow.body.id}/approve`).set(auth(people.alice.token)).send({}).expect(201);

    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/responsibilities/${responsibilityId}/share`)
      .set(auth(people.alice.token))
      .send({ sharedWithUserId: people.bob.id, authorityGrantId: grant.body.id })
      .expect(201);

    bob = await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.bob.token)).expect(200);
    expect(bob.body.sharedResponsibilities).toEqual([{ id: responsibilityId, objective: 'Keep the rent plan on track', status: 'ACTIVE' }]);
    expect(JSON.stringify(bob.body)).not.toContain('originConversationId');
    expect(JSON.stringify(bob.body)).not.toContain('evidence');

    await request(app.getHttpServer()).post(`/authority/grants/${grant.body.id}/revoke`).set(auth(people.alice.token)).send({ reason: 'Stop sharing' }).expect(201);
    bob = await request(app.getHttpServer()).get(`/people/households/${householdId}`).set(auth(people.bob.token)).expect(200);
    expect(bob.body.sharedResponsibilities).toHaveLength(0);
  });

  it('binds delegated Personal authority to the exact delegate and active shared household', async () => {
    const req = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(people.alice.token))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: people.alice.id,
        delegateUserId: people.bob.id,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.DOCUMENT,
        resourceRef: aliceDocumentId,
        purpose: 'Let Bob read this exact document to help me',
      })
      .expect(201);
    await request(app.getHttpServer()).post(`/authority/requests/${req.body.id}/approve`).set(auth(people.alice.token)).send({}).expect(201);

    const evalBody = {
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: people.alice.id,
      delegateUserId: people.bob.id,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.DOCUMENT,
      resourceRef: aliceDocumentId,
      purpose: 'Let Bob read this exact document to help me',
    };
    const permitted = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(people.bob.token)).send(evalBody).expect(201);
    expect(permitted.body.result).toBe('PERMIT');
    await request(app.getHttpServer()).post('/authority/evaluate').set(auth(people.carol.token)).send(evalBody).expect(404);

    await request(app.getHttpServer()).post(`/people/households/${householdId}/leave`).set(auth(people.bob.token)).send({}).expect(201);
    const afterLeave = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(people.bob.token)).send(evalBody).expect(201);
    expect(afterLeave.body.result).toBe('DENY');
  });
});
''')

# ---------------------------------------------------------------------------
# Web API + Profile household panel
# ---------------------------------------------------------------------------
Path("apps/web/lib/api/households.ts").write_text(r'''import { apiRequest } from './http';

export type HouseholdMembershipRole = 'ORGANIZER' | 'MEMBER';
export type HouseholdRelationshipKind = 'PARTNER' | 'PARENT_OR_GUARDIAN' | 'ADULT_CHILD' | 'SIBLING' | 'CAREGIVER' | 'CARE_RECIPIENT' | 'ROOMMATE' | 'OTHER';
export type HouseholdDependencyDirection = 'NONE' | 'I_DEPEND_ON_THEM' | 'THEY_DEPEND_ON_ME' | 'MUTUAL';

export interface HouseholdSummary { id: string; name: string; role: HouseholdMembershipRole; createdAt: string; }
export interface HouseholdInvitation { id: string; name: string; invitedAt: string; }
export interface HouseholdList { households: HouseholdSummary[]; invitations: HouseholdInvitation[]; }
export interface HouseholdSnapshot {
  id: string;
  name: string;
  currentMemberRole: HouseholdMembershipRole;
  privacyNotice: string;
  members: Array<{ userId: string; displayName: string; role: HouseholdMembershipRole; joinedAt: string | null }>;
  relationships: Array<{
    id: string;
    reportedByUserId: string;
    relatedUserId: string;
    kind: HouseholdRelationshipKind;
    dependency: HouseholdDependencyDirection;
    provenance: 'REPORTED';
    reportedByDisplayName: string;
    relatedDisplayName: string;
  }>;
  sharedResponsibilities: Array<{ id: string; objective: string; status: string }>;
}

export function listMyHouseholds(accessToken: string) {
  return apiRequest<HouseholdList>('/people/households', { accessToken });
}
export function getHousehold(accessToken: string, id: string) {
  return apiRequest<HouseholdSnapshot>(`/people/households/${id}`, { accessToken });
}
export function createHousehold(accessToken: string, name: string) {
  return apiRequest<{ id: string; name: string; role: HouseholdMembershipRole }>('/people/households', { method: 'POST', accessToken, body: { name } });
}
export function inviteHouseholdMember(accessToken: string, id: string, email: string) {
  return apiRequest<{ acceptedForDelivery: true }>(`/people/households/${id}/invitations`, { method: 'POST', accessToken, body: { email } });
}
export function acceptHouseholdInvitation(accessToken: string, id: string) {
  return apiRequest(`/people/households/${id}/invitations/accept`, { method: 'POST', accessToken, body: {} });
}
export function declineHouseholdInvitation(accessToken: string, id: string) {
  return apiRequest(`/people/households/${id}/invitations/decline`, { method: 'POST', accessToken, body: {} });
}
export function leaveHousehold(accessToken: string, id: string) {
  return apiRequest(`/people/households/${id}/leave`, { method: 'POST', accessToken, body: {} });
}
export function removeHouseholdMember(accessToken: string, id: string, userId: string) {
  return apiRequest(`/people/households/${id}/members/${userId}/remove`, { method: 'POST', accessToken, body: {} });
}
export function reportHouseholdRelationship(
  accessToken: string,
  id: string,
  input: { relatedUserId: string; kind: HouseholdRelationshipKind; dependency: HouseholdDependencyDirection },
) {
  return apiRequest(`/people/households/${id}/relationships`, { method: 'POST', accessToken, body: input });
}
''')

# Authority web type additions.
web_auth = "apps/web/lib/api/authority.ts"
replace_once(web_auth, "  | 'DOCUMENT'\n  | 'CALENDAR'", "  | 'DOCUMENT'\n  | 'RESPONSIBILITY'\n  | 'CALENDAR'")
replace_once(web_auth, "  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;\n  shareRecipientKind", "  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;\n  delegateUserId?: string | null; shareRecipientKind")
replace_once(web_auth, "  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;\n  shareRecipientKind", "  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;\n  delegateUserId?: string | null; shareRecipientKind")

profile_dir = Path("apps/web/design-system/components/profile")
(profile_dir / "HouseholdPanel.tsx").write_text(r''''use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../../state';
import {
  acceptHouseholdInvitation,
  createHousehold,
  declineHouseholdInvitation,
  getHousehold,
  inviteHouseholdMember,
  leaveHousehold,
  listMyHouseholds,
  removeHouseholdMember,
  reportHouseholdRelationship,
  type HouseholdDependencyDirection,
  type HouseholdList,
  type HouseholdRelationshipKind,
  type HouseholdSnapshot,
} from '../../../lib/api/households';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { FormField } from '../FormField/FormField';

const relationshipKinds: Array<{ value: HouseholdRelationshipKind; label: string }> = [
  { value: 'PARTNER', label: 'Partner' },
  { value: 'PARENT_OR_GUARDIAN', label: 'Parent / guardian relationship (descriptive only)' },
  { value: 'ADULT_CHILD', label: 'Adult child' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'CAREGIVER', label: 'Caregiver' },
  { value: 'CARE_RECIPIENT', label: 'Care recipient' },
  { value: 'ROOMMATE', label: 'Roommate' },
  { value: 'OTHER', label: 'Other' },
];

const dependencyKinds: Array<{ value: HouseholdDependencyDirection; label: string }> = [
  { value: 'NONE', label: 'No dependency reported' },
  { value: 'I_DEPEND_ON_THEM', label: 'I depend on them' },
  { value: 'THEY_DEPEND_ON_ME', label: 'They depend on me' },
  { value: 'MUTUAL', label: 'We depend on each other' },
];

export function HouseholdPanel() {
  const { session } = useSession();
  const [list, setList] = useState<HouseholdList | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [relatedUserId, setRelatedUserId] = useState('');
  const [relationshipKind, setRelationshipKind] = useState<HouseholdRelationshipKind>('PARTNER');
  const [dependency, setDependency] = useState<HouseholdDependencyDirection>('NONE');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token = session.accessToken;

  const loadList = useCallback(async () => {
    if (!token) return;
    const next = await listMyHouseholds(token);
    setList(next);
    setSelectedId((current) => current && next.households.some((h) => h.id === current) ? current : (next.households[0]?.id ?? null));
  }, [token]);

  const loadSnapshot = useCallback(async (id: string | null) => {
    if (!token || !id) { setSnapshot(null); return; }
    setSnapshot(await getHousehold(token, id));
  }, [token]);

  useEffect(() => { void loadList().catch(() => setError('Household information could not be loaded.')); }, [loadList]);
  useEffect(() => { void loadSnapshot(selectedId).catch(() => setError('Household information could not be loaded.')); }, [loadSnapshot, selectedId]);

  const otherMembers = useMemo(
    () => snapshot?.members.filter((member) => member.userId !== session.memberId) ?? [],
    [snapshot, session.memberId],
  );

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await action();
      await loadList();
      await loadSnapshot(selectedId);
      setNotice(message);
    } catch {
      setError('That household change could not be completed. Nothing was silently changed.');
    } finally { setBusy(false); }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!token || !name.trim()) return;
    setBusy(true); setError(null);
    try {
      const created = await createHousehold(token, name.trim());
      setName('');
      await loadList();
      setSelectedId(created.id);
      setNotice('Household created. It does not share anyone’s private data.');
    } catch { setError('Household could not be created.'); }
    finally { setBusy(false); }
  }

  if (!token) return null;

  return (
    <section aria-labelledby="household-heading">
      <h2 id="household-heading">Household &amp; relationships</h2>
      <p><strong>Same household does not mean shared private data.</strong> Conversations, documents, accounts, legal matters, and Responsibilities stay private unless the person gives separate exact permission.</p>
      <p>Relationship and dependency notes are member-reported context, not legal findings or automatic authority.</p>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <Card>
        <form onSubmit={(event) => void create(event)}>
          <FormField id="household-name" label="Create a household" value={name} onChange={setName} maxLength={120} />
          <Button type="submit" disabled={busy || !name.trim()}>Create household</Button>
        </form>
      </Card>

      {list?.invitations.map((invitation) => (
        <Card key={invitation.id}>
          <h3>Household invitation</h3>
          <p>{invitation.name}</p>
          <Button disabled={busy} onClick={() => void run(() => acceptHouseholdInvitation(token, invitation.id), 'Invitation accepted. Membership still grants no access to private data.')}>Accept</Button>{' '}
          <Button variant="secondary" disabled={busy} onClick={() => void run(() => declineHouseholdInvitation(token, invitation.id), 'Invitation declined. Your Aureus standing is unchanged.')}>Decline</Button>
        </Card>
      ))}

      {list && list.households.length > 1 ? (
        <label>
          Household
          <select value={selectedId ?? ''} onChange={(event) => setSelectedId(event.target.value)}>
            {list.households.map((household) => <option key={household.id} value={household.id}>{household.name}</option>)}
          </select>
        </label>
      ) : null}

      {snapshot ? (
        <Card>
          <h3>{snapshot.name}</h3>
          <p>{snapshot.privacyNotice}</p>
          <h4>Members</h4>
          <ul>{snapshot.members.map((member) => (
            <li key={member.userId}>
              {member.displayName} · {member.role.toLowerCase()}
              {snapshot.currentMemberRole === 'ORGANIZER' && member.userId !== session.memberId ? (
                <> <Button variant="secondary" disabled={busy} onClick={() => void run(() => removeHouseholdMember(token, snapshot.id, member.userId), 'Member removed. No private data or authority transferred.')}>Remove</Button></>
              ) : null}
            </li>
          ))}</ul>

          {snapshot.currentMemberRole === 'ORGANIZER' ? (
            <form onSubmit={(event) => { event.preventDefault(); if (inviteEmail.trim()) void run(() => inviteHouseholdMember(token, snapshot.id, inviteEmail.trim()), 'If that address belongs to an eligible Aureus member, they can now see an invitation.'); setInviteEmail(''); }}>
              <FormField id="household-invite-email" label="Invite an Aureus member by account email" value={inviteEmail} onChange={setInviteEmail} maxLength={320} />
              <Button type="submit" disabled={busy || !inviteEmail.trim()}>Send invitation</Button>
            </form>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => void run(() => leaveHousehold(token, snapshot.id), 'You left the household. Your private Aureus record remains yours.')}>Leave household</Button>
          )}

          {otherMembers.length > 0 ? (
            <form onSubmit={(event) => { event.preventDefault(); if (!relatedUserId) return; void run(() => reportHouseholdRelationship(token, snapshot.id, { relatedUserId, kind: relationshipKind, dependency }), 'Relationship context saved as member-reported, not verified legal authority.'); }}>
              <h4>Report a relationship</h4>
              <label>Person<select value={relatedUserId} onChange={(event) => setRelatedUserId(event.target.value)}><option value="">Choose a member</option>{otherMembers.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></label>
              <label>Relationship<select value={relationshipKind} onChange={(event) => setRelationshipKind(event.target.value as HouseholdRelationshipKind)}>{relationshipKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label>Dependency<select value={dependency} onChange={(event) => setDependency(event.target.value as HouseholdDependencyDirection)}>{dependencyKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <Button type="submit" disabled={busy || !relatedUserId}>Save relationship context</Button>
            </form>
          ) : null}

          <h4>Relationship context involving you</h4>
          {snapshot.relationships.length === 0 ? <p>None reported.</p> : <ul>{snapshot.relationships.map((relationship) => (
            <li key={relationship.id}>{relationship.reportedByDisplayName} → {relationship.relatedDisplayName}: {relationship.kind.toLowerCase().replaceAll('_', ' ')} · {relationship.dependency.toLowerCase().replaceAll('_', ' ')} · reported</li>
          ))}</ul>}

          <h4>Responsibilities explicitly shared with you</h4>
          {snapshot.sharedResponsibilities.length === 0 ? <p>None currently shared.</p> : <ul>{snapshot.sharedResponsibilities.map((responsibility) => <li key={responsibility.id}>{responsibility.objective} · {responsibility.status.toLowerCase().replaceAll('_', ' ')}</li>)}</ul>}
          <p>Sharing or delegated action requires a separate exact permission in Trust &amp; Permissions.</p>
        </Card>
      ) : null}
    </section>
  );
}
''')

(profile_dir / "HouseholdPanel.test.tsx").write_text(r'''import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { HouseholdPanel } from './HouseholdPanel';
import * as apiModule from '../../../lib/api/households';

jest.mock('../../../lib/api/households');
const api = apiModule as jest.Mocked<typeof apiModule>;

function SignedIn({ children }: { children: React.ReactNode }) {
  const { session, setSession } = useSession();
  if (!session.isAuthenticated) setSession({ ...session, isAuthenticated: true, accessToken: 'token', memberId: 'me' });
  return <>{children}</>;
}

const list: apiModule.HouseholdList = {
  households: [{ id: 'h1', name: 'Our home', role: 'ORGANIZER', createdAt: '2026-09-18T00:00:00Z' }],
  invitations: [{ id: 'h2', name: 'Care circle', invitedAt: '2026-09-18T00:00:00Z' }],
};
const snapshot: apiModule.HouseholdSnapshot = {
  id: 'h1', name: 'Our home', currentMemberRole: 'ORGANIZER',
  privacyNotice: 'Same household does not mean shared private data. Sharing and acting require separate explicit permission.',
  members: [
    { userId: 'me', displayName: 'Me', role: 'ORGANIZER', joinedAt: null },
    { userId: 'bob', displayName: 'Bob', role: 'MEMBER', joinedAt: null },
  ],
  relationships: [{ id: 'r1', reportedByUserId: 'me', relatedUserId: 'bob', kind: 'CAREGIVER', dependency: 'THEY_DEPEND_ON_ME', provenance: 'REPORTED', reportedByDisplayName: 'Me', relatedDisplayName: 'Bob' }],
  sharedResponsibilities: [{ id: 'resp1', objective: 'Keep rent plan on track', status: 'ACTIVE' }],
};

describe('HouseholdPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.listMyHouseholds.mockResolvedValue(list);
    api.getHousehold.mockResolvedValue(snapshot);
    api.acceptHouseholdInvitation.mockResolvedValue({});
    api.declineHouseholdInvitation.mockResolvedValue({});
    api.inviteHouseholdMember.mockResolvedValue({ acceptedForDelivery: true });
    api.removeHouseholdMember.mockResolvedValue({});
    api.reportHouseholdRelationship.mockResolvedValue({});
  });

  it('states the privacy boundary and shows only bounded household continuity facts', async () => {
    render(<SessionProvider><SignedIn><HouseholdPanel /></SignedIn></SessionProvider>);
    expect(await screen.findByText(/Same household does not mean shared private data/i)).toBeInTheDocument();
    expect(await screen.findByText(/Keep rent plan on track/i)).toBeInTheDocument();
    expect(screen.getByText(/member-reported context, not legal findings/i)).toBeInTheDocument();
    expect(screen.getByText(/Me → Bob/i)).toBeInTheDocument();
  });

  it('accepts and declines invitations without implying data sharing', async () => {
    const user = userEvent.setup();
    render(<SessionProvider><SignedIn><HouseholdPanel /></SignedIn></SessionProvider>);
    await screen.findByText('Care circle');
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(api.acceptHouseholdInvitation).toHaveBeenCalledWith('token', 'h2');
    expect(await screen.findByText(/Membership still grants no access to private data/i)).toBeInTheDocument();
  });
});
''')

profile = "apps/web/design-system/components/profile/ProfilePage.tsx"
replace_once(profile, "import styles from './ProfilePage.module.css';", "import styles from './ProfilePage.module.css';\nimport { HouseholdPanel } from './HouseholdPanel';")
replace_once(profile, "      ) : null}\n    </div>\n  );", "      ) : null}\n\n      {!isEditing ? <HouseholdPanel /> : null}\n    </div>\n  );")

profile_test = "apps/web/design-system/components/profile/ProfilePage.test.tsx"
replace_once(profile_test, "jest.mock('../../../lib/api/profile');", "jest.mock('../../../lib/api/profile');\njest.mock('./HouseholdPanel', () => ({ HouseholdPanel: () => <div>Household continuity</div> }));")
replace_once(profile_test, "    expect(screen.getByText('Austin, Texas, United States')).toBeInTheDocument();", "    expect(screen.getByText('Austin, Texas, United States')).toBeInTheDocument();\n    expect(screen.getByText('Household continuity')).toBeInTheDocument();")

# ---------------------------------------------------------------------------
# Remove builder machinery from the resulting candidate.
# ---------------------------------------------------------------------------
Path('.household-builder-trigger').unlink(missing_ok=True)
Path('.github/workflows/people-household-builder.yml').unlink(missing_ok=True)
Path('scripts/people_household_builder.py').unlink(missing_ok=True)
