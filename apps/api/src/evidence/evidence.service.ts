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
  HouseholdResponsibilityShareStatus,
  Prisma,
  Responsibility,
  ResponsibilityActorClass,
  ResponsibilityContextType,
  ResponsibilityEventType,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  StewardshipRelationshipStatus,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorityService } from '../authority/authority.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import {
  CreateEvidenceRequirementDto,
  SubmitEvidenceItemDto,
  VerifyEvidenceItemDto,
  WaiveEvidenceRequirementDto,
} from './dto/evidence.dto';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

// Fixed purpose string for the Authority gateway grant a member must create
// before a Steward can verify their evidence — one exact purpose so the
// gateway's exact-match grant lookup cannot be satisfied by an unrelated
// permission the member granted for something else.
const EVIDENCE_VERIFICATION_PURPOSE = 'people-step6-evidence-verification';

const REQUIREMENT_INCLUDE = {
  items: {
    include: { verifications: { orderBy: { performedAt: 'asc' as const } } },
    orderBy: { submittedAt: 'asc' as const },
  },
} satisfies Prisma.EvidenceRequirementInclude;

type RequirementWithItems = EvidenceRequirement & {
  items: (EvidenceItem & { verifications: EvidenceVerification[] })[];
};

export interface EvidenceItemView {
  id: string;
  status: EvidenceItemStatus;
  origin: EvidenceOrigin;
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
    performedAt: Date;
  }[];
}

