import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LegalActionType,
  LegalMatterDeadlineStatus,
  LegalMatterProvenance,
  LegalMatterRetentionState,
  LegalMatterReviewStatus,
  LegalMatterSourceVerification,
  NeedOutcomeStatus,
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NeedsService } from '../needs/needs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import {
  AddLegalMatterDeadlineDto,
  AddLegalMatterFactDto,
  AddLegalMatterSourceDto,
  CheckLegalActionDto,
  CreateLegalMatterDto,
  ObserveLegalFactDto,
  ReportLegalMatterOutcomeDto,
  RequestLegalReviewDto,
  VerifyLegalSourceIdentityDto,
} from './legal-matters.dto';

const SAFE_MODE_ACTIONS = new Set<LegalActionType>([
  LegalActionType.ORGANIZE_RECORDS,
  LegalActionType.RETRIEVE_OFFICIAL_SOURCE,
  LegalActionType.TRACK_REPORTED_DEADLINE,
  LegalActionType.PREPARE_QUESTIONS,
]);

@Injectable()
export class LegalMattersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly responsibilities: ResponsibilitiesService,
    private readonly needs: NeedsService,
  ) {}

  async create(dto: CreateLegalMatterDto, caller: AuthenticatedUser) {
    const need = await this.getOwnedNeed(dto.statedNeedId, caller.id);
    const responsibility = await this.responsibilities.acceptPersonalNeedResolution(
      {
        conversationId: need.conversationId,
        objective: dto.objective.trim(),
        dueAt: dto.knownDeadline ? new Date(dto.knownDeadline) : null,
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          statedNeedId: need.id,
          legalMatter: true,
          completionRule: 'SOURCE_DOMAIN_OUTCOME_EVIDENCE_REQUIRED',
          evidenceMeaning:
            'Legal referral, research, preparation, filing, hearing, or counsel handoff is not itself proof that the underlying need is resolved.',
        },
      },
      caller,
    );

    if (
      responsibility.status === ResponsibilityStatus.COMPLETED ||
      responsibility.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED ||
      responsibility.status === ResponsibilityStatus.CANCELLED
    ) {
      throw new ConflictException('A terminal Responsibility cannot be opened as a new legal Matter');
    }

    const existing = await this.prisma.db.legalMatter.findUnique({
      where: { responsibilityId: responsibility.id },
    });
    if (existing) return this.project(existing.id, caller.id);

    const matter = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.legalMatter.create({
        data: {
          userId: caller.id,
          responsibilityId: responsibility.id,
          statedNeedId: need.id,
          matterType: dto.matterType.trim(),
          jurisdiction: dto.jurisdiction.trim(),
          forum: dto.forum?.trim() || null,
          proceduralPosture: dto.proceduralPosture.trim(),
          urgency: dto.urgency,
          disclosureAcknowledgedAt: new Date(),
          assistanceMode: 'SAFE_MODE',
          legalReviewRequired: true,
          retentionBasis: 'LEGAL_MATTER_POLICY_PENDING',
          retentionState: LegalMatterRetentionState.ACTIVE,
        },
      });
      if (dto.knownDeadline) {
        await tx.legalMatterDeadline.create({
          data: {
            matterId: created.id,
            label: 'Member-reported known legal date',
            dueAt: new Date(dto.knownDeadline),
            timeZone: dto.knownDeadlineTimeZone?.trim() || 'UNSPECIFIED',
            trigger: dto.knownDeadlineTrigger?.trim() || 'Member-reported date; governing trigger not yet verified',
            calculationBasis: null,
            status: LegalMatterDeadlineStatus.REPORTED,
          },
        });
      }
      return created;
    });

    return this.project(matter.id, caller.id);
  }

  async activeForConversation(conversationId: string, caller: AuthenticatedUser) {
    const matter = await this.prisma.db.legalMatter.findFirst({
      where: {
        userId: caller.id,
        responsibility: { originConversationId: conversationId },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return matter ? this.project(matter.id, caller.id) : null;
  }

  async findOne(matterId: string, caller: AuthenticatedUser) {
    await this.ownedMatter(matterId, caller.id);
    return this.project(matterId, caller.id);
  }

  async addSource(matterId: string, dto: AddLegalMatterSourceDto, caller: AuthenticatedUser) {
    await this.ownedMatter(matterId, caller.id);
    const source = await this.prisma.db.legalMatterSource.create({
      data: {
        matterId,
        title: dto.title.trim(),
        url: dto.url.trim(),
        kind: dto.kind,
        jurisdiction: dto.jurisdiction.trim(),
        proposition: dto.proposition.trim(),
        provenance: LegalMatterProvenance.REPORTED,
        verification: LegalMatterSourceVerification.MEMBER_REPORTED,
        checkedAt: new Date(),
      },
    });
    return source;
  }

  async addFact(matterId: string, dto: AddLegalMatterFactDto, caller: AuthenticatedUser) {
    await this.ownedMatter(matterId, caller.id);
    return this.prisma.db.legalMatterFact.create({
      data: {
        matterId,
        statement: dto.statement.trim(),
        provenance: LegalMatterProvenance.REPORTED,
      },
    });
  }

  async addDeadline(matterId: string, dto: AddLegalMatterDeadlineDto, caller: AuthenticatedUser) {
    await this.ownedMatter(matterId, caller.id);
    if (dto.sourceId) {
      const source = await this.prisma.db.legalMatterSource.findFirst({
        where: { id: dto.sourceId, matterId },
        select: { id: true },
      });
      if (!source) throw new NotFoundException('Matter source not found');
    }
    return this.prisma.db.legalMatterDeadline.create({
      data: {
        matterId,
        label: dto.label.trim(),
        dueAt: new Date(dto.dueAt),
        timeZone: dto.timeZone.trim(),
        trigger: dto.trigger.trim(),
        calculationBasis: dto.calculationBasis?.trim() || null,
        sourceId: dto.sourceId ?? null,
        status: LegalMatterDeadlineStatus.REPORTED,
      },
    });
  }

  async linkDocument(matterId: string, documentId: string, label: string | undefined, caller: AuthenticatedUser) {
    await this.ownedMatter(matterId, caller.id);
    const document = await this.prisma.db.document.findFirst({
      where: { id: documentId, userId: caller.id, deletedAt: null },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    await this.prisma.db.legalMatterDocumentLink.upsert({
      where: { matterId_documentId: { matterId, documentId } },
      create: { matterId, documentId, label: label?.trim() || null },
      update: { label: label?.trim() || null },
    });
    return this.project(matterId, caller.id);
  }

  async requestReview(matterId: string, dto: RequestLegalReviewDto, caller: AuthenticatedUser) {
    await this.ownedMatter(matterId, caller.id);
    const existing = await this.prisma.db.legalMatterReviewRequest.findFirst({
      where: { matterId, status: LegalMatterReviewStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.db.legalMatterReviewRequest.create({
      data: {
        matterId,
        requestedByUserId: caller.id,
        purpose: dto.purpose.trim(),
      },
    });
  }

  async checkAction(matterId: string, dto: CheckLegalActionDto, caller: AuthenticatedUser) {
    const matter = await this.ownedMatter(matterId, caller.id);
    if (SAFE_MODE_ACTIONS.has(dto.actionType)) {
      return {
        actionType: dto.actionType,
        permitted: true,
        mode: 'SAFE_MODE',
        reason: 'This action stays within organization, official-source retrieval, reported-deadline tracking, or question preparation. It grants no representation or decision authority.',
      };
    }
    return {
      actionType: dto.actionType,
      permitted: false,
      mode: matter.assistanceMode,
      gate: 'HUMAN_LEGAL_GATE_REQUIRED',
      reason: 'This action is reserved for the member and/or an appropriately authorized human or licensed professional. Aureus will keep carrying the surrounding preparation and tracking work.',
    };
  }

  async reportOutcome(matterId: string, dto: ReportLegalMatterOutcomeDto, caller: AuthenticatedUser) {
    const matter = await this.ownedMatter(matterId, caller.id);
    const report = await this.needs.recordOutcomeReport(
      matter.statedNeedId,
      dto.resolved ? NeedOutcomeStatus.RESOLVED : NeedOutcomeStatus.STILL_UNRESOLVED,
      dto.note,
      caller.id,
    );

    if (dto.resolved) {
      const responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
        matter.responsibilityId,
        caller,
      );
      if (responsibility.status !== ResponsibilityStatus.COMPLETED) {
        await this.responsibilities.completePersonalNeedWithEvidence(
          matter.responsibilityId,
          caller,
          {
            sourceSystem: 'NEEDS',
            sourceRecordType: 'NeedOutcomeReport',
            sourceRecordId: report.id,
            sourceState: NeedOutcomeStatus.RESOLVED,
            evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
          },
        );
      }
      await this.prisma.db.legalMatter.update({
        where: { id: matterId },
        data: {
          outcomeSummary: dto.note?.trim() || 'Member reported the underlying legal need resolved.',
          closedAt: new Date(),
          retentionState: LegalMatterRetentionState.REVIEW_REQUIRED,
        },
      });
    } else {
      await this.prisma.db.legalMatter.update({
        where: { id: matterId },
        data: {
          outcomeSummary: dto.note?.trim() || 'Member reported the underlying legal need remains unresolved.',
          closedAt: null,
        },
      });
    }

    return this.project(matterId, caller.id);
  }

  async preparationPacket(matterId: string, caller: AuthenticatedUser) {
    const state = await this.project(matterId, caller.id);
    return {
      matterId: state.id,
      responsibilityId: state.responsibility.id,
      summary: state.responsibility.objective,
      jurisdiction: state.jurisdiction,
      forum: state.forum,
      proceduralPosture: state.proceduralPosture,
      urgency: state.urgency,
      deadlines: state.deadlines,
      facts: state.facts,
      sources: state.sources,
      legalAidResources: state.legalAidResources,
      unresolvedLegalQuestions: [
        'Which legal propositions actually control these facts?',
        'Are any reported deadlines legally calculated or only member-reported?',
        'Does any next action require licensed counsel, representation authority, signature, sworn certification, service, or appearance?',
      ],
      memberDecisionsRemainWithMember: true,
      legalReviewRequired: state.legalReviewRequired,
      retention: state.retention,
    };
  }

  async verifySourceIdentity(
    matterId: string,
    sourceId: string,
    dto: VerifyLegalSourceIdentityDto,
    reviewerId: string,
  ) {
    await this.reviewableMatter(matterId);
    const source = await this.prisma.db.legalMatterSource.findFirst({
      where: { id: sourceId, matterId },
    });
    if (!source) throw new NotFoundException('Matter source not found');
    return this.prisma.db.legalMatterSource.update({
      where: { id: source.id },
      data: {
        verification: LegalMatterSourceVerification.IDENTITY_VERIFIED,
        provenance: LegalMatterProvenance.OBSERVED,
        verifiedAt: new Date(),
        verifiedByUserId: reviewerId,
        verificationNote: dto.note?.trim() || 'Official-source identity checked under an explicit member review request; applicability remains undetermined.',
      },
    });
  }

  async observeFact(
    matterId: string,
    dto: ObserveLegalFactDto,
    reviewerId: string,
  ) {
    await this.reviewableMatter(matterId);
    const source = await this.prisma.db.legalMatterSource.findFirst({
      where: {
        id: dto.sourceId,
        matterId,
        verification: LegalMatterSourceVerification.IDENTITY_VERIFIED,
      },
    });
    if (!source) {
      throw new BadRequestException('An observed legal fact requires a source whose official identity has already been verified');
    }
    return this.prisma.db.legalMatterFact.create({
      data: {
        matterId,
        sourceId: source.id,
        statement: dto.statement.trim(),
        provenance: LegalMatterProvenance.OBSERVED,
        observedAt: new Date(),
        observedByUserId: reviewerId,
      },
    });
  }

  async completeReview(matterId: string, reviewerId: string) {
    const matter = await this.reviewableMatter(matterId);
    await this.prisma.db.legalMatterReviewRequest.updateMany({
      where: { matterId, status: LegalMatterReviewStatus.PENDING },
      data: {
        status: LegalMatterReviewStatus.COMPLETED,
        completedAt: new Date(),
        completedByUserId: reviewerId,
      },
    });
    await this.prisma.db.legalMatter.update({
      where: { id: matter.id },
      data: { legalReviewRequired: false },
    });
    return { completed: true };
  }

  private async project(matterId: string, userId: string) {
    const matter = await this.prisma.db.legalMatter.findFirst({
      where: { id: matterId, userId },
      include: {
        responsibility: { include: { events: { orderBy: { occurredAt: 'asc' } } } },
        sources: { orderBy: { createdAt: 'asc' } },
        facts: { orderBy: { createdAt: 'asc' } },
        deadlines: { orderBy: { dueAt: 'asc' } },
        reviewRequests: { orderBy: { createdAt: 'desc' } },
        documentLinks: {
          include: {
            document: {
              select: { id: true, title: true, originalFilename: true, mimeType: true, uploadedAt: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!matter) throw new NotFoundException('Legal Matter not found');

    const [resources, policy] = await Promise.all([
      this.needs.findMatchingResources(matter.statedNeedId, userId),
      this.prisma.db.legalJurisdictionPolicy.findFirst({
        where: {
          jurisdiction: { equals: matter.jurisdiction, mode: 'insensitive' },
          matterType: { equals: matter.matterType, mode: 'insensitive' },
          assistanceCategory: 'EXPANDED_PRO_SE_SUPPORT',
        },
        orderBy: { checkedAt: 'desc' },
      }),
    ]);

    return {
      ...matter,
      legalAidResources: resources.filter((resource) => resource.category === 'LEGAL_AID'),
      jurisdictionGate: policy
        ? {
            status: policy.status,
            sourceUrl: policy.sourceUrl,
            checkedAt: policy.checkedAt,
            effectiveAt: policy.effectiveAt,
            notes: policy.notes,
          }
        : {
            status: 'SAFE_MODE_ONLY',
            sourceUrl: null,
            checkedAt: null,
            effectiveAt: null,
            notes: 'No governed jurisdiction-specific expanded-assistance policy is active. Aureus remains in safe mode.',
          },
      retention: {
        basis: matter.retentionBasis,
        state: matter.retentionState,
        reviewAt: matter.retentionReviewAt,
        legalHoldBasis: matter.legalHoldBasis,
      },
    };
  }

  private async ownedMatter(matterId: string, userId: string) {
    const matter = await this.prisma.db.legalMatter.findFirst({
      where: { id: matterId, userId },
    });
    if (!matter) throw new NotFoundException('Legal Matter not found');
    return matter;
  }

  private async reviewableMatter(matterId: string) {
    const matter = await this.prisma.db.legalMatter.findUnique({
      where: { id: matterId },
    });
    if (!matter) throw new NotFoundException('Legal Matter not found');
    const pending = await this.prisma.db.legalMatterReviewRequest.findFirst({
      where: { matterId, status: LegalMatterReviewStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) {
      throw new NotFoundException('No member-authorized legal review request is open for this Matter');
    }
    return matter;
  }

  private async getOwnedNeed(statedNeedId: string, callerId: string) {
    const needs = await this.needs.findMine(callerId);
    const need = needs.find((candidate) => candidate.id === statedNeedId);
    if (!need) throw new NotFoundException('Stated need not found');
    return need;
  }
}
