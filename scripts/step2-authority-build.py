from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parents[1]

def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dedent(content).lstrip(), encoding='utf-8')

# ---------------------------------------------------------------------------
# Prisma schema: runtime authority is deliberately separate from arrival consent.
# ---------------------------------------------------------------------------
schema_path = ROOT / 'prisma/schema.prisma'
schema = schema_path.read_text(encoding='utf-8')

user_anchor = '  consentRecords             ConsentRecord[]\n'
if 'authorityRequestsAsSubject' not in schema:
    schema = schema.replace(
        user_anchor,
        user_anchor
        + '  authorityRequestsAsSubject   AuthorityRequest[]         @relation("AuthorityRequestSubject")\n'
        + '  authorityGrantsAsSubject     AuthorityGrant[]           @relation("AuthorityGrantSubject")\n'
        + '  authorityStatesAsSubject     AuthorityCapabilityState[] @relation("AuthorityCapabilityStateSubject")\n',
        1,
    )

org_anchor = '  responsibilitiesAsPrincipal Responsibility[] @relation("ResponsibilityPrincipalOrganization")\n'
if 'authorityRequests             AuthorityRequest[]' not in schema:
    schema = schema.replace(
        org_anchor,
        '  authorityRequests             AuthorityRequest[]         @relation("AuthorityRequestOrganization")\n'
        + '  authorityGrants               AuthorityGrant[]           @relation("AuthorityGrantOrganization")\n'
        + '  authorityCapabilityStates     AuthorityCapabilityState[] @relation("AuthorityCapabilityStateOrganization")\n'
        + org_anchor,
        1,
    )

authority_block = r'''
// ===========================================================================
// Authority, Consent & Trust — Step 2
// Runtime permission is separate from ConsentRecord (arrival expectations).
// A request never grants authority. Only an approved request can create an
// active grant; revocation/suspension are evaluated from the database on every
// gateway decision. Secrets/raw transcripts are never fields in this ledger.
// ===========================================================================

enum AuthorityContextType {
  PERSONAL
  BUSINESS_TENANT
}

enum AuthorityCapability {
  SEE
  LISTEN
  READ
  WRITE
  SHARE
  ACT
}

enum AuthorityResourceClass {
  MICROPHONE
  SCREEN
  CONVERSATION
  CONNECTED_ACCOUNT
  CALENDAR
  EMAIL
  FILES
  BUSINESS_DATA
  OTHER
}

enum AuthorityRequestSource {
  USER
  AUREUS
  DERIVED_PATTERN
}

enum AuthorityRequestStatus {
  PENDING
  APPROVED
  DENIED
  CANCELLED
}

enum AuthorityGrantStatus {
  ACTIVE
  REVOKED
}

enum AuthorityCapabilityStatus {
  ACTIVE
  SUSPENDED
}

enum AuthorityEventType {
  REQUEST_CREATED
  REQUEST_APPROVED
  REQUEST_DENIED
  GRANT_CREATED
  GRANT_REVOKED
  CAPABILITY_SUSPENDED
  CAPABILITY_RESUMED
}

enum AuthorityDecisionResult {
  PERMIT
  NEEDS_APPROVAL
  DENY
}

model AuthorityRequest {
  id             String                 @id @default(uuid()) @db.Uuid
  contextType    AuthorityContextType
  subjectUserId  String?                @db.Uuid
  subjectUser    User?                  @relation("AuthorityRequestSubject", fields: [subjectUserId], references: [id], onDelete: Cascade)
  organizationId String?                @db.Uuid
  organization   Organization?          @relation("AuthorityRequestOrganization", fields: [organizationId], references: [id], onDelete: Cascade)
  capability     AuthorityCapability
  resourceClass  AuthorityResourceClass
  resourceRef    String?
  purpose        String
  source         AuthorityRequestSource @default(USER)
  status         AuthorityRequestStatus @default(PENDING)
  policyVersion  String                 @default("step2-v1")
  requestedByUserId String?             @db.Uuid
  approvedByUserId  String?             @db.Uuid
  deniedByUserId    String?             @db.Uuid
  expiresAt      DateTime?
  decidedAt      DateTime?
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  grant AuthorityGrant?

  @@index([subjectUserId, status, createdAt])
  @@index([organizationId, status, createdAt])
  @@index([capability, resourceClass, status])
}

model AuthorityGrant {
  id             String                 @id @default(uuid()) @db.Uuid
  requestId      String                 @unique @db.Uuid
  request        AuthorityRequest       @relation(fields: [requestId], references: [id], onDelete: Restrict)
  contextType    AuthorityContextType
  subjectUserId  String?                @db.Uuid
  subjectUser    User?                  @relation("AuthorityGrantSubject", fields: [subjectUserId], references: [id], onDelete: Cascade)
  organizationId String?                @db.Uuid
  organization   Organization?          @relation("AuthorityGrantOrganization", fields: [organizationId], references: [id], onDelete: Cascade)
  capability     AuthorityCapability
  resourceClass  AuthorityResourceClass
  resourceRef    String?
  purpose        String
  policyVersion  String
  status         AuthorityGrantStatus   @default(ACTIVE)
  expiresAt      DateTime?
  revokedAt      DateTime?
  revokedByUserId String?               @db.Uuid
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  @@index([subjectUserId, status, capability, resourceClass])
  @@index([organizationId, status, capability, resourceClass])
  @@index([expiresAt])
}

model AuthorityCapabilityState {
  id             String                    @id @default(uuid()) @db.Uuid
  scopeKey       String
  contextType    AuthorityContextType
  subjectUserId  String?                   @db.Uuid
  subjectUser    User?                     @relation("AuthorityCapabilityStateSubject", fields: [subjectUserId], references: [id], onDelete: Cascade)
  organizationId String?                   @db.Uuid
  organization   Organization?             @relation("AuthorityCapabilityStateOrganization", fields: [organizationId], references: [id], onDelete: Cascade)
  capability     AuthorityCapability
  status         AuthorityCapabilityStatus @default(ACTIVE)
  suspendedReason String?
  suspendedAt    DateTime?
  suspendedByUserId String?                 @db.Uuid
  resumedAt      DateTime?
  resumedByUserId String?                   @db.Uuid
  createdAt      DateTime                   @default(now())
  updatedAt      DateTime                   @updatedAt

  @@unique([scopeKey, capability])
  @@index([subjectUserId, status])
  @@index([organizationId, status])
}

model AuthorityEvent {
  id             String                 @id @default(uuid()) @db.Uuid
  eventType      AuthorityEventType
  actorUserId    String?                @db.Uuid
  requestId      String?                @db.Uuid
  grantId        String?                @db.Uuid
  contextType    AuthorityContextType
  subjectUserId  String?                @db.Uuid
  organizationId String?                @db.Uuid
  capability     AuthorityCapability?
  resourceClass  AuthorityResourceClass?
  resourceRef    String?
  reason         String?
  occurredAt     DateTime               @default(now())

  @@index([subjectUserId, occurredAt])
  @@index([organizationId, occurredAt])
  @@index([requestId])
  @@index([grantId])
}

model AuthorityDecision {
  id             String                  @id @default(uuid()) @db.Uuid
  actorUserId    String?                 @db.Uuid
  contextType    AuthorityContextType
  subjectUserId  String?                 @db.Uuid
  organizationId String?                 @db.Uuid
  capability     AuthorityCapability
  resourceClass  AuthorityResourceClass
  resourceRef    String?
  result         AuthorityDecisionResult
  reason         String
  grantId        String?                 @db.Uuid
  policyVersion  String
  createdAt      DateTime                @default(now())

  @@index([subjectUserId, createdAt])
  @@index([organizationId, createdAt])
  @@index([result, createdAt])
}
'''