export interface EvidenceRequirementView {
  id: string;
  responsibilityId: string;
  label: string;
  description: string;
  status: EvidenceRequirementStatus;
  currentSufficiency: EvidenceSufficiencyStatus;
  liveSufficiency: EvidenceSufficiencyStatus;
  requiredValidityDays: number | null;
  waivedReason: string | null;
  waivedAt: Date | null;
  memberMessage: string;
  items: EvidenceItemView[];
}

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authority: AuthorityService,
    private readonly responsibilities: ResponsibilitiesService,
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
    await this.assertCanManage(responsibility.principalUserId!, caller);

    const requirement = await this.prisma.db.evidenceRequirement.create({
      data: {
        responsibilityId: responsibility.id,
        subjectUserId: responsibility.principalUserId!,
        label: dto.label.trim(),
        description: dto.description.trim(),
        requiredValidityDays: dto.requiredValidityDays ?? null,
        createdByUserId: caller.id,
      },
    });

    await this.emitResponsibilityEvidenceEvent(responsibility.id, {
      sourceRecordType: 'EvidenceRequirement',
      sourceRecordId: requirement.id,
      sourceState: 'REQUIRED',
      evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
    });

    return this.view(await this.mustLoadRequirement(requirement.id), false);
  }

  async listRequirements(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<EvidenceRequirementView[]> {
    const responsibility = await this.getEvidenceEligibleResponsibility(responsibilityId);
    await this.assertCanRead(responsibilityId, responsibility.principalUserId!, caller);
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
    await this.assertCanRead(requirement.responsibilityId, requirement.subjectUserId, caller);
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
    if (requirement.status !== EvidenceRequirementStatus.OPEN) {
      throw new ConflictException(`This requirement is already ${requirement.status}`);
    }

    await this.prisma.db.evidenceRequirement.update({
      where: { id: requirementId },
      data: {
        status: EvidenceRequirementStatus.WAIVED,
        waivedByUserId: caller.id,
        waivedReason: dto.reason.trim(),
        waivedAt: new Date(),
      },
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
    if (requirement.status !== EvidenceRequirementStatus.OPEN) {
      throw new ConflictException(
        `This requirement is ${requirement.status} and no longer accepts evidence`,
      );
    }

    const { origin, actorClass } = await this.resolveSubmissionOrigin(
      requirement.subjectUserId,
      caller,
    );

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

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : requirement.requiredValidityDays
        ? new Date(
            (validFrom ?? new Date()).getTime() +
              requirement.requiredValidityDays * 24 * 60 * 60 * 1000,
          )
        : null;

    let createdId: string;
    try {
      createdId = await this.prisma.db.$transaction(async (tx) => {
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

    await this.emitResponsibilityEvidenceEvent(requirement.responsibilityId, {
      sourceRecordType: 'EvidenceItem',
      sourceRecordId: createdId,
      sourceState: 'SUBMITTED',
      evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
    });

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
      include: { requirement: true },
    });
    if (!item) throw new NotFoundException('Evidence item not found');
    if (item.status !== EvidenceItemStatus.SUBMITTED) {
      throw new ConflictException(
        'Only the current (non-superseded) evidence item may be verified',
      );
    }
    // Independent verification cannot be the subject asserting their own
    // evidence is good — "someone asserting something is not the same as
    // independent verification."
    if (item.requirement.subjectUserId === caller.id) {
      throw new ForbiddenException('You may not verify your own evidence');
    }
    if (
      (dto.result === EvidenceVerificationResult.REJECTED ||
        dto.result === EvidenceVerificationResult.FLAGGED_FOR_REVIEW) &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException('A reason is required to reject or flag evidence');
    }

    const { method, authorityBasis, actorClass } = await this.resolveVerificationAuthority(
      item,
      caller,
    );

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
    });

    if (dto.result === EvidenceVerificationResult.VERIFIED) {
      await this.emitResponsibilityEvidenceEvent(item.requirement.responsibilityId, {
        sourceRecordType: 'EvidenceItem',
        sourceRecordId: item.id,
        sourceState: 'VERIFIED',
        evidenceLevel: ResponsibilityEvidenceLevel.VERIFIED,
      });
    }

    const canReadDocuments = await this.canReadDocumentContentForSubject(
      item.requirement.subjectUserId,
      caller,
    );
    return this.view(await this.mustLoadRequirement(item.requirementId), canReadDocuments);
  }

  // ---------------------------------------------------------------------
  // Responsibility-level summary & completion (Step 5 integration seam)
  // ---------------------------------------------------------------------

  async responsibilitySummary(responsibilityId: string, caller: AuthenticatedUser) {
    const responsibility = await this.getEvidenceEligibleResponsibility(responsibilityId);
    await this.assertCanRead(responsibilityId, responsibility.principalUserId!, caller);
    const canReadDocuments = await this.canReadDocumentContentForSubject(
      responsibility.principalUserId!,
      caller,
    );
    const requirements = await this.prisma.db.evidenceRequirement.findMany({
      where: { responsibilityId },
      include: REQUIREMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    const views = requirements.map((requirement) => this.view(requirement, canReadDocuments));
    const aggregate = this.aggregateSufficiency(requirements);

    return {
      responsibilityId,
      aggregateSufficiency: aggregate,
      message: this.memberFacingAggregateMessage(aggregate),
      requirements: views,
    };
  }

  async attemptResponsibilityCompletion(responsibilityId: string, caller: AuthenticatedUser) {
    // Ownership/kind check reuses the existing, unmodified Step 1 contract.
    await this.responsibilities.findOwnedPersonalNeedResolution(responsibilityId, caller);

    const requirements = await this.prisma.db.evidenceRequirement.findMany({
      where: { responsibilityId },
      include: REQUIREMENT_INCLUDE,
    });
    const active = requirements.filter(
      (requirement) =>
        requirement.status !== EvidenceRequirementStatus.WAIVED &&
        requirement.status !== EvidenceRequirementStatus.CANCELLED,
    );
    if (active.length === 0) {
      throw new ConflictException(
        'No evidence requirement has been recorded for this responsibility yet',
      );
    }
    // Live recomputation, never the cached field — a stale cache can never
    // authorize completion (work order §6).
    const insufficient = active.filter(
      (requirement) => this.computeSufficiency(requirement) !== EvidenceSufficiencyStatus.ADEQUATE,
    );
    if (insufficient.length > 0) {
      throw new ConflictException(
        `We still need verified evidence for: ${insufficient.map((r) => r.label).join(', ')}`,
      );
    }

    const [primary, ...rest] = active;
    const completed = await this.responsibilities.completePersonalNeedWithEvidence(
      responsibilityId,
      caller,
      {
        sourceSystem: 'AUREUS_EVIDENCE',
        sourceRecordType: 'EvidenceRequirement',
        sourceRecordId: primary.id,
        sourceState: 'ADEQUATE',
        evidenceLevel: ResponsibilityEvidenceLevel.VERIFIED,
        supportingEvidence: rest.map((requirement) => ({
          sourceSystem: 'AUREUS_EVIDENCE',
          sourceRecordType: 'EvidenceRequirement',
          sourceRecordId: requirement.id,
          sourceState: 'ADEQUATE',
          evidenceLevel: ResponsibilityEvidenceLevel.VERIFIED,
        })),
      },
    );

    await this.prisma.db.evidenceRequirement.updateMany({
      where: { id: { in: active.map((requirement) => requirement.id) } },
      data: { status: EvidenceRequirementStatus.SATISFIED },
    });

    return completed;
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
    const status =
      requirement.status === EvidenceRequirementStatus.OPEN &&
      sufficiency === EvidenceSufficiencyStatus.ADEQUATE
        ? EvidenceRequirementStatus.OPEN // Sufficiency alone never auto-satisfies; only attemptResponsibilityCompletion (or a future explicit action) moves status to SATISFIED, keeping "verified" and "the work is done" distinct.
        : requirement.status;
    await tx.evidenceRequirement.update({
      where: { id: requirementId },
      data: { currentSufficiency: sufficiency, status },
    });
  }

  // ---------------------------------------------------------------------
  // Authorization
  // ---------------------------------------------------------------------

  private async assertCanRead(
    responsibilityId: string,
    subjectUserId: string,
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (caller.id === subjectUserId) return;
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
      if (relationship) return;
    }
    // Read-only visibility extends to an ACTIVE household participant of
    // this exact Responsibility — never a blanket "same household" grant,
    // and never verification authority.
    const householdParticipant = await this.prisma.db.householdResponsibilityParticipant.findFirst({
      where: {
        responsibilityId,
        participantUserId: caller.id,
        status: HouseholdResponsibilityShareStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (householdParticipant) return;
    throw new NotFoundException('Evidence requirement not found');
  }

  private async assertCanManage(subjectUserId: string, caller: AuthenticatedUser): Promise<void> {
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
      if (relationship) return;
    }
    // Deliberately excludes the member themselves: a member cannot invent
    // their own proof requirement and then self-satisfy it (work order §7).
    throw new ForbiddenException(
      'Only an authorized Steward (with an ACTIVE relationship to this member) or administrator may open an evidence requirement',
    );
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
        return {
          origin: EvidenceOrigin.STEWARD_PROVIDED,
          actorClass: ResponsibilityActorClass.SYSTEM,
        };
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
      return {
        method: EvidenceVerificationMethod.PLATFORM_ADMIN_REVIEW,
        authorityBasis: `${adminRole} role`,
        actorClass: ResponsibilityActorClass.SYSTEM,
      };
    }

    if (!item.documentId) {
      // No Document-scoped Authority object exists for a non-Document item —
      // only an administrator may verify it in this slice.
      throw new ForbiddenException(
        'This evidence has no linked document and can only be verified by an administrator',
      );
    }

    if (!caller.roles.includes(UserRole.STEWARD)) {
      throw new ForbiddenException(
        'Only an authorized Steward or administrator may verify evidence',
      );
    }

    const relationship = await this.prisma.db.stewardshipRelationship.findFirst({
      where: {
        memberId: item.requirement.subjectUserId,
        stewardId: caller.id,
        status: StewardshipRelationshipStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!relationship) {
      throw new ForbiddenException('You are not the active Steward for this member');
    }

    // The ACTIVE relationship alone is deliberately insufficient — it must
    // not grant unlimited access automatically. The member must separately
    // have authorized this exact Document through the existing Authority
    // gateway (Step 2).
    const decision = await this.authority.evaluate(
      {
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: item.requirement.subjectUserId,
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
      authorityBasis: `ACTIVE StewardshipRelationship ${relationship.id} + AuthorityGrant PERMIT (${decision.grantId ?? 'unknown'})`,
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
   * Writes the shared ResponsibilityEvent ledger through the existing,
   * unmodified repository contract (ResponsibilityEvidenceInput) so the
   * Responsibility's own timeline — which Step 5 and any UI already read —
   * carries a truthful ACTION_EVIDENCED entry for every meaningful Step 6
   * transition. Step 6 never invents a parallel timeline.
   */
  private async emitResponsibilityEvidenceEvent(
    responsibilityId: string,
    evidence: {
      sourceRecordType: string;
      sourceRecordId: string;
      sourceState: string;
      evidenceLevel: ResponsibilityEvidenceLevel;
    },
  ): Promise<void> {
    await this.prisma.db.responsibilityEvent.create({
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
      currentSufficiency: requirement.currentSufficiency,
      liveSufficiency,
      requiredValidityDays: requirement.requiredValidityDays,
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
        performedAt: verification.performedAt,
      })),
    };
  }

  private memberFacingMessage(
    requirement: RequirementWithItems,
    liveSufficiency: EvidenceSufficiencyStatus,
  ): string {
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
