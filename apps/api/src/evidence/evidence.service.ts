import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityDecisionResult,
  AuthorityResourceClass,
  EvidenceItem,
  EvidenceItemStatus,
  EvidenceOrigin,
  EvidenceRequirement,
  EvidenceRequirementStatus,
  EvidenceSufficiencyStatus,
  EvidenceVerification,
  EvidenceVerificationMethod,
  EvidenceVerificationResult,
  Prisma,
  Responsibility,
  ResponsibilityActorClass,
  ResponsibilityContextType,
  ResponsibilityEventType,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityStatus,
  StewardshipRelationshipStatus,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorityService } from '../authority/authority.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEvidenceRequirementDto,
  SubmitEvidenceItemDto,
  VerifyEvidenceItemDto,
  WaiveEvidenceRequirementDto,
} from './dto/evidence.dto';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

// Fixed purpose strings for the Authority gateway grants a member must
// create before a Steward can read, manage, or verify their evidence — one
// exact purpose per capability so the gateway's exact-match grant lookup
// cannot be satisfied by an unrelated permission the member granted for
// something else. An ACTIVE StewardshipRelationship establishes who is
// carrying the work; it is never by itself evidence authority (merged
// Step 4).
const EVIDENCE_READ_PURPOSE = 'people-step6-evidence-read';
const EVIDENCE_MANAGE_PURPOSE = 'people-step6-evidence-manage';
const EVIDENCE_VERIFICATION_PURPOSE = 'people-step6-evidence-verification';

const TERMINAL_RESPONSIBILITY_STATUSES: ResponsibilityStatus[] = [
  ResponsibilityStatus.COMPLETED,
  ResponsibilityStatus.CANCELLED,
  ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
];

const REQUIREMENT_INCLUDE = {
  responsibility: { select: { status: true } },
  items: {
    include: { verifications: { orderBy: { performedAt: 'asc' as const } } },
    orderBy: { submittedAt: 'asc' as const },
  },
} satisfies Prisma.EvidenceRequirementInclude;

type RequirementWithItems = EvidenceRequirement & {
  responsibility: { status: ResponsibilityStatus };
  items: (EvidenceItem & { verifications: EvidenceVerification[] })[];
};

type ReadAccess = 'FULL' | 'STAFF_MINIMAL';

export interface EvidenceItemView {
  id: string;
  status: EvidenceItemStatus;
  origin: EvidenceOrigin;
  providedByUserId: string;
  providedByActorClass: ResponsibilityActorClass;
  submittedAt: Date;
  validFrom: Date | null;
  validUntil: Date | null;
  supersedesItemId: string | null;
  // Document identity/content is included only when the caller currently
  // holds read authority over the underlying Document (see
  // canReadDocumentContentForSubject) — never merely because they can see
  // that an EvidenceItem exists.
  documentId: string | null;
  externalSourceRef: string | null;
  externalSourceDescription: string | null;
  integrityHash: string | null;
  verifications: {
    id: string;
    result: EvidenceVerificationResult;
    method: EvidenceVerificationMethod;
    reason: string | null;
    authorityBasis: string;
    performedByUserId: string;
    actorClass: ResponsibilityActorClass;
    performedAt: Date;
  }[];
}

export interface EvidenceRequirementView {
  id: string;
  responsibilityId: string;
  label: string;
  description: string;
  status: EvidenceRequirementStatus;
  // Recomputed-on-write only; may lag liveSufficiency after time-based
  // expiry. Observability only — never a basis for any decision. See
  // liveSufficiency for current truth (work order §"Time-expiry truth").
  cachedSufficiencyAtLastWrite: EvidenceSufficiencyStatus;
  liveSufficiency: EvidenceSufficiencyStatus;
  requiredValidityDays: number | null;
  waivedByUserId: string | null;
  waivedReason: string | null;
  waivedAt: Date | null;
  memberMessage: string;
  items: EvidenceItemView[];
}