responsibility_anchor = '// ===========================================================================\n// Responsibility Core — PA-021 / OR-001\n'
if 'model AuthorityRequest {' not in schema:
    schema = schema.replace(responsibility_anchor, authority_block + '\n' + responsibility_anchor, 1)

schema_path.write_text(schema, encoding='utf-8')

# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------
write('prisma/migrations/20260913023000_step2_authority_consent_trust/migration.sql', r'''
-- Step 2 — Authority, Consent & Trust.
CREATE TYPE "AuthorityContextType" AS ENUM ('PERSONAL', 'BUSINESS_TENANT');
CREATE TYPE "AuthorityCapability" AS ENUM ('SEE', 'LISTEN', 'READ', 'WRITE', 'SHARE', 'ACT');
CREATE TYPE "AuthorityResourceClass" AS ENUM ('MICROPHONE', 'SCREEN', 'CONVERSATION', 'CONNECTED_ACCOUNT', 'CALENDAR', 'EMAIL', 'FILES', 'BUSINESS_DATA', 'OTHER');
CREATE TYPE "AuthorityRequestSource" AS ENUM ('USER', 'AUREUS', 'DERIVED_PATTERN');
CREATE TYPE "AuthorityRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');
CREATE TYPE "AuthorityGrantStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "AuthorityCapabilityStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "AuthorityEventType" AS ENUM ('REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_DENIED', 'GRANT_CREATED', 'GRANT_REVOKED', 'CAPABILITY_SUSPENDED', 'CAPABILITY_RESUMED');
CREATE TYPE "AuthorityDecisionResult" AS ENUM ('PERMIT', 'NEEDS_APPROVAL', 'DENY');

CREATE TABLE "AuthorityRequest" (
  "id" UUID NOT NULL,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "resourceClass" "AuthorityResourceClass" NOT NULL,
  "resourceRef" TEXT,
  "purpose" TEXT NOT NULL,
  "source" "AuthorityRequestSource" NOT NULL DEFAULT 'USER',
  "status" "AuthorityRequestStatus" NOT NULL DEFAULT 'PENDING',
  "policyVersion" TEXT NOT NULL DEFAULT 'step2-v1',
  "requestedByUserId" UUID,
  "approvedByUserId" UUID,
  "deniedByUserId" UUID,
  "expiresAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorityRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityRequest_context_check" CHECK (
    ("contextType" = 'PERSONAL' AND "organizationId" IS NULL AND "subjectUserId" IS NOT NULL)
    OR ("contextType" = 'BUSINESS_TENANT' AND "organizationId" IS NOT NULL)
  )
);

CREATE TABLE "AuthorityGrant" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "resourceClass" "AuthorityResourceClass" NOT NULL,
  "resourceRef" TEXT,
  "purpose" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "status" "AuthorityGrantStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorityGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityGrant_context_check" CHECK (
    ("contextType" = 'PERSONAL' AND "organizationId" IS NULL AND "subjectUserId" IS NOT NULL)
    OR ("contextType" = 'BUSINESS_TENANT' AND "organizationId" IS NOT NULL)
  )
);

CREATE TABLE "AuthorityCapabilityState" (
  "id" UUID NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "status" "AuthorityCapabilityStatus" NOT NULL DEFAULT 'ACTIVE',
  "suspendedReason" TEXT,
  "suspendedAt" TIMESTAMP(3),
  "suspendedByUserId" UUID,
  "resumedAt" TIMESTAMP(3),
  "resumedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorityCapabilityState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityCapabilityState_context_check" CHECK (
    ("contextType" = 'PERSONAL' AND "organizationId" IS NULL AND "subjectUserId" IS NOT NULL)
    OR ("contextType" = 'BUSINESS_TENANT' AND "organizationId" IS NOT NULL)
  )
);

CREATE TABLE "AuthorityEvent" (
  "id" UUID NOT NULL,
  "eventType" "AuthorityEventType" NOT NULL,
  "actorUserId" UUID,
  "requestId" UUID,
  "grantId" UUID,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability",
  "resourceClass" "AuthorityResourceClass",
  "resourceRef" TEXT,
  "reason" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthorityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthorityDecision" (
  "id" UUID NOT NULL,
  "actorUserId" UUID,
  "contextType" "AuthorityContextType" NOT NULL,
  "subjectUserId" UUID,
  "organizationId" UUID,
  "capability" "AuthorityCapability" NOT NULL,
  "resourceClass" "AuthorityResourceClass" NOT NULL,
  "resourceRef" TEXT,
  "result" "AuthorityDecisionResult" NOT NULL,
  "reason" TEXT NOT NULL,
  "grantId" UUID,
  "policyVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthorityDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthorityGrant_requestId_key" ON "AuthorityGrant"("requestId");
CREATE UNIQUE INDEX "AuthorityCapabilityState_scopeKey_capability_key" ON "AuthorityCapabilityState"("scopeKey", "capability");
CREATE INDEX "AuthorityRequest_subjectUserId_status_createdAt_idx" ON "AuthorityRequest"("subjectUserId", "status", "createdAt");
CREATE INDEX "AuthorityRequest_organizationId_status_createdAt_idx" ON "AuthorityRequest"("organizationId", "status", "createdAt");
CREATE INDEX "AuthorityRequest_capability_resourceClass_status_idx" ON "AuthorityRequest"("capability", "resourceClass", "status");
CREATE INDEX "AuthorityGrant_subjectUserId_status_capability_resourceClass_idx" ON "AuthorityGrant"("subjectUserId", "status", "capability", "resourceClass");
CREATE INDEX "AuthorityGrant_organizationId_status_capability_resourceClass_idx" ON "AuthorityGrant"("organizationId", "status", "capability", "resourceClass");
CREATE INDEX "AuthorityGrant_expiresAt_idx" ON "AuthorityGrant"("expiresAt");
CREATE INDEX "AuthorityCapabilityState_subjectUserId_status_idx" ON "AuthorityCapabilityState"("subjectUserId", "status");
CREATE INDEX "AuthorityCapabilityState_organizationId_status_idx" ON "AuthorityCapabilityState"("organizationId", "status");
CREATE INDEX "AuthorityEvent_subjectUserId_occurredAt_idx" ON "AuthorityEvent"("subjectUserId", "occurredAt");
CREATE INDEX "AuthorityEvent_organizationId_occurredAt_idx" ON "AuthorityEvent"("organizationId", "occurredAt");
CREATE INDEX "AuthorityEvent_requestId_idx" ON "AuthorityEvent"("requestId");
CREATE INDEX "AuthorityEvent_grantId_idx" ON "AuthorityEvent"("grantId");
CREATE INDEX "AuthorityDecision_subjectUserId_createdAt_idx" ON "AuthorityDecision"("subjectUserId", "createdAt");
CREATE INDEX "AuthorityDecision_organizationId_createdAt_idx" ON "AuthorityDecision"("organizationId", "createdAt");
CREATE INDEX "AuthorityDecision_result_createdAt_idx" ON "AuthorityDecision"("result", "createdAt");

ALTER TABLE "AuthorityRequest" ADD CONSTRAINT "AuthorityRequest_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityRequest" ADD CONSTRAINT "AuthorityRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AuthorityRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityGrant" ADD CONSTRAINT "AuthorityGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityCapabilityState" ADD CONSTRAINT "AuthorityCapabilityState_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorityCapabilityState" ADD CONSTRAINT "AuthorityCapabilityState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
''')

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
write('apps/api/src/authority/dto/authority.dto.ts', r'''
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityRequestSource,
  AuthorityResourceClass,
} from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAuthorityRequestDto {
  @ApiProperty({ enum: AuthorityContextType })
  @IsEnum(AuthorityContextType)
  contextType: AuthorityContextType;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subjectUserId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;

  @ApiProperty({ enum: AuthorityCapability })
  @IsEnum(AuthorityCapability)
  capability: AuthorityCapability;

  @ApiProperty({ enum: AuthorityResourceClass })
  @IsEnum(AuthorityResourceClass)
  resourceClass: AuthorityResourceClass;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  resourceRef?: string;

  @ApiProperty()
  @IsString() @MinLength(3) @MaxLength(500)
  purpose: string;

  @ApiPropertyOptional({ enum: AuthorityRequestSource, default: AuthorityRequestSource.USER })
  @IsOptional() @IsEnum(AuthorityRequestSource)
  source?: AuthorityRequestSource;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expiresAt?: string;
}

export class AuthorityReasonDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class AuthorityCapabilityControlDto {
  @ApiProperty({ enum: AuthorityContextType })
  @IsEnum(AuthorityContextType)
  contextType: AuthorityContextType;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subjectUserId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;

  @ApiProperty({ enum: AuthorityCapability })
  @IsEnum(AuthorityCapability)
  capability: AuthorityCapability;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class AuthorityEvaluationDto {
  @ApiProperty({ enum: AuthorityContextType })
  @IsEnum(AuthorityContextType)
  contextType: AuthorityContextType;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subjectUserId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;

  @ApiProperty({ enum: AuthorityCapability })
  @IsEnum(AuthorityCapability)
  capability: AuthorityCapability;

  @ApiProperty({ enum: AuthorityResourceClass })
  @IsEnum(AuthorityResourceClass)
  resourceClass: AuthorityResourceClass;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  resourceRef?: string;
}
''')

