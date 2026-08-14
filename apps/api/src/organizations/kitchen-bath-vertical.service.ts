import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BusinessKnowledgeSourceKind,
  BusinessKnowledgeStatus,
  BusinessKnowledgeType,
  OrganizationMemberRole,
  OrganizationType,
  Prisma,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

const PACK_PREFIX = 'PF009_KITCHEN_BATH:';
const PACK_EDIT_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
  OrganizationMemberRole.OPERATOR,
];

export const KITCHEN_BATH_ESTIMATION_BOUNDARY =
  'Never fabricate a project quote, allowance, schedule, permit requirement, or scope commitment. Use only current business-approved knowledge. When the approved information does not support an answer, say so and offer a human handoff.';

export const KITCHEN_BATH_VERTICAL_THESIS = {
  id: 'kitchen-bath-v1',
  name: 'Kitchen & Bath Remodeler',
  purpose:
    'Help a remodeler answer ordinary pre-sale questions accurately, collect only useful project context, and hand an interested visitor to a person without pretending the Ward can estimate or contract for the business.',
  principles: [
    'Ground business claims only in current approved tenant knowledge.',
    'Qualification is transparent visitor-supplied context, never hidden scoring or persuasion.',
    'Budget is optional and should be requested only when it materially helps the visitor or business.',
    'Photos or files are optional, consented handoff material and inherit the handoff retention/deletion boundary.',
    KITCHEN_BATH_ESTIMATION_BOUNDARY,
  ],
  intake: [
    'project type',
    'rooms',
    'scope',
    'location',
    'desired timing',
    'ownership/decision status',
    'budget range only when appropriate',
    'design needs',
    'preferred contact',
  ],
  scheduling:
    'The Ward may explain the business-approved consultation or scheduling process, but must not invent appointment availability. If live scheduling is not integrated, create the consented handoff and state that the business team will follow up.',
};

const PACK_TEMPLATES: Array<{
  key: string;
  type: BusinessKnowledgeType;
  title: string;
  summary: string;
  content: string;
}> = [
  {
    key: 'services',
    type: BusinessKnowledgeType.SERVICE,
    title: 'Kitchen & Bath — services offered',
    summary: 'Review and replace this template with the remodeler’s actual current services.',
    content:
      'DRAFT TEMPLATE — List the kitchen and bathroom remodeling services this business actually offers. Include design-only, design-build, cabinetry, countertops, plumbing/electrical coordination, flooring, tile, and fixture installation only when true. Do not imply a service is offered merely because it is common in the trade.',
  },
  {
    key: 'exclusions',
    type: BusinessKnowledgeType.POLICY,
    title: 'Kitchen & Bath — exclusions and unsupported work',
    summary: 'Explicitly record what the business does not perform or cannot commit to through the Ward.',
    content:
      'DRAFT TEMPLATE — Record exclusions such as handyman-only work, emergency repair, material-only sales, structural engineering, hazardous-material remediation, financing promises, permit/legal advice, or work outside the service area, but only if they are true for this business. The Ward must not infer exclusions from industry norms.',
  },
  {
    key: 'pricing',
    type: BusinessKnowledgeType.PRICING_BOUNDARY,
    title: 'Kitchen & Bath — estimation and pricing boundary',
    summary: 'Controls how the Ward discusses project cost before a human estimate.',
    content: `DRAFT TEMPLATE — ${KITCHEN_BATH_ESTIMATION_BOUNDARY} Record any business-approved starting ranges, consultation fees, design fees, minimum project size, allowance policies, or factors that affect price. If no approved range exists, the Ward must say it cannot quote the project and offer a human consultation.`,
  },
  {
    key: 'qualification',
    type: BusinessKnowledgeType.QUALIFICATION,
    title: 'Kitchen & Bath — useful intake and qualification',
    summary: 'Visitor-supplied context that helps a person understand the remodel request.',
    content:
      'DRAFT TEMPLATE — Useful intake may include project type, rooms, desired scope, project location, desired timing, whether the visitor owns or is authorized to make decisions for the property, optional budget range when appropriate, design help needed, photos/files they choose to share, and preferred contact. These are transparent context signals, not a hidden score.',
  },
  {
    key: 'handoff',
    type: BusinessKnowledgeType.ESCALATION,
    title: 'Kitchen & Bath — consultation and handoff process',
    summary: 'Business-approved next step after the Ward has answered what it can.',
    content:
      'DRAFT TEMPLATE — Describe the actual human follow-up process: who reviews requests, what information they need, whether an on-site or virtual consultation is typical, how scheduling occurs, and what the visitor should expect next. Do not claim an appointment is booked unless an integrated scheduling system has confirmed it.',
  },
];
const PACK_KEYS = PACK_TEMPLATES.map((template) => template.key);