export interface EvidenceResponsibilitySummary {
  responsibilityId: string;
  aggregateSufficiency: EvidenceSufficiencyStatus;
  message: string;
  // Omitted entirely for a caller who only holds STAFF_MINIMAL access (an
  // ACTIVE Steward relationship without an explicit Step-2 read grant) — a
  // deliberately minimal coordination projection with no requirement
  // labels/descriptions, item history, source refs, hashes, or verification
  // reasons. See BLOCKER 3/4 disposition in the work order.
  requirements?: EvidenceRequirementView[];
}

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authority: AuthorityService,
  ) {}

  // ---------------------------------------------------------------------
  // Requirements
  // ---------------------------------------------------------------------

  async createRequirement(
    responsibilityId: string,
    dto: CreateEvidenceRequirementDto,
    caller: AuthenticatedUser,
  ): Promise<EvidenceRequirementView> {
    const responsibility = await this.getEvidenceEligibleResponsibility(responsibilityId);
    await this.assertCanManage(responsibility.id, responsibility.principalUserId!, caller);
    this.assertNonTerminalResponsibility(responsibility);

    const requirementId = await this.prisma.db.$transaction(async (tx) => {
      const requirement = await tx.evidenceRequirement.create({
        data: {
          responsibilityId: responsibility.id,
          subjectUserId: responsibility.principalUserId!,
          label: dto.label.trim(),
          description: dto.description.trim(),
          requiredValidityDays: dto.requiredValidityDays ?? null,
          createdByUserId: caller.id,
        },
      });
      await this.emitResponsibilityEvidenceEventTx(tx, responsibility.id, {
        sourceRecordType: 'EvidenceRequirement',
        sourceRecordId: requirement.id,
        sourceState: 'REQUIRED',
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      });
      return requirement.id;
    });

    return this.view(await this.mustLoadRequirement(requirementId), true);
  }

  async listRequirements(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<EvidenceRequirementView[]> {
    const responsibility = await this.getEvidenceEligibleResponsibility(responsibilityId);
    const access = await this.resolveReadAccess(
      responsibilityId,
      responsibility.principalUserId!,
      caller,
    );
    if (access !== 'FULL') throw new NotFoundException('Responsibility not found');
    const canReadDocuments = await this.canReadDocumentContentForSubject(
      responsibility.principalUserId!,
      caller,
    );
    const requirements = await this.prisma.db.evidenceRequirement.findMany({
      where: { responsibilityId },
      include: REQUIREMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return requirements.map((requirement) => this.view(requirement, canReadDocuments));
  }

  async getRequirement(
    requirementId: string,
    caller: AuthenticatedUser,
  ): Promise<EvidenceRequirementView> {
    const requirement = await this.mustLoadRequirement(requirementId);
    const access = await this.resolveReadAccess(
      requirement.responsibilityId,
      requirement.subjectUserId,
      caller,
    );
    if (access !== 'FULL') throw new NotFoundException('Evidence requirement not found');
    const canReadDocuments = await this.canReadDocumentContentForSubject(
      requirement.subjectUserId,
      caller,
    );
    return this.view(requirement, canReadDocuments);
  }

  async waiveRequirement(
    requirementId: string,
    dto: WaiveEvidenceRequirementDto,
    caller: AuthenticatedUser,
  ): Promise<EvidenceRequirementView> {
    const requirement = await this.mustLoadRequirement(requirementId);
    const isPrincipal = requirement.subjectUserId === caller.id;
    const isAdmin = ADMIN_ROLES.some((role) => caller.roles.includes(role));
    // Not-found rather than forbidden for an unrelated caller — matches the
    // repository's existing cross-tenant-probing-resistant convention.
    if (!isPrincipal && !isAdmin) throw new NotFoundException('Evidence requirement not found');
    this.assertNonTerminalResponsibility(requirement.responsibility);

    // A member/principal cannot unilaterally waive their own requirement —
    // that would let them erase a difficult proof from aggregate sufficiency
    // (prior HIGH finding). They may only request; an administrator alone
    // may authoritatively waive. Provenance (who, when, why, and whether it
    // was a request or an authoritative decision) is preserved via status +
    // the same waivedBy/waivedReason/waivedAt columns either way.
    const targetStatus = isAdmin
      ? EvidenceRequirementStatus.WAIVED
      : EvidenceRequirementStatus.WAIVER_REQUESTED;
    const allowedFrom: EvidenceRequirementStatus[] = isAdmin
      ? [EvidenceRequirementStatus.OPEN, EvidenceRequirementStatus.WAIVER_REQUESTED]
      : [EvidenceRequirementStatus.OPEN];
    if (!allowedFrom.includes(requirement.status)) {
      throw new ConflictException(`This requirement is already ${requirement.status}`);
    }

    await this.prisma.db.$transaction(async (tx) => {
      await tx.evidenceRequirement.update({
        where: { id: requirementId },
        data: {
          status: targetStatus,
          waivedByUserId: caller.id,
          waivedReason: dto.reason.trim(),
          waivedAt: new Date(),
        },
      });
      await this.emitResponsibilityEvidenceEventTx(tx, requirement.responsibilityId, {
        sourceRecordType: 'EvidenceRequirement',
        sourceRecordId: requirement.id,
        sourceState: targetStatus,
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      });
    });

    const canReadDocuments = await this.canReadDocumentContentForSubject(
      requirement.subjectUserId,
      caller,
    );
    return this.view(await this.mustLoadRequirement(requirementId), canReadDocuments);
  }

  // ---------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------

  async submitItem(
    requirementId: string,
    dto: SubmitEvidenceItemDto,
    caller: AuthenticatedUser,
  ): Promise<EvidenceRequirementView> {
    if (!dto.documentId && !dto.externalSourceRef) {
      throw new BadRequestException(
        'Evidence requires either an owned document or an external source reference',
      );
    }
    if (dto.documentId && dto.externalSourceRef) {
      throw new BadRequestException(
        'Evidence may reference a document or an external source, not both',
      );
    }

    const requirement = await this.mustLoadRequirement(requirementId);
    // Authority/standing gate before revealing anything else about this
    // requirement's current state — preserves the not-found boundary for a
    // caller with no plausible claim on it.
    const { origin, actorClass } = await this.resolveSubmissionOrigin(
      requirement.responsibilityId,
      requirement.subjectUserId,
      caller,
    );
    this.assertNonTerminalResponsibility(requirement.responsibility);
    if (requirement.status !== EvidenceRequirementStatus.OPEN) {
      throw new ConflictException(
        `This requirement is ${requirement.status} and no longer accepts evidence`,
      );
    }

    if (dto.documentId) {
      // Whoever submits a Document-backed item must own that Document —
      // identical ownership check to LegalMattersService.linkDocument() and
      // DocumentsService.getOwnedOrThrow(). A Steward submitting on a
      // member's behalf does so with their own uploaded Document, never the
      // member's.
      const document = await this.prisma.db.document.findFirst({
        where: { id: dto.documentId, userId: caller.id, deletedAt: null },
        select: { id: true },
      });
      if (!document) throw new NotFoundException('Document not found');
    }

    const existingCurrent = requirement.items.find(
      (item) => item.status === EvidenceItemStatus.SUBMITTED,
    );
    if (existingCurrent && dto.supersedesItemId !== existingCurrent.id) {
      // A requirement never holds two ambiguous "current" items. A second
      // submission must explicitly name the item it supersedes — this is
      // what "distinguish replacement/supersession from mutation" means in
      // practice, and it also makes a duplicate/idempotent submission a
      // deliberate, auditable act rather than silently ambiguous state.
      throw new ConflictException(
        'This requirement already has current evidence. Resubmit with supersedesItemId set to the current item to replace it.',
      );
    }

    let previous: EvidenceItem | null = null;
    if (dto.supersedesItemId) {
      previous = await this.prisma.db.evidenceItem.findFirst({
        where: { id: dto.supersedesItemId, requirementId },
      });
      if (!previous) throw new NotFoundException('Evidence item to supersede not found');
      if (previous.status !== EvidenceItemStatus.SUBMITTED) {
        throw new ConflictException('This evidence item has already been superseded or withdrawn');
      }
    }

    const { validFrom, validUntil } = this.resolveEffectiveValidityWindow(
      dto,
      requirement.requiredValidityDays,
    );

    try {
      await this.prisma.db.$transaction(async (tx) => {
        if (previous) {
          const claimed = await tx.evidenceItem.updateMany({
            where: { id: previous!.id, status: EvidenceItemStatus.SUBMITTED },
            data: { status: EvidenceItemStatus.SUPERSEDED },
          });
          if (claimed.count !== 1) {
            throw new ConflictException(
              'This evidence item was already superseded by another submission',
            );
          }
        }
        const item = await tx.evidenceItem.create({
          data: {
            requirementId,
            documentId: dto.documentId ?? null,
            externalSourceRef: dto.externalSourceRef?.trim() ?? null,
            externalSourceDescription: dto.externalSourceDescription?.trim() ?? null,
            origin,
            providedByUserId: caller.id,
            providedByActorClass: actorClass,
            supersedesItemId: dto.supersedesItemId ?? null,
            validFrom,
            validUntil,
            integrityHash: dto.integrityHash?.trim() ?? null,
          },
        });
        await this.recomputeSufficiency(tx, requirementId);
        await this.emitResponsibilityEvidenceEventTx(tx, requirement.responsibilityId, {
          sourceRecordType: 'EvidenceItem',
          sourceRecordId: item.id,
          sourceState: 'SUBMITTED',
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
        });
        return item.id;
      });
    } catch (error) {
      // Backs the application-level "one current item" check above with a
      // real database constraint (partial unique index on
      // (requirementId) WHERE status = 'SUBMITTED') so a genuine race
      // between two concurrent "submit without supersession" calls can
      // never leave two ambiguous "current" items.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'This requirement already has current evidence. Resubmit with supersedesItemId set to the current item to replace it.',
        );
      }
      throw error;
    }

    const canReadDocuments = await this.canReadDocumentContentForSubject(
      requirement.subjectUserId,
      caller,
    );
    return this.view(await this.mustLoadRequirement(requirementId), canReadDocuments);
  }

  // ---------------------------------------------------------------------
  // Verification
  // ---------------------------------------------------------------------

  async verifyItem(
    itemId: string,
    dto: VerifyEvidenceItemDto,
    caller: AuthenticatedUser,
  ): Promise<EvidenceRequirementView> {
    const item = await this.prisma.db.evidenceItem.findUnique({
      where: { id: itemId },
      include: { requirement: { include: { responsibility: { select: { status: true } } } } },
    });
    if (!item) throw new NotFoundException('Evidence item not found');

    // Authority/standing gate before revealing anything else about this
    // item's current state (status, terminality) — preserves the not-found
    // boundary for a caller with no plausible claim on it.
    const { method, authorityBasis, actorClass } = await this.resolveVerificationAuthority(
      item,
      caller,
    );

    this.assertNonTerminalResponsibility(item.requirement.responsibility);
    if (item.status !== EvidenceItemStatus.SUBMITTED) {
      throw new ConflictException(
        'Only the current (non-superseded) evidence item may be verified',
      );
    }
    if (
      (dto.result === EvidenceVerificationResult.REJECTED ||
        dto.result === EvidenceVerificationResult.FLAGGED_FOR_REVIEW) &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException('A reason is required to reject or flag evidence');
    }

    await this.prisma.db.$transaction(async (tx) => {
      await tx.evidenceVerification.create({
        data: {
          evidenceItemId: item.id,
          result: dto.result,
          method,
          performedByUserId: caller.id,
          actorClass,
          authorityBasis,
          reason: dto.reason?.trim() ?? null,
        },
      });
      await this.recomputeSufficiency(tx, item.requirementId);
      // Every determination is a meaningful transition on the shared
      // Responsibility timeline, not just VERIFIED — a Steward/admin
      // rejecting or flagging evidence is real, auditable information about
      // this Responsibility's evidence truth.
      await this.emitResponsibilityEvidenceEventTx(tx, item.requirement.responsibilityId, {
        sourceRecordType: 'EvidenceItem',
        sourceRecordId: item.id,
        sourceState: dto.result,
        evidenceLevel:
          dto.result === EvidenceVerificationResult.VERIFIED
            ? ResponsibilityEvidenceLevel.VERIFIED
            : ResponsibilityEvidenceLevel.REPORTED,
      });
    });

    const canReadDocuments = await this.canReadDocumentContentForSubject(
      item.requirement.subjectUserId,
      caller,
    );
    return this.view(await this.mustLoadRequirement(item.requirementId), canReadDocuments);
  }

  // ---------------------------------------------------------------------
  // Responsibility-level summary (Step 5 integration seam)
  //
  // Step 6 is an evidence-truth provider only. It never transitions a
  // PERSONAL_NEED_RESOLUTION Responsibility to COMPLETED itself — even fully
  // ADEQUATE evidence, and even a Step 5 Obligation that is
  // SATISFIED_VERIFIED, does not prove the member's underlying life need was
  // actually resolved. That boundary belongs exclusively to the existing
  // source-domain outcome mechanism Step 1 already governs. Any prior
  // "attempt-completion" path has been removed for exactly this reason —
  // see the work order's "Step 5/Step 6 boundary" section.
  // ---------------------------------------------------------------------

  async responsibilitySummary(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<EvidenceResponsibilitySummary> {
    const responsibility = await this.getEvidenceEligibleResponsibility(responsibilityId);
    const access = await this.resolveReadAccess(
      responsibilityId,
      responsibility.principalUserId!,
      caller,
    );

    const requirements = await this.prisma.db.evidenceRequirement.findMany({
      where: { responsibilityId },
      include: REQUIREMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    // Always computed live (never the cached currentSufficiency column) —
    // this is the one fact Step 5 or any other governed consumer may rely
    // on as current truth (work order "Time-expiry truth").
    const aggregate = this.aggregateSufficiency(requirements);
    const message = this.memberFacingAggregateMessage(aggregate);

    if (access !== 'FULL') {
      // Deliberately minimal staff coordination projection — no requirement
      // labels/descriptions, item history, source refs, hashes, or
      // verification reasons.
      return { responsibilityId, aggregateSufficiency: aggregate, message };
    }

    const canReadDocuments = await this.canReadDocumentContentForSubject(
      responsibility.principalUserId!,
      caller,
    );
    const views = requirements.map((requirement) => this.view(requirement, canReadDocuments));

    return { responsibilityId, aggregateSufficiency: aggregate, message, requirements: views };
  }

  // ---------------------------------------------------------------------
  // Sufficiency
  // ---------------------------------------------------------------------

  private computeSufficiency(requirement: RequirementWithItems): EvidenceSufficiencyStatus {
    const current = requirement.items.find((item) => item.status === EvidenceItemStatus.SUBMITTED);
    if (!current) return EvidenceSufficiencyStatus.MISSING;

    const latestVerification = [...current.verifications].sort(
      (a, b) => b.performedAt.getTime() - a.performedAt.getTime(),
    )[0];

    if (!latestVerification) return EvidenceSufficiencyStatus.PRESENT_UNVERIFIED;

    if (latestVerification.result !== EvidenceVerificationResult.VERIFIED) {
      return EvidenceSufficiencyStatus.INSUFFICIENT;
    }

    if (current.validUntil && current.validUntil.getTime() < Date.now()) {
      return EvidenceSufficiencyStatus.INSUFFICIENT;
    }

    return EvidenceSufficiencyStatus.ADEQUATE;
  }

  private aggregateSufficiency(requirements: RequirementWithItems[]): EvidenceSufficiencyStatus {
    // WAIVER_REQUESTED is deliberately NOT excluded here — a mere request
    // must not remove a requirement from aggregate sufficiency (prior HIGH
    // finding). Only an authoritative WAIVED (or CANCELLED) requirement is
    // excluded.
    const active = requirements.filter(
      (requirement) =>
        requirement.status !== EvidenceRequirementStatus.WAIVED &&
        requirement.status !== EvidenceRequirementStatus.CANCELLED,
    );
    if (active.length === 0) return EvidenceSufficiencyStatus.ADEQUATE;

    const statuses = active.map((requirement) => this.computeSufficiency(requirement));
    if (statuses.every((status) => status === EvidenceSufficiencyStatus.ADEQUATE)) {
      return EvidenceSufficiencyStatus.ADEQUATE;
    }
    if (statuses.some((status) => status === EvidenceSufficiencyStatus.INSUFFICIENT)) {
      return EvidenceSufficiencyStatus.INSUFFICIENT;
    }
    if (statuses.some((status) => status === EvidenceSufficiencyStatus.PRESENT_UNVERIFIED)) {
      return EvidenceSufficiencyStatus.PRESENT_UNVERIFIED;
    }
    return EvidenceSufficiencyStatus.MISSING;
  }

  private async recomputeSufficiency(
    tx: Prisma.TransactionClient,
    requirementId: string,
  ): Promise<void> {
    const requirement = await tx.evidenceRequirement.findUniqueOrThrow({
      where: { id: requirementId },
      include: REQUIREMENT_INCLUDE,
    });
    const sufficiency = this.computeSufficiency(requirement);
    await tx.evidenceRequirement.update({
      where: { id: requirementId },
      // Sufficiency alone never auto-satisfies; only an explicit governed
      // action could ever move status to SATISFIED (no such action exists
      // in this slice — see the removed attempt-completion path), keeping
      // "verified" and "the work is done" distinct.
      data: { currentSufficiency: sufficiency },
    });
  }

  private resolveEffectiveValidityWindow(
    dto: SubmitEvidenceItemDto,
    requiredValidityDays: number | null,
  ): { validFrom: Date | null; validUntil: Date | null } {
    const now = new Date();
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (validFrom && validFrom.getTime() > now.getTime()) {
      throw new BadRequestException('validFrom cannot be in the future');
    }

    let validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (validUntil && validFrom && validUntil.getTime() < validFrom.getTime()) {
      throw new BadRequestException('validUntil cannot be earlier than validFrom');
    }

    if (requiredValidityDays) {
      // The requirement's policy window is an upper bound the caller cannot
      // extend past, whether or not they supplied their own validUntil — a
      // client must not be able to turn a 90-day proof rule into years of
      // validity (prior HIGH finding).
      const maxValidUntil = new Date(
        (validFrom ?? now).getTime() + requiredValidityDays * 24 * 60 * 60 * 1000,
      );
      if (validUntil && validUntil.getTime() > maxValidUntil.getTime()) {
        throw new BadRequestException(
          `validUntil cannot exceed this requirement's ${requiredValidityDays}-day validity window`,
        );
      }
      if (!validUntil) validUntil = maxValidUntil;
    }

    return { validFrom, validUntil };
  }

  // ---------------------------------------------------------------------
  // Authorization
  // ---------------------------------------------------------------------

  /**
   * FULL grants the complete requirement/item/verification payload (labels,
   * descriptions, item history, source refs, hashes, verification reasons).
   * STAFF_MINIMAL grants only the deliberately minimal coordination
   * projection from responsibilitySummary(). Neither
   * HouseholdResponsibilityParticipant (coordination consent only, Step 3)
   * nor a bare ACTIVE StewardshipRelationship (assignment only, Step 4)
   * grants FULL — an explicit Step-2 AuthorityGrant is required.
   */
  private async resolveReadAccess(
    responsibilityId: string,
    subjectUserId: string,
    caller: AuthenticatedUser,
  ): Promise<ReadAccess> {
    if (caller.id === subjectUserId) return 'FULL';
    if (ADMIN_ROLES.some((role) => caller.roles.includes(role))) return 'FULL';
    if (caller.roles.includes(UserRole.STEWARD)) {
      const relationship = await this.prisma.db.stewardshipRelationship.findFirst({
        where: {
          memberId: subjectUserId,
          stewardId: caller.id,
          status: StewardshipRelationshipStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (relationship) {
        const decision = await this.authority.evaluate(
          {
            contextType: AuthorityContextType.PERSONAL,
            subjectUserId,
            capability: AuthorityCapability.READ,
            resourceClass: AuthorityResourceClass.OTHER,
            resourceRef: responsibilityId,
            purpose: EVIDENCE_READ_PURPOSE,
          },
          caller.id,
        );
        return decision.result === AuthorityDecisionResult.PERMIT ? 'FULL' : 'STAFF_MINIMAL';
      }
    }
    throw new NotFoundException('Responsibility not found');
  }

  private async assertCanManage(
    responsibilityId: string,
    subjectUserId: string,
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (ADMIN_ROLES.some((role) => caller.roles.includes(role))) return;
    if (caller.roles.includes(UserRole.STEWARD)) {
      const relationship = await this.prisma.db.stewardshipRelationship.findFirst({
        where: {
          memberId: subjectUserId,
          stewardId: caller.id,
          status: StewardshipRelationshipStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (relationship) {
        const decision = await this.authority.evaluate(
          {
            contextType: AuthorityContextType.PERSONAL,
            subjectUserId,
            capability: AuthorityCapability.WRITE,
            resourceClass: AuthorityResourceClass.OTHER,
            resourceRef: responsibilityId,
            purpose: EVIDENCE_MANAGE_PURPOSE,
          },
          caller.id,
        );
        if (decision.result === AuthorityDecisionResult.PERMIT) return;
        // The caller has genuine standing (they are the assigned Steward),
        // so a reason-bearing 403 reveals nothing an unrelated caller could
        // exploit.
        throw new ForbiddenException(
          'This member has not authorized you to open an evidence requirement for this Responsibility. An ACTIVE Stewardship relationship alone does not grant evidence-management authority.',
        );
      }
    }
    if (caller.id === subjectUserId) {
      // Deliberately excludes the member themselves: a member cannot invent
      // their own proof requirement and then self-satisfy it (work order
      // §7). They already know this Responsibility exists, so a
      // reason-bearing 403 reveals nothing a genuinely unrelated caller
      // could exploit.
      throw new ForbiddenException(
        'You cannot open an evidence requirement on your own Responsibility. Only an authorized Steward or administrator may do so.',
      );
    }
    // A genuinely unrelated caller has no standing at all, so the boundary
    // is not-found rather than forbidden.
    throw new NotFoundException('Responsibility not found');
  }

  private async canReadDocumentContentForSubject(
    subjectUserId: string,
    caller: AuthenticatedUser,
  ): Promise<boolean> {
    if (caller.id === subjectUserId) return true;
    if (ADMIN_ROLES.some((role) => caller.roles.includes(role))) return false; // metadata-only, matches Step 4's minimum-coordination-facts boundary
    return false; // a Steward's document-content access is evaluated per-document in resolveVerificationAuthority, never blanket
  }

  private async resolveSubmissionOrigin(
    responsibilityId: string,
    subjectUserId: string,
    caller: AuthenticatedUser,
  ): Promise<{ origin: EvidenceOrigin; actorClass: ResponsibilityActorClass }> {
    if (caller.id === subjectUserId) {
      return {
        origin: EvidenceOrigin.MEMBER_PROVIDED,
        actorClass: ResponsibilityActorClass.MEMBER,
      };
    }
    if (caller.roles.includes(UserRole.STEWARD)) {
      const relationship = await this.prisma.db.stewardshipRelationship.findFirst({
        where: {
          memberId: subjectUserId,
          stewardId: caller.id,
          status: StewardshipRelationshipStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (relationship) {
        const decision = await this.authority.evaluate(
          {
            contextType: AuthorityContextType.PERSONAL,
            subjectUserId,
            capability: AuthorityCapability.WRITE,
            resourceClass: AuthorityResourceClass.OTHER,
            resourceRef: responsibilityId,
            purpose: EVIDENCE_MANAGE_PURPOSE,
          },
          caller.id,
        );
        if (decision.result === AuthorityDecisionResult.PERMIT) {
          return {
            origin: EvidenceOrigin.STEWARD_PROVIDED,
            actorClass: ResponsibilityActorClass.SYSTEM,
          };
        }
        throw new ForbiddenException(
          'This member has not authorized you to submit evidence for this Responsibility. An ACTIVE Stewardship relationship alone does not grant evidence-management authority.',
        );
      }
    }
    if (ADMIN_ROLES.some((role) => caller.roles.includes(role))) {
      return {
        origin: EvidenceOrigin.STEWARD_PROVIDED,
        actorClass: ResponsibilityActorClass.SYSTEM,
      };
    }
    throw new NotFoundException('Evidence requirement not found');
  }

  private async resolveVerificationAuthority(
    item: EvidenceItem & { requirement: EvidenceRequirement },
    caller: AuthenticatedUser,
  ): Promise<{
    method: EvidenceVerificationMethod;
    authorityBasis: string;
    actorClass: ResponsibilityActorClass;
  }> {
    const adminRole = ADMIN_ROLES.find((role) => caller.roles.includes(role));
    if (adminRole) {
      // An administrator still cannot verify evidence they themselves
      // provided — an assertion is not independent verification regardless
      // of role (prior HIGH finding, including the admin
      // submit-then-self-verify adversarial case).
      if (item.providedByUserId === caller.id) {
        throw new ForbiddenException('You may not verify evidence you provided yourself');
      }
      return {
        method: EvidenceVerificationMethod.PLATFORM_ADMIN_REVIEW,
        authorityBasis: `${adminRole} role`,
        actorClass: ResponsibilityActorClass.SYSTEM,
      };
    }

    const subjectUserId = item.requirement.subjectUserId;
    const isSubject = subjectUserId === caller.id;
    let relationship: { id: string } | null = null;
    if (caller.roles.includes(UserRole.STEWARD)) {
      relationship = await this.prisma.db.stewardshipRelationship.findFirst({
        where: {
          memberId: subjectUserId,
          stewardId: caller.id,
          status: StewardshipRelationshipStatus.ACTIVE,
        },
        select: { id: true },
      });
    }
    if (!isSubject && !relationship) {
      // No plausible standing at all — preserve the not-found boundary
      // rather than a 403 that would confirm this item exists.
      throw new NotFoundException('Evidence item not found');
    }

    // Independent verification cannot be the subject asserting their own
    // evidence is good — "someone asserting something is not the same as
    // independent verification."
    if (isSubject) {
      throw new ForbiddenException('You may not verify your own evidence');
    }
    // Nor can the same human who supplied the item verify it — an
    // administrator submitting on a member's behalf and then verifying
    // their own submission is the same defect (prior HIGH finding).
    if (item.providedByUserId === caller.id) {
      throw new ForbiddenException('You may not verify evidence you provided yourself');
    }

    if (!item.documentId) {
      // No Document-scoped Authority object exists for a non-Document item —
      // only an administrator may verify it in this slice.
      throw new ForbiddenException(
        'This evidence has no linked document and can only be verified by an administrator',
      );
    }

    // The ACTIVE relationship alone is deliberately insufficient — it must
    // not grant unlimited access automatically. The member must separately
    // have authorized this exact Document through the existing Authority
    // gateway (Step 2).
    const decision = await this.authority.evaluate(
      {
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.DOCUMENT,
        resourceRef: item.documentId,
        purpose: EVIDENCE_VERIFICATION_PURPOSE,
      },
      caller.id,
    );
    if (decision.result !== AuthorityDecisionResult.PERMIT) {
      throw new ForbiddenException(
        'This member has not authorized you to access this document. An ACTIVE Stewardship relationship alone does not grant evidence-verification authority.',
      );
    }

    return {
      method: EvidenceVerificationMethod.HUMAN_STEWARD_REVIEW,
      authorityBasis: `ACTIVE StewardshipRelationship ${relationship!.id} + AuthorityGrant PERMIT (${decision.grantId ?? 'unknown'})`,
      actorClass: ResponsibilityActorClass.SYSTEM,
    };
  }

  // ---------------------------------------------------------------------
  // Responsibility / Responsibility-event plumbing (reused, unmodified contract)
  // ---------------------------------------------------------------------

  private async getEvidenceEligibleResponsibility(
    responsibilityId: string,
  ): Promise<Responsibility> {
    const responsibility = await this.prisma.db.responsibility.findUnique({
      where: { id: responsibilityId },
    });
    if (
      !responsibility ||
      responsibility.contextType !== ResponsibilityContextType.PERSONAL ||
      responsibility.kind !== ResponsibilityKind.PERSONAL_NEED_RESOLUTION ||
      !responsibility.principalUserId
    ) {
      throw new NotFoundException('Responsibility not found');
    }
    return responsibility;
  }

  /**
   * Once a Responsibility is COMPLETED, CANCELLED, or RESPONSIBLY_EXHAUSTED,
   * Step 6 must not create, submit, verify, or waive any evidence truth
   * against it — only a separately governed correction/reopen mechanism
   * could ever change that (none exists in this slice). Reads/history
   * remain available through listRequirements/getRequirement/summary.
   */
  private assertNonTerminalResponsibility(responsibility: { status: ResponsibilityStatus }): void {
    if (TERMINAL_RESPONSIBILITY_STATUSES.includes(responsibility.status)) {
      throw new ConflictException(
        `This Responsibility is already ${responsibility.status}. Evidence can no longer be created, submitted, verified, or waived without a separately governed correction/reopen mechanism.`,
      );
    }
  }

  /**
   * Writes the shared ResponsibilityEvent ledger through the existing,
   * unmodified repository contract (ResponsibilityEvidenceInput shape) so
   * the Responsibility's own timeline — which Step 5 and any UI already
   * read — carries a truthful ACTION_EVIDENCED entry for every meaningful
   * Step 6 transition. Always called inside the same transaction as the
   * Step-6 truth write it describes, so a ledger-write failure rolls back
   * the evidence-truth change rather than leaving them out of sync (prior
   * HIGH finding). Step 6 never invents a parallel timeline.
   */
  private async emitResponsibilityEvidenceEventTx(
    tx: Prisma.TransactionClient,
    responsibilityId: string,
    evidence: {
      sourceRecordType: string;
      sourceRecordId: string;
      sourceState: string;
      evidenceLevel: ResponsibilityEvidenceLevel;
    },
  ): Promise<void> {
    await tx.responsibilityEvent.create({
      data: {
        responsibilityId,
        type: ResponsibilityEventType.ACTION_EVIDENCED,
        actorClass: ResponsibilityActorClass.SYSTEM,
        sourceSystem: 'AUREUS_EVIDENCE',
        sourceRecordType: evidence.sourceRecordType,
        sourceRecordId: evidence.sourceRecordId,
        sourceState: evidence.sourceState,
        evidenceLevel: evidence.evidenceLevel,
      },
    });
  }

  private async mustLoadRequirement(requirementId: string): Promise<RequirementWithItems> {
    const requirement = await this.prisma.db.evidenceRequirement.findUnique({
      where: { id: requirementId },
      include: REQUIREMENT_INCLUDE,
    });
    if (!requirement) throw new NotFoundException('Evidence requirement not found');
    return requirement;
  }

  // ---------------------------------------------------------------------
  // View shaping — truthful member-facing language (work order "Product behavior")
  // ---------------------------------------------------------------------

  private view(
    requirement: RequirementWithItems,
    canReadDocuments: boolean,
  ): EvidenceRequirementView {
    const liveSufficiency = this.computeSufficiency(requirement);
    return {
      id: requirement.id,
      responsibilityId: requirement.responsibilityId,
      label: requirement.label,
      description: requirement.description,
      status: requirement.status,
      cachedSufficiencyAtLastWrite: requirement.currentSufficiency,
      liveSufficiency,
      requiredValidityDays: requirement.requiredValidityDays,
      waivedByUserId: requirement.waivedByUserId,
      waivedReason: requirement.waivedReason,
      waivedAt: requirement.waivedAt,
      memberMessage: this.memberFacingMessage(requirement, liveSufficiency),
      items: requirement.items.map((item) => this.itemView(item, canReadDocuments)),
    };
  }

  private itemView(
    item: EvidenceItem & { verifications: EvidenceVerification[] },
    canReadDocuments: boolean,
  ): EvidenceItemView {
    return {
      id: item.id,
      status: item.status,
      origin: item.origin,
      providedByUserId: item.providedByUserId,
      providedByActorClass: item.providedByActorClass,
      submittedAt: item.submittedAt,
      validFrom: item.validFrom,
      validUntil: item.validUntil,
      supersedesItemId: item.supersedesItemId,
      documentId: canReadDocuments ? item.documentId : null,
      externalSourceRef: item.externalSourceRef,
      externalSourceDescription: item.externalSourceDescription,
      integrityHash: item.integrityHash,
      verifications: item.verifications.map((verification) => ({
        id: verification.id,
        result: verification.result,
        method: verification.method,
        reason: verification.reason,
        authorityBasis: verification.authorityBasis,
        performedByUserId: verification.performedByUserId,
        actorClass: verification.actorClass,
        performedAt: verification.performedAt,
      })),
    };
  }

  private memberFacingMessage(
    requirement: RequirementWithItems,
    liveSufficiency: EvidenceSufficiencyStatus,
  ): string {
    if (requirement.status === EvidenceRequirementStatus.WAIVER_REQUESTED) {
      return 'A waiver was requested for this requirement and is pending administrator review. It still counts toward what is needed until an administrator decides.';
    }
    if (requirement.status === EvidenceRequirementStatus.WAIVED) {
      return `This requirement was waived: ${requirement.waivedReason ?? 'no reason recorded'}.`;
    }
    if (requirement.status === EvidenceRequirementStatus.SATISFIED) {
      return 'We now have the evidence required for this step.';
    }
    const current = requirement.items.find((item) => item.status === EvidenceItemStatus.SUBMITTED);
    const latestVerification = current
      ? [...current.verifications].sort(
          (a, b) => b.performedAt.getTime() - a.performedAt.getTime(),
        )[0]
      : undefined;

    switch (liveSufficiency) {
      case EvidenceSufficiencyStatus.MISSING:
        return `We still need: ${requirement.label}.`;
      case EvidenceSufficiencyStatus.PRESENT_UNVERIFIED:
        return 'We received it. This has not been verified yet.';
      case EvidenceSufficiencyStatus.INSUFFICIENT:
        if (current?.validUntil && current.validUntil.getTime() < Date.now()) {
          return `This proof expired on ${current.validUntil.toISOString().slice(0, 10)}.`;
        }
        return latestVerification?.reason
          ? `This doesn't meet the requirement because ${latestVerification.reason}`
          : 'This doesn’t meet the requirement yet.';
      case EvidenceSufficiencyStatus.ADEQUATE:
        return 'This was checked and meets the requirement.';
      default:
        return 'Status unknown.';
    }
  }

  private memberFacingAggregateMessage(aggregate: EvidenceSufficiencyStatus): string {
    switch (aggregate) {
      case EvidenceSufficiencyStatus.ADEQUATE:
        return 'We now have the evidence required for this step.';
      case EvidenceSufficiencyStatus.PRESENT_UNVERIFIED:
        return 'We received it. This has not been verified yet.';
      case EvidenceSufficiencyStatus.INSUFFICIENT:
        return 'This doesn’t meet the requirement yet.';
      default:
        return 'We still need evidence for this step.';
    }
  }
}