write('apps/api/src/authority/authority.service.ts', r'''
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityCapability,
  AuthorityCapabilityStatus,
  AuthorityContextType,
  AuthorityDecisionResult,
  AuthorityEventType,
  AuthorityGrantStatus,
  AuthorityRequest,
  AuthorityRequestSource,
  AuthorityRequestStatus,
  AuthorityResourceClass,
  OrganizationMemberRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthorityCapabilityControlDto,
  AuthorityEvaluationDto,
  AuthorityReasonDto,
  CreateAuthorityRequestDto,
} from './dto/authority.dto';

const POLICY_VERSION = 'step2-v1';
const ALWAYS_PERSON_CONTROLLED = new Set<AuthorityResourceClass>([
  AuthorityResourceClass.MICROPHONE,
  AuthorityResourceClass.SCREEN,
  AuthorityResourceClass.CONVERSATION,
  AuthorityResourceClass.CONNECTED_ACCOUNT,
]);
const SECRET_PATTERNS = [
  /password\s*[:=]\s*\S+/i,
  /api[_ -]?key\s*[:=]\s*\S+/i,
  /bearer\s+[A-Za-z0-9._~-]+/i,
  /sk-[A-Za-z0-9_-]{16,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

@Injectable()
export class AuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(dto: CreateAuthorityRequestDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.purpose, dto.resourceRef);
    await this.validateScope(dto, caller, true);

    if (dto.expiresAt && new Date(dto.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException('Permission expiry must be in the future');
    }

    const request = await this.prisma.db.authorityRequest.create({
      data: {
        contextType: dto.contextType,
        subjectUserId: dto.subjectUserId ?? null,
        organizationId: dto.organizationId ?? null,
        capability: dto.capability,
        resourceClass: dto.resourceClass,
        resourceRef: dto.resourceRef ?? null,
        purpose: dto.purpose.trim(),
        source: dto.source ?? AuthorityRequestSource.USER,
        requestedByUserId: caller.id,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        policyVersion: POLICY_VERSION,
      },
    });

    await this.prisma.db.authorityEvent.create({
      data: this.eventData(AuthorityEventType.REQUEST_CREATED, caller.id, request),
    });
    return request;
  }

  async approve(requestId: string, caller: AuthenticatedUser) {
    const request = await this.requestForController(requestId, caller);
    if (request.status !== AuthorityRequestStatus.PENDING) {
      throw new BadRequestException('This permission request is no longer pending');
    }
    if (request.expiresAt && request.expiresAt <= new Date()) {
      throw new BadRequestException('This permission request has expired');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const claimed = await tx.authorityRequest.updateMany({
        where: { id: request.id, status: AuthorityRequestStatus.PENDING },
        data: {
          status: AuthorityRequestStatus.APPROVED,
          approvedByUserId: caller.id,
          decidedAt: new Date(),
        },
      });
      if (claimed.count !== 1) throw new BadRequestException('This permission request is no longer pending');

      const grant = await tx.authorityGrant.create({
        data: {
          requestId: request.id,
          contextType: request.contextType,
          subjectUserId: request.subjectUserId,
          organizationId: request.organizationId,
          capability: request.capability,
          resourceClass: request.resourceClass,
          resourceRef: request.resourceRef,
          purpose: request.purpose,
          policyVersion: request.policyVersion,
          expiresAt: request.expiresAt,
        },
      });
      await tx.authorityEvent.createMany({
        data: [
          this.eventData(AuthorityEventType.REQUEST_APPROVED, caller.id, request),
          { ...this.eventData(AuthorityEventType.GRANT_CREATED, caller.id, request), grantId: grant.id },
        ],
      });
      return grant;
    });
  }

  async deny(requestId: string, dto: AuthorityReasonDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.reason);
    const request = await this.requestForController(requestId, caller);
    if (request.status !== AuthorityRequestStatus.PENDING) {
      throw new BadRequestException('This permission request is no longer pending');
    }
    const claimed = await this.prisma.db.authorityRequest.updateMany({
      where: { id: request.id, status: AuthorityRequestStatus.PENDING },
      data: { status: AuthorityRequestStatus.DENIED, deniedByUserId: caller.id, decidedAt: new Date() },
    });
    if (claimed.count !== 1) throw new BadRequestException('This permission request is no longer pending');
    await this.prisma.db.authorityEvent.create({
      data: { ...this.eventData(AuthorityEventType.REQUEST_DENIED, caller.id, request), reason: dto.reason ?? 'Denied by approver' },
    });
    return { id: request.id, status: AuthorityRequestStatus.DENIED };
  }

  async revoke(grantId: string, dto: AuthorityReasonDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.reason);
    const grant = await this.prisma.db.authorityGrant.findUnique({ where: { id: grantId } });
    if (!grant || !(await this.canControl(grant, caller.id))) throw new NotFoundException('Permission not found');
    if (grant.status === AuthorityGrantStatus.REVOKED) return grant;

    const revoked = await this.prisma.db.authorityGrant.update({
      where: { id: grant.id },
      data: { status: AuthorityGrantStatus.REVOKED, revokedAt: new Date(), revokedByUserId: caller.id },
    });
    await this.prisma.db.authorityEvent.create({
      data: {
        eventType: AuthorityEventType.GRANT_REVOKED,
        actorUserId: caller.id,
        grantId: grant.id,
        contextType: grant.contextType,
        subjectUserId: grant.subjectUserId,
        organizationId: grant.organizationId,
        capability: grant.capability,
        resourceClass: grant.resourceClass,
        resourceRef: grant.resourceRef,
        reason: dto.reason ?? 'Permission revoked',
      },
    });
    return revoked;
  }

  async suspend(dto: AuthorityCapabilityControlDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.reason);
    await this.assertScopeController(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);
    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);
    const state = await this.prisma.db.authorityCapabilityState.upsert({
      where: { scopeKey_capability: { scopeKey, capability: dto.capability } },
      create: {
        scopeKey,
        contextType: dto.contextType,
        subjectUserId: dto.subjectUserId ?? null,
        organizationId: dto.organizationId ?? null,
        capability: dto.capability,
        status: AuthorityCapabilityStatus.SUSPENDED,
        suspendedReason: dto.reason ?? 'Member suspended this capability',
        suspendedAt: new Date(),
        suspendedByUserId: caller.id,
      },
      update: {
        status: AuthorityCapabilityStatus.SUSPENDED,
        suspendedReason: dto.reason ?? 'Member suspended this capability',
        suspendedAt: new Date(),
        suspendedByUserId: caller.id,
        resumedAt: null,
        resumedByUserId: null,
      },
    });
    await this.prisma.db.authorityEvent.create({
      data: {
        eventType: AuthorityEventType.CAPABILITY_SUSPENDED,
        actorUserId: caller.id,
        contextType: dto.contextType,
        subjectUserId: dto.subjectUserId ?? null,
        organizationId: dto.organizationId ?? null,
        capability: dto.capability,
        reason: state.suspendedReason,
      },
    });
    return state;
  }

  async resume(dto: AuthorityCapabilityControlDto, caller: AuthenticatedUser) {
    await this.assertScopeController(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);
    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);
    const state = await this.prisma.db.authorityCapabilityState.upsert({
      where: { scopeKey_capability: { scopeKey, capability: dto.capability } },
      create: {
        scopeKey,
        contextType: dto.contextType,
        subjectUserId: dto.subjectUserId ?? null,
        organizationId: dto.organizationId ?? null,
        capability: dto.capability,
        status: AuthorityCapabilityStatus.ACTIVE,
        resumedAt: new Date(),
        resumedByUserId: caller.id,
      },
      update: {
        status: AuthorityCapabilityStatus.ACTIVE,
        resumedAt: new Date(),
        resumedByUserId: caller.id,
      },
    });
    await this.prisma.db.authorityEvent.create({
      data: {
        eventType: AuthorityEventType.CAPABILITY_RESUMED,
        actorUserId: caller.id,
        contextType: dto.contextType,
        subjectUserId: dto.subjectUserId ?? null,
        organizationId: dto.organizationId ?? null,
        capability: dto.capability,
        reason: 'Capability restored; existing grants are still evaluated normally',
      },
    });
    return state;
  }

  async evaluateForCaller(dto: AuthorityEvaluationDto, caller: AuthenticatedUser) {
    await this.assertCanInspect(dto.contextType, dto.subjectUserId, dto.organizationId, caller.id);
    return this.evaluate(dto, caller.id);
  }

  /** Non-model policy gateway for future executors. No cache: every call reads current grant/suspension state. */
  async evaluate(dto: AuthorityEvaluationDto, actorUserId?: string) {
    const shapeError = await this.scopeError(dto.contextType, dto.subjectUserId, dto.organizationId);
    if (shapeError) return this.recordDecision(dto, AuthorityDecisionResult.DENY, shapeError, null, actorUserId);

    if (dto.resourceClass === AuthorityResourceClass.CONVERSATION && !dto.resourceRef) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Conversation authority requires an exact conversation reference', null, actorUserId);
    }

    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);
    const capabilityState = await this.prisma.db.authorityCapabilityState.findUnique({
      where: { scopeKey_capability: { scopeKey, capability: dto.capability } },
    });
    if (capabilityState?.status === AuthorityCapabilityStatus.SUSPENDED) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Capability is suspended for this scope', null, actorUserId);
    }

    const exact = this.exactGrantWhere(dto);
    const now = new Date();
    const grant = await this.prisma.db.authorityGrant.findFirst({
      where: {
        ...exact,
        status: AuthorityGrantStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (grant) {
      return this.recordDecision(dto, AuthorityDecisionResult.PERMIT, 'Exact active permission exists', grant.id, actorUserId);
    }

    const revoked = await this.prisma.db.authorityGrant.findFirst({
      where: { ...exact, status: AuthorityGrantStatus.REVOKED },
      orderBy: { revokedAt: 'desc' },
    });
    if (revoked) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Permission was revoked', null, actorUserId);
    }

    return this.recordDecision(dto, AuthorityDecisionResult.NEEDS_APPROVAL, 'No sufficient active permission exists', null, actorUserId);
  }

  async trustSnapshot(caller: AuthenticatedUser) {
    const ownerOrgIds = await this.ownerOrganizationIds(caller.id);
    const visible = {
      OR: [
        { subjectUserId: caller.id },
        { organizationId: { in: ownerOrgIds } },
      ],
    };
    const [requests, grants, states, events, decisions] = await Promise.all([
      this.prisma.db.authorityRequest.findMany({
        where: { OR: [{ subjectUserId: caller.id }, { requestedByUserId: caller.id }, { organizationId: { in: ownerOrgIds } }] },
        orderBy: { createdAt: 'desc' }, take: 50,
      }),
      this.prisma.db.authorityGrant.findMany({ where: visible, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.db.authorityCapabilityState.findMany({ where: visible, orderBy: { updatedAt: 'desc' }, take: 50 }),
      this.prisma.db.authorityEvent.findMany({
        where: { OR: [{ actorUserId: caller.id }, { subjectUserId: caller.id }, { organizationId: { in: ownerOrgIds } }] },
        orderBy: { occurredAt: 'desc' }, take: 50,
      }),
      this.prisma.db.authorityDecision.findMany({ where: visible, orderBy: { createdAt: 'desc' }, take: 25 }),
    ]);

    return {
      policyVersion: POLICY_VERSION,
      requests: await Promise.all(requests.map(async (request) => ({
        ...request,
        canApprove: request.status === AuthorityRequestStatus.PENDING && (await this.canControl(request, caller.id)),
        canDeny: request.status === AuthorityRequestStatus.PENDING && (await this.canControl(request, caller.id)),
      }))),
      grants: await Promise.all(grants.map(async (grant) => ({
        ...grant,
        canRevoke: grant.status === AuthorityGrantStatus.ACTIVE && (await this.canControl(grant, caller.id)),
      }))),
      states,
      events,
      decisions,
    };
  }

  private async validateScope(dto: CreateAuthorityRequestDto, caller: AuthenticatedUser, creation: boolean) {
    const error = await this.scopeError(dto.contextType, dto.subjectUserId, dto.organizationId);
    if (error) throw new BadRequestException(error);

    if (dto.contextType === AuthorityContextType.PERSONAL) {
      if (dto.subjectUserId !== caller.id) throw new ForbiddenException('Personal authority can only be requested for yourself');
    } else {
      if (!(await this.isOrganizationMember(dto.organizationId!, caller.id))) {
        throw new NotFoundException('Business context not found');
      }
      if (dto.subjectUserId && !(await this.isOrganizationMember(dto.organizationId!, dto.subjectUserId))) {
        throw new NotFoundException('Business subject not found');
      }
    }

    if (ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && !dto.subjectUserId) {
      throw new BadRequestException(`${dto.resourceClass} authority must name the affected person`);
    }

    if (dto.resourceClass === AuthorityResourceClass.CONVERSATION) {
      if (!dto.resourceRef) throw new BadRequestException('Conversation authority requires an exact conversation reference');
      const conversation = await this.prisma.db.aiConversation.findFirst({
        where: { id: dto.resourceRef, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!conversation) throw new NotFoundException('Private conversation not found');
    }

    if (dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT) {
      if (!dto.resourceRef) throw new BadRequestException('Connected-account authority requires an exact account reference');
      const account = await this.prisma.db.connectedAccount.findFirst({
        where: { id: dto.resourceRef, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!account) throw new NotFoundException('Connected account not found');
    }

    if (creation && dto.capability === AuthorityCapability.SHARE && dto.resourceClass === AuthorityResourceClass.CONVERSATION && !dto.subjectUserId) {
      throw new BadRequestException('Private conversation sharing requires the person who owns the conversation');
    }
  }

  private async scopeError(contextType: AuthorityContextType, subjectUserId?: string, organizationId?: string) {
    if (contextType === AuthorityContextType.PERSONAL) {
      if (!subjectUserId || organizationId) return 'Personal authority requires one person and no organization';
      return null;
    }
    if (!organizationId) return 'Business authority requires an organization';
    if (subjectUserId && !(await this.isOrganizationMember(organizationId, subjectUserId))) return 'Business subject is not an active member of this organization';
    return null;
  }

  private async requestForController(requestId: string, caller: AuthenticatedUser) {
    const request = await this.prisma.db.authorityRequest.findUnique({ where: { id: requestId } });
    if (!request || !(await this.canControl(request, caller.id))) throw new NotFoundException('Permission request not found');
    return request;
  }

  private async canControl(record: { contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null }, userId: string) {
    if (record.subjectUserId) return record.subjectUserId === userId;
    if (!record.organizationId) return false;
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: record.organizationId, userId } },
      select: { role: true },
    });
    return membership?.role === OrganizationMemberRole.OWNER;
  }

  private async assertScopeController(contextType: AuthorityContextType, subjectUserId: string | undefined, organizationId: string | undefined, userId: string) {
    const error = await this.scopeError(contextType, subjectUserId, organizationId);
    if (error) throw new BadRequestException(error);
    if (!(await this.canControl({ contextType, subjectUserId: subjectUserId ?? null, organizationId: organizationId ?? null }, userId))) {
      throw new NotFoundException('Authority scope not found');
    }
  }

  private async assertCanInspect(contextType: AuthorityContextType, subjectUserId: string | undefined, organizationId: string | undefined, userId: string) {
    const error = await this.scopeError(contextType, subjectUserId, organizationId);
    if (error) throw new BadRequestException(error);
    if (subjectUserId) {
      if (subjectUserId !== userId) throw new NotFoundException('Authority scope not found');
      return;
    }
    if (!organizationId || !(await this.isOrganizationMember(organizationId, userId))) throw new NotFoundException('Authority scope not found');
  }

  private async isOrganizationMember(organizationId: string, userId: string) {
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } }, select: { id: true },
    });
    return Boolean(membership);
  }

  private async ownerOrganizationIds(userId: string) {
    const rows = await this.prisma.db.organizationMember.findMany({
      where: { userId, role: OrganizationMemberRole.OWNER }, select: { organizationId: true },
    });
    return rows.map((row) => row.organizationId);
  }

  private scopeKey(contextType: AuthorityContextType, subjectUserId?: string | null, organizationId?: string | null) {
    return contextType === AuthorityContextType.PERSONAL
      ? `PERSONAL:${subjectUserId}`
      : subjectUserId
        ? `BUSINESS:${organizationId}:USER:${subjectUserId}`
        : `BUSINESS:${organizationId}:ORG`;
  }

  private exactGrantWhere(dto: AuthorityEvaluationDto) {
    return {
      contextType: dto.contextType,
      subjectUserId: dto.subjectUserId ?? null,
      organizationId: dto.organizationId ?? null,
      capability: dto.capability,
      resourceClass: dto.resourceClass,
      resourceRef: dto.resourceRef ?? null,
    };
  }

  private async recordDecision(dto: AuthorityEvaluationDto, result: AuthorityDecisionResult, reason: string, grantId: string | null, actorUserId?: string) {
    const decision = await this.prisma.db.authorityDecision.create({
      data: {
        actorUserId: actorUserId ?? null,
        contextType: dto.contextType,
        subjectUserId: dto.subjectUserId ?? null,
        organizationId: dto.organizationId ?? null,
        capability: dto.capability,
        resourceClass: dto.resourceClass,
        resourceRef: dto.resourceRef ?? null,
        result,
        reason,
        grantId,
        policyVersion: POLICY_VERSION,
      },
    });
    return { result, reason, grantId, policyVersion: decision.policyVersion, decidedAt: decision.createdAt };
  }

  private eventData(eventType: AuthorityEventType, actorUserId: string, request: AuthorityRequest) {
    return {
      eventType,
      actorUserId,
      requestId: request.id,
      contextType: request.contextType,
      subjectUserId: request.subjectUserId,
      organizationId: request.organizationId,
      capability: request.capability,
      resourceClass: request.resourceClass,
      resourceRef: request.resourceRef,
    };
  }

  private assertNoSecrets(...values: Array<string | undefined>) {
    for (const value of values) {
      if (value && SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
        throw new BadRequestException('Do not put passwords, tokens, API keys, or other secret material in permission records');
      }
    }
  }
}
''')