@Injectable()
export class KitchenBathVerticalService {
  constructor(private readonly prisma: PrismaService) {}

  async getPack(organizationId: string) {
    const records = await this.prisma.db.businessKnowledgeRecord.findMany({
      where: {
        organizationId,
        deletedAt: null,
        sourceReference: { startsWith: PACK_PREFIX },
      },
      select: {
        id: true,
        title: true,
        knowledgeType: true,
        status: true,
        reviewedAt: true,
        nextReviewAt: true,
        sourceReference: true,
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
    return { thesis: KITCHEN_BATH_VERTICAL_THESIS, records };
  }

  async installDraftPack(organizationId: string, caller: AuthenticatedUser) {
    const organization = await this.prisma.db.organization.findFirst({
      where: {
        id: organizationId,
        organizationType: OrganizationType.BUSINESS,
        deletedAt: null,
      },
      select: {
        id: true,
        members: { where: { userId: caller.id }, select: { role: true }, take: 1 },
      },
    });
    if (!organization?.members[0]) {
      throw new NotFoundException(`Organization '${organizationId}' not found`);
    }
    if (!PACK_EDIT_ROLES.includes(organization.members[0].role)) {
      throw new ForbiddenException('You do not have permission to install business knowledge templates');
    }

    const existing = await this.prisma.db.businessKnowledgeRecord.findMany({
      where: { organizationId, deletedAt: null, sourceReference: { startsWith: PACK_PREFIX } },
      select: { sourceReference: true },
    });
    const existingKeys = new Set(
      existing.map((record) => record.sourceReference.slice(PACK_PREFIX.length).split('|')[0]),
    );
    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const created = [];
    for (const template of PACK_TEMPLATES) {
      if (existingKeys.has(template.key)) continue;
      const record = await this.prisma.db.businessKnowledgeRecord.create({
        data: {
          organizationId,
          title: template.title,
          summary: template.summary,
          content: template.content,
          knowledgeType: template.type,
          status: BusinessKnowledgeStatus.DRAFT,
          sourceKind: BusinessKnowledgeSourceKind.MANUAL,
          sourceReference: `${PACK_PREFIX}${template.key}|TEMPLATE:kitchen-bath-v1`,
          freshnessIntervalDays: 90,
          nextReviewAt,
          accountableReviewerId: caller.id,
          createdById: caller.id,
          lastUpdatedById: caller.id,
        },
      });
      created.push(record);
    }

    return {
      thesis: KITCHEN_BATH_VERTICAL_THESIS,
      createdCount: created.length,
      notice:
        'Templates were installed as DRAFT tenant knowledge. They cannot ground the public Ward until an authorized tenant reviewer edits, submits, and approves them.',
    };
  }

  async hasCurrentApprovedPack(organizationId: string, at = new Date()): Promise<boolean> {
    const approved = await this.prisma.db.businessKnowledgeRecord.findMany({
      where: {
        organizationId,
        deletedAt: null,
        sourceReference: { startsWith: PACK_PREFIX },
        status: BusinessKnowledgeStatus.APPROVED,
        reviewedAt: { not: null },
        nextReviewAt: { gt: at },
      },
      select: { sourceReference: true },
    });
    const approvedKeys = new Set(
      approved.map((record) => record.sourceReference.slice(PACK_PREFIX.length).split('|')[0]),
    );
    return PACK_KEYS.every((key) => approvedKeys.has(key));
  }

  static intakeSignals(intake: {
    projectType: string;
    rooms: string[];
    scope: string;
    decisionStatus?: string;
    budgetRange?: string;
    designNeeds?: string;
  }): Prisma.InputJsonObject[] {
    return [
      { key: 'vertical', label: 'Vertical', value: 'KITCHEN_BATH', basis: 'Approved tenant pack' },
      { key: 'project_type', label: 'Project type', value: intake.projectType, basis: 'Visitor supplied' },
      { key: 'rooms', label: 'Rooms', value: intake.rooms, basis: 'Visitor supplied' },
      { key: 'scope', label: 'Scope', value: intake.scope, basis: 'Visitor supplied' },
      ...(intake.decisionStatus
        ? [{ key: 'decision_status', label: 'Ownership / decision status', value: intake.decisionStatus, basis: 'Visitor supplied' }]
        : []),
      ...(intake.budgetRange
        ? [{ key: 'budget_range', label: 'Budget range', value: intake.budgetRange, basis: 'Visitor supplied; optional' }]
        : []),
      ...(intake.designNeeds
        ? [{ key: 'design_needs', label: 'Design needs', value: intake.designNeeds, basis: 'Visitor supplied' }]
        : []),
    ] as Prisma.InputJsonObject[];
  }
}
