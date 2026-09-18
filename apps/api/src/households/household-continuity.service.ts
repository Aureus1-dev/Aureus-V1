import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHouseholdDependencyDto,
  CreateHouseholdDto,
  CreateHouseholdRelationshipDto,
  HouseholdDependencyDirection,
  InviteHouseholdMemberDto,
  RespondHouseholdProposalDto,
  ShareHouseholdResponsibilityDto,
} from './household-continuity.dto';

type HouseholdRow = {
  id: string;
  label: string | null;
  status: string;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MembershipRow = {
  id: string;
  householdId: string;
  userId: string;
  status: string;
  invitedByUserId: string | null;
  joinedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
};

type RelationshipRow = {
  id: string;
  householdId: string;
  subjectUserId: string;
  relatedUserId: string;
  type: string;
  status: string;
  proposedByUserId: string;
  confirmedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DependencyRow = {
  id: string;
  householdId: string;
  dependentUserId: string;
  supporterUserId: string;
  kind: string;
  status: string;
  proposedByUserId: string;
  confirmedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ResponsibilityShareRow = {
  id: string;
  householdId: string;
  responsibilityId: string;
  ownerUserId: string;
  participantUserId: string;
  status: string;
  invitedByUserId: string;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class HouseholdContinuityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHouseholdDto, caller: AuthenticatedUser) {
    const householdId = randomUUID();
    const membershipId = randomUUID();
    const label = dto.label?.trim() || null;

    await this.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "Household" ("id", "label", "status", "createdByUserId", "createdAt", "updatedAt")
        VALUES (${householdId}::uuid, ${label}, 'ACTIVE'::"HouseholdStatus", ${caller.id}::uuid, NOW(), NOW())
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "HouseholdMembership" ("id", "householdId", "userId", "status", "joinedAt", "createdAt", "updatedAt")
        VALUES (${membershipId}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'ACTIVE'::"HouseholdMembershipStatus", NOW(), NOW(), NOW())
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
        VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'HOUSEHOLD_CREATED', 'HOUSEHOLD', ${householdId}::uuid, NOW())
      `);
    });

    return this.findOne(householdId, caller);
  }

  async findMine(caller: AuthenticatedUser) {
    return this.prisma.db.$queryRaw<Array<{
      id: string;
      label: string | null;
      householdStatus: string;
      membershipId: string;
      membershipStatus: string;
      joinedAt: Date | null;
      createdAt: Date;
    }>>(Prisma.sql`
      SELECT
        h."id",
        h."label",
        h."status"::text AS "householdStatus",
        hm."id" AS "membershipId",
        hm."status"::text AS "membershipStatus",
        hm."joinedAt",
        h."createdAt"
      FROM "HouseholdMembership" hm
      JOIN "Household" h ON h."id" = hm."householdId"
      WHERE hm."userId" = ${caller.id}::uuid
        AND hm."status" IN ('PENDING'::"HouseholdMembershipStatus", 'ACTIVE'::"HouseholdMembershipStatus")
        AND h."status" = 'ACTIVE'::"HouseholdStatus"
      ORDER BY h."createdAt" ASC
    `);
  }

  async findOne(householdId: string, caller: AuthenticatedUser) {
    await this.assertActiveMember(householdId, caller.id);

    const households = await this.prisma.db.$queryRaw<HouseholdRow[]>(Prisma.sql`
      SELECT "id", "label", "status"::text AS "status", "createdByUserId", "createdAt", "updatedAt"
      FROM "Household"
      WHERE "id" = ${householdId}::uuid AND "status" = 'ACTIVE'::"HouseholdStatus"
      LIMIT 1
    `);
    const household = households[0];
    if (!household) throw new NotFoundException('Household not found');

    const members = await this.prisma.db.$queryRaw<Array<{
      membershipId: string;
      userId: string;
      joinedAt: Date | null;
    }>>(Prisma.sql`
      SELECT "id" AS "membershipId", "userId", "joinedAt"
      FROM "HouseholdMembership"
      WHERE "householdId" = ${householdId}::uuid
        AND "status" = 'ACTIVE'::"HouseholdMembershipStatus"
      ORDER BY "createdAt" ASC
    `);

    // Privacy boundary: a household member sees only relationship/dependency
    // edges that involve them. Household membership never becomes a graph-wide
    // surveillance feed about relationships between two other adults.
    const relationships = await this.prisma.db.$queryRaw<RelationshipRow[]>(Prisma.sql`
      SELECT
        "id", "householdId", "subjectUserId", "relatedUserId", "type"::text AS "type",
        "status"::text AS "status", "proposedByUserId", "confirmedByUserId", "createdAt", "updatedAt"
      FROM "HouseholdRelationship"
      WHERE "householdId" = ${householdId}::uuid
        AND (${caller.id}::uuid IN ("subjectUserId", "relatedUserId"))
        AND "status" IN ('PENDING'::"HouseholdRelationshipStatus", 'ACTIVE'::"HouseholdRelationshipStatus")
      ORDER BY "createdAt" ASC
    `);

    const dependencies = await this.prisma.db.$queryRaw<DependencyRow[]>(Prisma.sql`
      SELECT
        "id", "householdId", "dependentUserId", "supporterUserId", "kind"::text AS "kind",
        "status"::text AS "status", "proposedByUserId", "confirmedByUserId", "createdAt", "updatedAt"
      FROM "HouseholdDependency"
      WHERE "householdId" = ${householdId}::uuid
        AND (${caller.id}::uuid IN ("dependentUserId", "supporterUserId"))
        AND "status" IN ('PENDING'::"HouseholdDependencyStatus", 'ACTIVE'::"HouseholdDependencyStatus")
      ORDER BY "createdAt" ASC
    `);

    // Deliberately select no Responsibility objective, status, evidence, source,
    // or conversation data. Participation is coordination metadata only. The
    // Step 2 authority boundary still governs any private-data sharing.
    const sharedResponsibilities = await this.prisma.db.$queryRaw<ResponsibilityShareRow[]>(Prisma.sql`
      SELECT
        hs."id", hs."householdId", hs."responsibilityId",
        r."principalUserId" AS "ownerUserId",
        hs."participantUserId", hs."status"::text AS "status",
        hs."invitedByUserId", hs."acceptedAt", hs."createdAt", hs."updatedAt"
      FROM "HouseholdResponsibilityParticipant" hs
      JOIN "Responsibility" r ON r."id" = hs."responsibilityId"
      WHERE hs."householdId" = ${householdId}::uuid
        AND (hs."participantUserId" = ${caller.id}::uuid OR r."principalUserId" = ${caller.id}::uuid)
        AND hs."status" IN ('PENDING'::"HouseholdResponsibilityShareStatus", 'ACTIVE'::"HouseholdResponsibilityShareStatus")
      ORDER BY hs."createdAt" ASC
    `);

    return {
      id: household.id,
      label: household.label,
      status: household.status,
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
      members,
      relationships,
      dependencies,
      sharedResponsibilities,
      privacyBoundary: 'HOUSEHOLD_MEMBERSHIP_DOES_NOT_GRANT_PRIVATE_DATA_OR_ACTION_AUTHORITY',
    };
  }

  async inviteMember(householdId: string, dto: InviteHouseholdMemberDto, caller: AuthenticatedUser) {
    await this.assertActiveMember(householdId, caller.id);
    if (dto.userId === caller.id) throw new BadRequestException('You are already in this household');
    await this.assertActiveUser(dto.userId);

    const targetMembership = await this.currentMembership(householdId, dto.userId);
    if (targetMembership) throw new ConflictException('This member already has a current household invitation or membership');

    const id = randomUUID();
    try {
      await this.prisma.db.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdMembership"
            ("id", "householdId", "userId", "status", "invitedByUserId", "createdAt", "updatedAt")
          VALUES
            (${id}::uuid, ${householdId}::uuid, ${dto.userId}::uuid, 'PENDING'::"HouseholdMembershipStatus", ${caller.id}::uuid, NOW(), NOW())
        `);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
          VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'MEMBER_INVITED', 'MEMBERSHIP', ${id}::uuid, NOW())
        `);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('This member already has a current household invitation or membership');
      throw error;
    }

    return { id, householdId, userId: dto.userId, status: 'PENDING' };
  }

  async respondToInvitation(
    householdId: string,
    membershipId: string,
    dto: RespondHouseholdProposalDto,
    caller: AuthenticatedUser,
  ) {
    const rows = await this.prisma.db.$queryRaw<MembershipRow[]>(Prisma.sql`
      SELECT hm."id", hm."householdId", hm."userId", hm."status"::text AS "status", hm."invitedByUserId", hm."joinedAt", hm."endedAt", hm."createdAt"
      FROM "HouseholdMembership" hm
      JOIN "Household" h ON h."id" = hm."householdId"
      WHERE hm."id" = ${membershipId}::uuid
        AND hm."householdId" = ${householdId}::uuid
        AND hm."userId" = ${caller.id}::uuid
        AND hm."status" = 'PENDING'::"HouseholdMembershipStatus"
        AND h."status" = 'ACTIVE'::"HouseholdStatus"
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Household invitation not found');

    const next = dto.accept ? 'ACTIVE' : 'DECLINED';
    await this.prisma.db.$transaction(async (tx) => {
      const changed = await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdMembership"
        SET "status" = CAST(${next} AS "HouseholdMembershipStatus"),
            "joinedAt" = CASE WHEN ${dto.accept} THEN NOW() ELSE NULL END,
            "endedAt" = CASE WHEN ${dto.accept} THEN NULL ELSE NOW() END,
            "updatedAt" = NOW()
        WHERE "id" = ${membershipId}::uuid
          AND "status" = 'PENDING'::"HouseholdMembershipStatus"
      `);
      if (changed !== 1) throw new ConflictException('This invitation is no longer pending');
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
        VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, ${dto.accept ? 'MEMBER_JOINED' : 'MEMBER_DECLINED'}, 'MEMBERSHIP', ${membershipId}::uuid, NOW())
      `);
    });

    return dto.accept ? this.findOne(householdId, caller) : { id: membershipId, householdId, status: next };
  }

  async proposeRelationship(
    householdId: string,
    dto: CreateHouseholdRelationshipDto,
    caller: AuthenticatedUser,
  ) {
    await this.assertBothActiveMembers(householdId, caller.id, dto.otherUserId);
    if (dto.otherUserId === caller.id) throw new BadRequestException('A relationship requires another household member');

    const existing = await this.prisma.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "HouseholdRelationship"
      WHERE "householdId" = ${householdId}::uuid
        AND LEAST("subjectUserId", "relatedUserId") = LEAST(${caller.id}::uuid, ${dto.otherUserId}::uuid)
        AND GREATEST("subjectUserId", "relatedUserId") = GREATEST(${caller.id}::uuid, ${dto.otherUserId}::uuid)
        AND "status" IN ('PENDING'::"HouseholdRelationshipStatus", 'ACTIVE'::"HouseholdRelationshipStatus")
      LIMIT 1
    `);
    if (existing[0]) throw new ConflictException('A current relationship already exists between these household members');

    const id = randomUUID();
    try {
      await this.prisma.db.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdRelationship"
            ("id", "householdId", "subjectUserId", "relatedUserId", "type", "status", "proposedByUserId", "createdAt", "updatedAt")
          VALUES
            (${id}::uuid, ${householdId}::uuid, ${caller.id}::uuid, ${dto.otherUserId}::uuid,
             CAST(${dto.type} AS "HouseholdRelationshipType"), 'PENDING'::"HouseholdRelationshipStatus", ${caller.id}::uuid, NOW(), NOW())
        `);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
          VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'RELATIONSHIP_PROPOSED', 'RELATIONSHIP', ${id}::uuid, NOW())
        `);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('A current relationship already exists between these household members');
      throw error;
    }

    return { id, householdId, subjectUserId: caller.id, relatedUserId: dto.otherUserId, type: dto.type, status: 'PENDING' };
  }

  async respondToRelationship(
    householdId: string,
    relationshipId: string,
    dto: RespondHouseholdProposalDto,
    caller: AuthenticatedUser,
  ) {
    await this.assertActiveMember(householdId, caller.id);
    const rows = await this.prisma.db.$queryRaw<RelationshipRow[]>(Prisma.sql`
      SELECT "id", "householdId", "subjectUserId", "relatedUserId", "type"::text AS "type",
             "status"::text AS "status", "proposedByUserId", "confirmedByUserId", "createdAt", "updatedAt"
      FROM "HouseholdRelationship"
      WHERE "id" = ${relationshipId}::uuid
        AND "householdId" = ${householdId}::uuid
        AND "relatedUserId" = ${caller.id}::uuid
        AND "status" = 'PENDING'::"HouseholdRelationshipStatus"
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Relationship proposal not found');

    const next = dto.accept ? 'ACTIVE' : 'DECLINED';
    await this.prisma.db.$transaction(async (tx) => {
      const changed = await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdRelationship"
        SET "status" = CAST(${next} AS "HouseholdRelationshipStatus"),
            "confirmedByUserId" = CASE WHEN ${dto.accept} THEN ${caller.id}::uuid ELSE NULL END,
            "confirmedAt" = CASE WHEN ${dto.accept} THEN NOW() ELSE NULL END,
            "endedAt" = CASE WHEN ${dto.accept} THEN NULL ELSE NOW() END,
            "updatedAt" = NOW()
        WHERE "id" = ${relationshipId}::uuid
          AND "status" = 'PENDING'::"HouseholdRelationshipStatus"
      `);
      if (changed !== 1) throw new ConflictException('This relationship proposal is no longer pending');
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
        VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, ${dto.accept ? 'RELATIONSHIP_CONFIRMED' : 'RELATIONSHIP_DECLINED'}, 'RELATIONSHIP', ${relationshipId}::uuid, NOW())
      `);
    });
    return { ...rows[0], status: next, confirmedByUserId: dto.accept ? caller.id : null };
  }

  async proposeDependency(
    householdId: string,
    dto: CreateHouseholdDependencyDto,
    caller: AuthenticatedUser,
  ) {
    await this.assertBothActiveMembers(householdId, caller.id, dto.otherUserId);
    if (dto.otherUserId === caller.id) throw new BadRequestException('A dependency requires another household member');

    const dependentUserId = dto.direction === HouseholdDependencyDirection.I_SUPPORT_THEM ? dto.otherUserId : caller.id;
    const supporterUserId = dto.direction === HouseholdDependencyDirection.I_SUPPORT_THEM ? caller.id : dto.otherUserId;

    const existing = await this.prisma.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "HouseholdDependency"
      WHERE "householdId" = ${householdId}::uuid
        AND "dependentUserId" = ${dependentUserId}::uuid
        AND "supporterUserId" = ${supporterUserId}::uuid
        AND "kind" = CAST(${dto.kind} AS "HouseholdDependencyKind")
        AND "status" IN ('PENDING'::"HouseholdDependencyStatus", 'ACTIVE'::"HouseholdDependencyStatus")
      LIMIT 1
    `);
    if (existing[0]) throw new ConflictException('This current dependency already exists');

    const id = randomUUID();
    try {
      await this.prisma.db.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdDependency"
            ("id", "householdId", "dependentUserId", "supporterUserId", "kind", "status", "proposedByUserId", "createdAt", "updatedAt")
          VALUES
            (${id}::uuid, ${householdId}::uuid, ${dependentUserId}::uuid, ${supporterUserId}::uuid,
             CAST(${dto.kind} AS "HouseholdDependencyKind"), 'PENDING'::"HouseholdDependencyStatus", ${caller.id}::uuid, NOW(), NOW())
        `);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
          VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'DEPENDENCY_PROPOSED', 'DEPENDENCY', ${id}::uuid, NOW())
        `);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('This current dependency already exists');
      throw error;
    }

    return { id, householdId, dependentUserId, supporterUserId, kind: dto.kind, status: 'PENDING' };
  }

  async respondToDependency(
    householdId: string,
    dependencyId: string,
    dto: RespondHouseholdProposalDto,
    caller: AuthenticatedUser,
  ) {
    await this.assertActiveMember(householdId, caller.id);
    const rows = await this.prisma.db.$queryRaw<DependencyRow[]>(Prisma.sql`
      SELECT "id", "householdId", "dependentUserId", "supporterUserId", "kind"::text AS "kind",
             "status"::text AS "status", "proposedByUserId", "confirmedByUserId", "createdAt", "updatedAt"
      FROM "HouseholdDependency"
      WHERE "id" = ${dependencyId}::uuid
        AND "householdId" = ${householdId}::uuid
        AND ${caller.id}::uuid IN ("dependentUserId", "supporterUserId")
        AND "proposedByUserId" <> ${caller.id}::uuid
        AND "status" = 'PENDING'::"HouseholdDependencyStatus"
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Dependency proposal not found');

    const next = dto.accept ? 'ACTIVE' : 'DECLINED';
    await this.prisma.db.$transaction(async (tx) => {
      const changed = await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdDependency"
        SET "status" = CAST(${next} AS "HouseholdDependencyStatus"),
            "confirmedByUserId" = CASE WHEN ${dto.accept} THEN ${caller.id}::uuid ELSE NULL END,
            "confirmedAt" = CASE WHEN ${dto.accept} THEN NOW() ELSE NULL END,
            "endedAt" = CASE WHEN ${dto.accept} THEN NULL ELSE NOW() END,
            "updatedAt" = NOW()
        WHERE "id" = ${dependencyId}::uuid
          AND "status" = 'PENDING'::"HouseholdDependencyStatus"
      `);
      if (changed !== 1) throw new ConflictException('This dependency proposal is no longer pending');
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
        VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, ${dto.accept ? 'DEPENDENCY_CONFIRMED' : 'DEPENDENCY_DECLINED'}, 'DEPENDENCY', ${dependencyId}::uuid, NOW())
      `);
    });
    return { ...rows[0], status: next, confirmedByUserId: dto.accept ? caller.id : null };
  }

  async shareResponsibility(
    householdId: string,
    dto: ShareHouseholdResponsibilityDto,
    caller: AuthenticatedUser,
  ) {
    await this.assertBothActiveMembers(householdId, caller.id, dto.participantUserId);
    if (dto.participantUserId === caller.id) throw new BadRequestException('A shared responsibility requires another household member');

    const owned = await this.prisma.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Responsibility"
      WHERE "id" = ${dto.responsibilityId}::uuid
        AND "principalUserId" = ${caller.id}::uuid
        AND "contextType" = 'PERSONAL'::"ResponsibilityContextType"
      LIMIT 1
    `);
    if (!owned[0]) throw new NotFoundException('Responsibility not found in caller personal scope');

    const existing = await this.prisma.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "HouseholdResponsibilityParticipant"
      WHERE "responsibilityId" = ${dto.responsibilityId}::uuid
        AND "participantUserId" = ${dto.participantUserId}::uuid
        AND "status" IN ('PENDING'::"HouseholdResponsibilityShareStatus", 'ACTIVE'::"HouseholdResponsibilityShareStatus")
      LIMIT 1
    `);
    if (existing[0]) throw new ConflictException('This member already has a current participation invitation for this responsibility');

    const id = randomUUID();
    try {
      await this.prisma.db.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdResponsibilityParticipant"
            ("id", "householdId", "responsibilityId", "participantUserId", "status", "invitedByUserId", "createdAt", "updatedAt")
          VALUES
            (${id}::uuid, ${householdId}::uuid, ${dto.responsibilityId}::uuid, ${dto.participantUserId}::uuid,
             'PENDING'::"HouseholdResponsibilityShareStatus", ${caller.id}::uuid, NOW(), NOW())
        `);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
          VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'RESPONSIBILITY_PARTICIPATION_INVITED', 'RESPONSIBILITY_PARTICIPANT', ${id}::uuid, NOW())
        `);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('This member already has a current participation invitation for this responsibility');
      throw error;
    }

    return {
      id,
      householdId,
      responsibilityId: dto.responsibilityId,
      ownerUserId: caller.id,
      participantUserId: dto.participantUserId,
      status: 'PENDING',
      dataAuthorityGranted: false,
    };
  }

  async respondToResponsibilityShare(
    householdId: string,
    shareId: string,
    dto: RespondHouseholdProposalDto,
    caller: AuthenticatedUser,
  ) {
    await this.assertActiveMember(householdId, caller.id);
    const rows = await this.prisma.db.$queryRaw<ResponsibilityShareRow[]>(Prisma.sql`
      SELECT
        hs."id", hs."householdId", hs."responsibilityId", r."principalUserId" AS "ownerUserId",
        hs."participantUserId", hs."status"::text AS "status", hs."invitedByUserId", hs."acceptedAt", hs."createdAt", hs."updatedAt"
      FROM "HouseholdResponsibilityParticipant" hs
      JOIN "Responsibility" r ON r."id" = hs."responsibilityId"
      WHERE hs."id" = ${shareId}::uuid
        AND hs."householdId" = ${householdId}::uuid
        AND hs."participantUserId" = ${caller.id}::uuid
        AND hs."status" = 'PENDING'::"HouseholdResponsibilityShareStatus"
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Responsibility participation invitation not found');

    const next = dto.accept ? 'ACTIVE' : 'DECLINED';
    await this.prisma.db.$transaction(async (tx) => {
      const changed = await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdResponsibilityParticipant"
        SET "status" = CAST(${next} AS "HouseholdResponsibilityShareStatus"),
            "acceptedAt" = CASE WHEN ${dto.accept} THEN NOW() ELSE NULL END,
            "endedAt" = CASE WHEN ${dto.accept} THEN NULL ELSE NOW() END,
            "updatedAt" = NOW()
        WHERE "id" = ${shareId}::uuid
          AND "status" = 'PENDING'::"HouseholdResponsibilityShareStatus"
      `);
      if (changed !== 1) throw new ConflictException('This participation invitation is no longer pending');
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
        VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, ${dto.accept ? 'RESPONSIBILITY_PARTICIPATION_ACCEPTED' : 'RESPONSIBILITY_PARTICIPATION_DECLINED'}, 'RESPONSIBILITY_PARTICIPANT', ${shareId}::uuid, NOW())
      `);
    });

    return { ...rows[0], status: next, acceptedAt: dto.accept ? new Date() : null, dataAuthorityGranted: false };
  }

  async leave(householdId: string, caller: AuthenticatedUser) {
    const membership = await this.assertActiveMember(householdId, caller.id);
    await this.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdMembership"
        SET "status" = 'ENDED'::"HouseholdMembershipStatus", "endedAt" = NOW(), "updatedAt" = NOW()
        WHERE "id" = ${membership.id}::uuid AND "status" = 'ACTIVE'::"HouseholdMembershipStatus"
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdRelationship"
        SET "status" = 'ENDED'::"HouseholdRelationshipStatus", "endedAt" = NOW(), "updatedAt" = NOW()
        WHERE "householdId" = ${householdId}::uuid
          AND ${caller.id}::uuid IN ("subjectUserId", "relatedUserId")
          AND "status" IN ('PENDING'::"HouseholdRelationshipStatus", 'ACTIVE'::"HouseholdRelationshipStatus")
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdDependency"
        SET "status" = 'ENDED'::"HouseholdDependencyStatus", "endedAt" = NOW(), "updatedAt" = NOW()
        WHERE "householdId" = ${householdId}::uuid
          AND ${caller.id}::uuid IN ("dependentUserId", "supporterUserId")
          AND "status" IN ('PENDING'::"HouseholdDependencyStatus", 'ACTIVE'::"HouseholdDependencyStatus")
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "HouseholdResponsibilityParticipant" hs
        SET "status" = 'ENDED'::"HouseholdResponsibilityShareStatus", "endedAt" = NOW(), "updatedAt" = NOW()
        FROM "Responsibility" r
        WHERE hs."responsibilityId" = r."id"
          AND hs."householdId" = ${householdId}::uuid
          AND (hs."participantUserId" = ${caller.id}::uuid OR r."principalUserId" = ${caller.id}::uuid)
          AND hs."status" IN ('PENDING'::"HouseholdResponsibilityShareStatus", 'ACTIVE'::"HouseholdResponsibilityShareStatus")
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
        VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'MEMBER_LEFT', 'MEMBERSHIP', ${membership.id}::uuid, NOW())
      `);
      const archived = await tx.$executeRaw(Prisma.sql`
        UPDATE "Household" h
        SET "status" = 'ARCHIVED'::"HouseholdStatus", "updatedAt" = NOW()
        WHERE h."id" = ${householdId}::uuid
          AND h."status" = 'ACTIVE'::"HouseholdStatus"
          AND NOT EXISTS (
            SELECT 1 FROM "HouseholdMembership" hm
            WHERE hm."householdId" = h."id" AND hm."status" = 'ACTIVE'::"HouseholdMembershipStatus"
          )
      `);
      if (archived === 1) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "HouseholdMembership"
          SET "status" = 'ENDED'::"HouseholdMembershipStatus", "endedAt" = NOW(), "updatedAt" = NOW()
          WHERE "householdId" = ${householdId}::uuid
            AND "status" = 'PENDING'::"HouseholdMembershipStatus"
        `);
        await tx.$executeRaw(Prisma.sql`
          UPDATE "HouseholdRelationship"
          SET "status" = 'ENDED'::"HouseholdRelationshipStatus", "endedAt" = NOW(), "updatedAt" = NOW()
          WHERE "householdId" = ${householdId}::uuid
            AND "status" IN ('PENDING'::"HouseholdRelationshipStatus", 'ACTIVE'::"HouseholdRelationshipStatus")
        `);
        await tx.$executeRaw(Prisma.sql`
          UPDATE "HouseholdDependency"
          SET "status" = 'ENDED'::"HouseholdDependencyStatus", "endedAt" = NOW(), "updatedAt" = NOW()
          WHERE "householdId" = ${householdId}::uuid
            AND "status" IN ('PENDING'::"HouseholdDependencyStatus", 'ACTIVE'::"HouseholdDependencyStatus")
        `);
        await tx.$executeRaw(Prisma.sql`
          UPDATE "HouseholdResponsibilityParticipant"
          SET "status" = 'ENDED'::"HouseholdResponsibilityShareStatus", "endedAt" = NOW(), "updatedAt" = NOW()
          WHERE "householdId" = ${householdId}::uuid
            AND "status" IN ('PENDING'::"HouseholdResponsibilityShareStatus", 'ACTIVE'::"HouseholdResponsibilityShareStatus")
        `);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "HouseholdEvent" ("id", "householdId", "actorUserId", "eventType", "subjectType", "subjectId", "occurredAt")
          VALUES (${randomUUID()}::uuid, ${householdId}::uuid, ${caller.id}::uuid, 'HOUSEHOLD_ARCHIVED', 'HOUSEHOLD', ${householdId}::uuid, NOW())
        `);
      }
    });

    return { householdId, membershipId: membership.id, status: 'ENDED' };
  }

  private async assertActiveUser(userId: string) {
    const rows = await this.prisma.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "User"
      WHERE "id" = ${userId}::uuid AND "status" = 'ACTIVE'::"UserStatus" AND "deletedAt" IS NULL
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Member not found');
  }

  private async currentMembership(householdId: string, userId: string) {
    const rows = await this.prisma.db.$queryRaw<MembershipRow[]>(Prisma.sql`
      SELECT "id", "householdId", "userId", "status"::text AS "status", "invitedByUserId", "joinedAt", "endedAt", "createdAt"
      FROM "HouseholdMembership"
      WHERE "householdId" = ${householdId}::uuid
        AND "userId" = ${userId}::uuid
        AND "status" IN ('PENDING'::"HouseholdMembershipStatus", 'ACTIVE'::"HouseholdMembershipStatus")
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async assertActiveMember(householdId: string, userId: string): Promise<MembershipRow> {
    const rows = await this.prisma.db.$queryRaw<MembershipRow[]>(Prisma.sql`
      SELECT hm."id", hm."householdId", hm."userId", hm."status"::text AS "status", hm."invitedByUserId", hm."joinedAt", hm."endedAt", hm."createdAt"
      FROM "HouseholdMembership" hm
      JOIN "Household" h ON h."id" = hm."householdId"
      WHERE hm."householdId" = ${householdId}::uuid
        AND hm."userId" = ${userId}::uuid
        AND hm."status" = 'ACTIVE'::"HouseholdMembershipStatus"
        AND h."status" = 'ACTIVE'::"HouseholdStatus"
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Household not found');
    return rows[0];
  }

  private async assertBothActiveMembers(householdId: string, firstUserId: string, secondUserId: string) {
    await this.assertActiveMember(householdId, firstUserId);
    await this.assertActiveMember(householdId, secondUserId);
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) return false;
    const candidate = error as { code?: string; meta?: { code?: string } };
    return candidate.code === '23505' || (candidate.code === 'P2010' && candidate.meta?.code === '23505');
  }
}