write('apps/api/src/authority/authority.controller.ts', r'''
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorityService } from './authority.service';
import {
  AuthorityCapabilityControlDto,
  AuthorityEvaluationDto,
  AuthorityReasonDto,
  CreateAuthorityRequestDto,
} from './dto/authority.dto';

@ApiTags('authority')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('authority')
export class AuthorityController {
  constructor(private readonly service: AuthorityService) {}

  @Post('requests')
  createRequest(@Body() dto: CreateAuthorityRequestDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.createRequest(dto, caller);
  }

  @Post('requests/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.approve(id, caller);
  }

  @Post('requests/:id/deny')
  deny(@Param('id') id: string, @Body() dto: AuthorityReasonDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.deny(id, dto, caller);
  }

  @Post('grants/:id/revoke')
  revoke(@Param('id') id: string, @Body() dto: AuthorityReasonDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.revoke(id, dto, caller);
  }

  @Post('capabilities/suspend')
  suspend(@Body() dto: AuthorityCapabilityControlDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.suspend(dto, caller);
  }

  @Post('capabilities/resume')
  resume(@Body() dto: AuthorityCapabilityControlDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.resume(dto, caller);
  }

  @Post('evaluate')
  evaluate(@Body() dto: AuthorityEvaluationDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.service.evaluateForCaller(dto, caller);
  }

  @Get('trust')
  trust(@CurrentUser() caller: AuthenticatedUser) {
    return this.service.trustSnapshot(caller);
  }
}
''')

write('apps/api/src/authority/authority.module.ts', r'''
import { Module } from '@nestjs/common';
import { AuthorityController } from './authority.controller';
import { AuthorityService } from './authority.service';

@Module({
  controllers: [AuthorityController],
  providers: [AuthorityService],
  exports: [AuthorityService],
})
export class AuthorityModule {}
''')

# App module wiring.
app_path = ROOT / 'apps/api/src/app.module.ts'
app = app_path.read_text(encoding='utf-8')
if "./authority/authority.module" not in app:
    app = app.replace("import { ConsentModule } from './consent/consent.module';", "import { ConsentModule } from './consent/consent.module';\nimport { AuthorityModule } from './authority/authority.module';")
    app = app.replace('    ConsentModule,\n    PublicWardModule,', '    ConsentModule,\n    AuthorityModule,\n    PublicWardModule,')
app_path.write_text(app, encoding='utf-8')

# ---------------------------------------------------------------------------
# E2E contract tests
# ---------------------------------------------------------------------------
write('apps/api/src/authority/authority.e2e.spec.ts', r'''
import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthorityCapability, AuthorityContextType, AuthorityRequestSource, AuthorityResourceClass, OrganizationMemberRole, OrganizationType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('Authority, Consent & Trust — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const marker = `step2-${randomUUID()}`;
  let ownerId: string;
  let employeeId: string;
  let outsiderId: string;
  let ownerToken: string;
  let employeeToken: string;
  let outsiderToken: string;
  let orgId: string;
  let outsiderOrgId: string;
  let privateConversationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);

    async function register(label: string) {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: `${label}-${marker}@example.test`, password: 'Str0ng!Passw0rd',
      }).expect(201);
      return { id: response.body.user.id as string, token: response.body.tokens.accessToken as string };
    }
    const owner = await register('owner');
    const employee = await register('employee');
    const outsider = await register('outsider');
    ownerId = owner.id; ownerToken = owner.token;
    employeeId = employee.id; employeeToken = employee.token;
    outsiderId = outsider.id; outsiderToken = outsider.token;

    const org = await prisma.db.organization.create({
      data: {
        name: `Step 2 Business ${marker}`, shortDescription: 'test', fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS, websiteUrl: 'https://example.test',
        createdById: ownerId, lastUpdatedById: ownerId,
        members: { create: [
          { userId: ownerId, role: OrganizationMemberRole.OWNER },
          { userId: employeeId, role: OrganizationMemberRole.MEMBER },
        ] },
      },
    });
    orgId = org.id;
    const outsiderOrg = await prisma.db.organization.create({
      data: {
        name: `Other Business ${marker}`, shortDescription: 'test', fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS, websiteUrl: 'https://other.example.test',
        createdById: outsiderId, lastUpdatedById: outsiderId,
        members: { create: { userId: outsiderId, role: OrganizationMemberRole.OWNER } },
      },
    });
    outsiderOrgId = outsiderOrg.id;
    privateConversationId = (await prisma.db.aiConversation.create({ data: { userId: employeeId } })).id;
  });

  afterAll(async () => {
    const orgs = [orgId, outsiderOrgId].filter(Boolean);
    const users = [ownerId, employeeId, outsiderId].filter(Boolean);
    await prisma.db.authorityDecision.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { actorUserId: { in: users } }] } });
    await prisma.db.authorityEvent.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { actorUserId: { in: users } }] } });
    await prisma.db.authorityCapabilityState.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }] } });
    await prisma.db.authorityGrant.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }] } });
    await prisma.db.authorityRequest.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { requestedByUserId: { in: users } }] } });
    await prisma.db.organization.deleteMany({ where: { id: { in: orgs } } });
    await prisma.db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('keeps a pending Personal request non-authoritative, then permits only after self approval and denies immediately after revoke', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.FILES,
      purpose: 'Read files I choose for this work',
    }).expect(201);

    const evaluation = { contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId, capability: AuthorityCapability.READ, resourceClass: AuthorityResourceClass.FILES };
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('NEEDS_APPROVAL');

    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(outsiderToken)).send({}).expect(404);
    const grant = await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');

    await request(app.getHttpServer()).post(`/authority/grants/${grant.body.id}/revoke`).set(auth(employeeToken)).send({ reason: 'I changed my mind' }).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('DENY');
  });

  it('lets the business OWNER approve organization-owned authority for only that tenant', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
      purpose: 'Read approved company operating data',
    }).expect(201);

    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(outsiderToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(201);
    const evalResult = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
    }).expect(201);
    expect(evalResult.body.result).toBe('PERMIT');
  });

  it('never lets the employer approve an employee microphone permission; the employee can approve, suspend, and restore it', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(ownerToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN,
      resourceClass: AuthorityResourceClass.MICROPHONE,
      purpose: 'Listen only while I explicitly work with Aureus',
    }).expect(201);

    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);

    const evaluation = {
      contextType: AuthorityContextType.BUSINESS_TENANT, organizationId: orgId, subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN, resourceClass: AuthorityResourceClass.MICROPHONE,
    };
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');

    await request(app.getHttpServer()).post('/authority/capabilities/suspend').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT, organizationId: orgId, subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN, reason: "Aureus shouldn't have done this",
    }).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('DENY');

    await request(app.getHttpServer()).post('/authority/capabilities/resume').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT, organizationId: orgId, subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN,
    }).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');
  });

  it('requires the employee and an exact conversation reference for private transcript sharing', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(ownerToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SHARE,
      resourceClass: AuthorityResourceClass.CONVERSATION,
      resourceRef: privateConversationId,
      purpose: 'Share this exact conversation with the company',
    }).expect(201);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);

    await request(app.getHttpServer()).post('/authority/requests').set(auth(ownerToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SHARE,
      resourceClass: AuthorityResourceClass.CONVERSATION,
      purpose: 'Blanket transcript sharing',
    }).expect(400);
  });

  it('keeps derived-pattern authority as a proposal and ignores an expired grant', async () => {
    const derived = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.ACT, resourceClass: AuthorityResourceClass.OTHER,
      purpose: 'A repeated pattern suggests this may be useful', source: AuthorityRequestSource.DERIVED_PATTERN,
    }).expect(201);
    expect(derived.body.status).toBe('PENDING');

    const expiring = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.SEE, resourceClass: AuthorityResourceClass.OTHER,
      purpose: 'Temporary visibility', expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }).expect(201);
    const grant = await request(app.getHttpServer()).post(`/authority/requests/${expiring.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    await prisma.db.authorityGrant.update({ where: { id: grant.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const result = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.SEE, resourceClass: AuthorityResourceClass.OTHER,
    }).expect(201);
    expect(result.body.result).not.toBe('PERMIT');
  });

  it('rejects secret material from the authority ledger and exposes a plain trust snapshot', async () => {
    await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.READ, resourceClass: AuthorityResourceClass.OTHER,
      purpose: 'password=super-secret-value',
    }).expect(400);

    const snapshot = await request(app.getHttpServer()).get('/authority/trust').set(auth(employeeToken)).expect(200);
    expect(snapshot.body.policyVersion).toBe('step2-v1');
    expect(Array.isArray(snapshot.body.requests)).toBe(true);
    expect(Array.isArray(snapshot.body.grants)).toBe(true);
    expect(Array.isArray(snapshot.body.events)).toBe(true);
    expect(JSON.stringify(snapshot.body)).not.toContain('super-secret-value');
  });
});
''')

# ---------------------------------------------------------------------------
# Web API + Trust Center
# ---------------------------------------------------------------------------
write('apps/web/lib/api/authority.ts', r'''
import { apiRequest } from './client';

export type AuthorityContextType = 'PERSONAL' | 'BUSINESS_TENANT';
export type AuthorityCapability = 'SEE' | 'LISTEN' | 'READ' | 'WRITE' | 'SHARE' | 'ACT';
export type AuthorityResourceClass = 'MICROPHONE' | 'SCREEN' | 'CONVERSATION' | 'CONNECTED_ACCOUNT' | 'CALENDAR' | 'EMAIL' | 'FILES' | 'BUSINESS_DATA' | 'OTHER';

export interface AuthorityRequestDto {
  id: string; contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null;
  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;
  source: 'USER' | 'AUREUS' | 'DERIVED_PATTERN'; status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  canApprove: boolean; canDeny: boolean; createdAt: string;
}
export interface AuthorityGrantDto {
  id: string; contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null;
  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;
  status: 'ACTIVE' | 'REVOKED'; expiresAt: string | null; canRevoke: boolean; createdAt: string;
}
export interface AuthorityStateDto {
  id: string; contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null;
  capability: AuthorityCapability; status: 'ACTIVE' | 'SUSPENDED'; suspendedReason: string | null; updatedAt: string;
}
export interface AuthorityEventDto {
  id: string; eventType: string; capability: AuthorityCapability | null; resourceClass: AuthorityResourceClass | null;
  reason: string | null; occurredAt: string;
}
export interface AuthorityTrustSnapshot {
  policyVersion: string;
  requests: AuthorityRequestDto[];
  grants: AuthorityGrantDto[];
  states: AuthorityStateDto[];
  events: AuthorityEventDto[];
  decisions: Array<{ id: string; result: string; reason: string; createdAt: string }>;
}

export function getAuthorityTrust(accessToken: string) {
  return apiRequest<AuthorityTrustSnapshot>('/authority/trust', { accessToken });
}
export function approveAuthorityRequest(accessToken: string, id: string) {
  return apiRequest(`/authority/requests/${id}/approve`, { method: 'POST', accessToken, body: {} });
}
export function denyAuthorityRequest(accessToken: string, id: string) {
  return apiRequest(`/authority/requests/${id}/deny`, { method: 'POST', accessToken, body: { reason: 'Not approved' } });
}
export function revokeAuthorityGrant(accessToken: string, id: string) {
  return apiRequest(`/authority/grants/${id}/revoke`, { method: 'POST', accessToken, body: { reason: 'Permission taken back by member' } });
}
export function suspendAuthorityCapability(accessToken: string, grant: AuthorityGrantDto) {
  return apiRequest('/authority/capabilities/suspend', {
    method: 'POST', accessToken,
    body: {
      contextType: grant.contextType, subjectUserId: grant.subjectUserId ?? undefined,
      organizationId: grant.organizationId ?? undefined, capability: grant.capability,
      reason: "Aureus shouldn't have done this",
    },
  });
}
export function resumeAuthorityCapability(accessToken: string, state: AuthorityStateDto) {
  return apiRequest('/authority/capabilities/resume', {
    method: 'POST', accessToken,
    body: {
      contextType: state.contextType, subjectUserId: state.subjectUserId ?? undefined,
      organizationId: state.organizationId ?? undefined, capability: state.capability,
    },
  });
}
''')

write('apps/web/design-system/components/connected-experiences/TrustCenterTab.tsx', r'''
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../state';
import {
  approveAuthorityRequest,
  denyAuthorityRequest,
  getAuthorityTrust,
  resumeAuthorityCapability,
  revokeAuthorityGrant,
  suspendAuthorityCapability,
  type AuthorityTrustSnapshot,
} from '../../../lib/api/authority';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { LoadingState } from '../LoadingState/LoadingState';

export function TrustCenterTab() {
  const { session } = useSession();
  const [snapshot, setSnapshot] = useState<AuthorityTrustSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    try {
      setError(null);
      setSnapshot(await getAuthorityTrust(session.accessToken));
    } catch {
      setError('Trust & Permissions could not be loaded.');
    }
  }, [session.accessToken]);

  useEffect(() => { void load(); }, [load]);

  async function act(operation: () => Promise<unknown>) {
    setBusy(true);
    try { await operation(); await load(); }
    catch { setError('That permission change could not be completed. Nothing was silently changed.'); }
    finally { setBusy(false); }
  }

  if (!session.accessToken) return <EmptyState title="Sign in to manage trust" description="Your permissions belong to your Aureus identity." />;
  if (error) return <ErrorState title="Trust & Permissions unavailable" description={error} action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>} />;
  if (!snapshot) return <LoadingState label="Loading your permissions" />;

  const pending = snapshot.requests.filter((request) => request.status === 'PENDING');
  const active = snapshot.grants.filter((grant) => grant.status === 'ACTIVE');
  const suspended = snapshot.states.filter((state) => state.status === 'SUSPENDED');

  return (
    <div>
      <p><strong>You stay in control.</strong> Aureus asks before taking new authority. You can take permission back just as directly.</p>
      <p>Your employer cannot approve your microphone, screen, connected accounts, or private conversations for you.</p>

      <section aria-labelledby="trust-requests">
        <h3 id="trust-requests">Asking for permission</h3>
        {pending.length === 0 ? <p>Nothing is waiting for your approval.</p> : pending.map((request) => (
          <article key={request.id}>
            <strong>{request.capability} · {request.resourceClass}</strong>
            <p>{request.purpose}</p>
            <p>{request.source === 'DERIVED_PATTERN' ? 'Aureus noticed a pattern. This is only a proposal until you approve it.' : 'This request gives no authority until the right person approves it.'}</p>
            {request.canApprove ? <>
              <Button variant="primary" disabled={busy} onClick={() => void act(() => approveAuthorityRequest(session.accessToken!, request.id))}>Allow</Button>{' '}
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => denyAuthorityRequest(session.accessToken!, request.id))}>Not now</Button>
            </> : <p>Only the person who controls this information can approve it.</p>}
          </article>
        ))}
      </section>

      <section aria-labelledby="trust-active">
        <h3 id="trust-active">What Aureus may do</h3>
        {active.length === 0 ? <p>No active runtime permissions.</p> : active.map((grant) => (
          <article key={grant.id}>
            <strong>{grant.capability} · {grant.resourceClass}</strong>
            <p>{grant.purpose}</p>
            {grant.expiresAt ? <p>Ends automatically: {new Date(grant.expiresAt).toLocaleString()}</p> : null}
            {grant.canRevoke ? <>
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => revokeAuthorityGrant(session.accessToken!, grant.id))}>Take permission back</Button>{' '}
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => suspendAuthorityCapability(session.accessToken!, grant))}>Aureus shouldn&apos;t have done this</Button>
            </> : null}
          </article>
        ))}
      </section>

      <section aria-labelledby="trust-suspended">
        <h3 id="trust-suspended">Suspended capabilities</h3>
        {suspended.length === 0 ? <p>Nothing is suspended.</p> : suspended.map((state) => (
          <article key={state.id}>
            <strong>{state.capability} is suspended</strong>
            <p>{state.suspendedReason ?? 'This capability cannot run in this scope.'}</p>
            <Button variant="secondary" disabled={busy} onClick={() => void act(() => resumeAuthorityCapability(session.accessToken!, state))}>Restore capability</Button>
          </article>
        ))}
      </section>

      <section aria-labelledby="trust-history">
        <h3 id="trust-history">Recent permission history</h3>
        {snapshot.events.length === 0 ? <p>No permission history yet.</p> : <ul>{snapshot.events.slice(0, 12).map((event) => (
          <li key={event.id}>{event.eventType.replaceAll('_', ' ').toLowerCase()} {event.capability ? `· ${event.capability}` : ''}</li>
        ))}</ul>}
      </section>
    </div>
  );
}
''')

write('apps/web/design-system/components/connected-experiences/TrustCenterTab.test.tsx', r'''
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { TrustCenterTab } from './TrustCenterTab';
import * as authorityApi from '../../../lib/api/authority';

jest.mock('../../../lib/api/authority');
const api = authorityApi as jest.Mocked<typeof authorityApi>;

function SignedIn({ children }: { children: React.ReactNode }) {
  const { session, setSession } = useSession();
  if (!session.isAuthenticated) setSession({ ...session, isAuthenticated: true, accessToken: 'token', memberId: 'member-1' });
  return <>{children}</>;
}

const snapshot: authorityApi.AuthorityTrustSnapshot = {
  policyVersion: 'step2-v1',
  requests: [{ id: 'r1', contextType: 'PERSONAL', subjectUserId: 'member-1', organizationId: null, capability: 'READ', resourceClass: 'FILES', resourceRef: null, purpose: 'Read files I choose', source: 'USER', status: 'PENDING', canApprove: true, canDeny: true, createdAt: 'x' }],
  grants: [{ id: 'g1', contextType: 'PERSONAL', subjectUserId: 'member-1', organizationId: null, capability: 'LISTEN', resourceClass: 'MICROPHONE', resourceRef: null, purpose: 'Listen while I work', status: 'ACTIVE', expiresAt: null, canRevoke: true, createdAt: 'x' }],
  states: [{ id: 's1', contextType: 'PERSONAL', subjectUserId: 'member-1', organizationId: null, capability: 'ACT', status: 'SUSPENDED', suspendedReason: 'Member suspended this capability', updatedAt: 'x' }],
  events: [{ id: 'e1', eventType: 'GRANT_CREATED', capability: 'LISTEN', resourceClass: 'MICROPHONE', reason: null, occurredAt: 'x' }],
  decisions: [],
};

describe('TrustCenterTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getAuthorityTrust.mockResolvedValue(snapshot);
    api.approveAuthorityRequest.mockResolvedValue({});
    api.denyAuthorityRequest.mockResolvedValue({});
    api.revokeAuthorityGrant.mockResolvedValue({});
    api.suspendAuthorityCapability.mockResolvedValue({});
    api.resumeAuthorityCapability.mockResolvedValue({});
  });

  it('explains control plainly and exposes approve, deny, revoke, suspend, and restore actions', async () => {
    render(<SessionProvider><SignedIn><TrustCenterTab /></SignedIn></SessionProvider>);
    expect(await screen.findByText('You stay in control.')).toBeInTheDocument();
    expect(screen.getByText(/employer cannot approve your microphone/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Allow' }));
    expect(api.approveAuthorityRequest).toHaveBeenCalledWith('token', 'r1');
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(api.denyAuthorityRequest).toHaveBeenCalledWith('token', 'r1');
    await userEvent.click(screen.getByRole('button', { name: 'Take permission back' }));
    expect(api.revokeAuthorityGrant).toHaveBeenCalledWith('token', 'g1');
    await userEvent.click(screen.getByRole('button', { name: "Aureus shouldn't have done this" }));
    expect(api.suspendAuthorityCapability).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Restore capability' }));
    expect(api.resumeAuthorityCapability).toHaveBeenCalled();
  });
});
''')

# Connected Experiences becomes the Trust Center home without deleting its existing tabs.
home_path = ROOT / 'apps/web/design-system/components/connected-experiences/ConnectedExperiencesHome.tsx'
home = home_path.read_text(encoding='utf-8')
home = home.replace("import { ActivityTab } from './ActivityTab';", "import { ActivityTab } from './ActivityTab';\nimport { TrustCenterTab } from './TrustCenterTab';")
home = home.replace("type TabId = 'accounts' | 'documents' | 'activity';", "type TabId = 'trust' | 'accounts' | 'documents' | 'activity';")
home = home.replace("const TABS: ConnectedExperiencesTab[] = [\n", "const TABS: ConnectedExperiencesTab[] = [\n  { id: 'trust', label: 'Trust & Permissions' },\n")
home = home.replace("title={initialTab === 'documents' ? 'Document Review' : 'Connected Experiences'}", "title={initialTab === 'documents' ? 'Document Review' : initialTab === 'trust' ? 'Trust & Permissions' : 'Connected Experiences'}")
home = home.replace('description="Your Steward never assumes access. Every connection here is opt-in, revocable, and explained plainly."', 'description="Aureus asks before new authority. You can see what is allowed and take permission back directly."')
marker = '      <div\n        role="tabpanel"\n        id="connected-experiences-panel-accounts"'
trust_panel = '''      <div\n        role="tabpanel"\n        id="connected-experiences-panel-trust"\n        aria-labelledby="connected-experiences-tab-trust"\n        hidden={activeTab !== 'trust'}\n      >\n        {activeTab === 'trust' ? <TrustCenterTab /> : null}\n      </div>\n'''
if 'connected-experiences-panel-trust' not in home:
    home = home.replace(marker, trust_panel + marker, 1)
home_path.write_text(home, encoding='utf-8')

permissions_path = ROOT / 'apps/web/app/(member)/permissions/page.tsx'
permissions = permissions_path.read_text(encoding='utf-8').replace('initialTab="accounts"', 'initialTab="trust"')
permissions_path.write_text(permissions, encoding='utf-8')

surfaces_path = ROOT / 'apps/web/design-system/navigation/surfaces.ts'
surfaces = surfaces_path.read_text(encoding='utf-8').replace("{ id: 'permissions', label: 'Connected Experiences', href: '/permissions', tier: 'secondary' }", "{ id: 'permissions', label: 'Trust & Permissions', href: '/permissions', tier: 'secondary' }")
surfaces_path.write_text(surfaces, encoding='utf-8')
