import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BusinessPublicStatus,
  OrganizationStatus,
  OrganizationType,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { sanitizePlainText } from '../common/utils/sanitize-text';
import { KitchenBathVerticalService } from '../organizations/kitchen-bath-vertical.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWardLeadDto } from './dto/create-ward-lead.dto';
import { KitchenBathIntakeDto } from './dto/kitchen-bath-intake.dto';
import { WardLeadService } from './ward-lead.service';
import { buildKitchenBathReadyProject } from './kitchen-bath-ready-project';

@Injectable()
export class KitchenBathPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vertical: KitchenBathVerticalService,
    private readonly leads: WardLeadService,
  ) {}

  async profile(slug: string) {
    const tenant = await this.findPublishedTenant(slug);
    const active = await this.vertical.hasCurrentApprovedPack(tenant.id);
    return {
      active,
      vertical: active ? 'KITCHEN_BATH' : null,
      intakeAvailable: active,
      estimationBoundary:
        active
          ? 'The Ward cannot fabricate a quote or appointment. Cost, scope, and scheduling claims must come from current business-approved information.'
          : null,
      attachments: active
        ? {
            optional: true,
            maxItems: 6,
            maxBytesEach: 20_000_000,
            storageMode: 'OPAQUE_REFERENCE',
            note: 'The deployment storage adapter creates the opaque reference; the Ward does not fetch arbitrary visitor URLs.',
          }
        : null,
    };
  }

  async submit(
    slug: string,
    conversationId: string,
    token: string | undefined,
    dto: CreateWardLeadDto,
  ) {
    const tenant = await this.findPublishedTenant(slug);
    if (!(await this.vertical.hasCurrentApprovedPack(tenant.id))) {
      throw new NotFoundException('Kitchen & Bath intake not available');
    }
    if (!dto.kitchenBath) {
      throw new ConflictException('Kitchen & Bath project details are required for this intake');
    }

    const cleaned = this.cleanIntake(dto.kitchenBath);
    const intakeHash = this.hash(JSON.stringify(cleaned));
    const handoff = await this.leads.submitPublicHandoff(slug, conversationId, token, dto);

    const lead = await this.prisma.db.wardLead.findFirst({
      where: { id: handoff.handoffId, organizationId: tenant.id },
      select: {
        id: true,
        projectLocation: true,
        desiredTiming: true,
        consentVersion: true,
        submittedAt: true,
        retentionExpiresAt: true,
        qualificationSignals: true,
      },
    });
    if (!lead) throw new NotFoundException('Handoff not found');

    const current = Array.isArray(lead.qualificationSignals)
      ? (lead.qualificationSignals as Prisma.JsonArray)
      : [];
    const existingHash = current.find((entry) => {
      if (!entry || Array.isArray(entry) || typeof entry !== 'object') return false;
      return (entry as Prisma.JsonObject).key === 'kitchen_bath_intake_hash';
    });
    if (existingHash && !Array.isArray(existingHash) && typeof existingHash === 'object') {
      if ((existingHash as Prisma.JsonObject).value !== intakeHash) {
        throw new ConflictException('This conversation already has different remodel intake details');
      }
      return {
        ...handoff,
        readyProject: buildKitchenBathReadyProject(lead),
      };
    }

    const signals = [
      ...current,
      ...KitchenBathVerticalService.intakeSignals(cleaned),
      {
        key: 'kitchen_bath_intake_hash',
        label: 'Remodel intake integrity',
        value: intakeHash,
        basis: 'System SHA-256',
      },
      ...(cleaned.attachments?.length
        ? [
            {
              key: 'project_attachments',
              label: 'Optional project files',
              value: cleaned.attachments,
              basis: 'Visitor supplied under handoff consent; retained with this handoff',
            },
          ]
        : []),
    ] as Prisma.InputJsonArray;

    const updated = await this.prisma.db.wardLead.updateMany({
      where: { id: lead.id, organizationId: tenant.id },
      data: { qualificationSignals: signals },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'The handoff changed before its Ready Project could be confirmed. Reload before retrying.',
      );
    }

    return {
      ...handoff,
      readyProject: buildKitchenBathReadyProject({
        ...lead,
        qualificationSignals: signals,
      }),
    };
  }

  private cleanIntake(intake: KitchenBathIntakeDto) {
    return {
      projectType: intake.projectType,
      rooms: intake.rooms.map((room) => sanitizePlainText(room).slice(0, 80)).filter(Boolean),
      scope: sanitizePlainText(intake.scope).slice(0, 1500),
      ...(intake.decisionStatus && { decisionStatus: intake.decisionStatus }),
      ...(intake.budgetRange && { budgetRange: intake.budgetRange }),
      ...(intake.designNeeds && {
        designNeeds: sanitizePlainText(intake.designNeeds).slice(0, 1000),
      }),
      ...(intake.priorities?.length
        ? { priorities: [...new Set(intake.priorities)].slice(0, 6) }
        : {}),
      ...(intake.mustHaves && {
        mustHaves: sanitizePlainText(intake.mustHaves).slice(0, 800),
      }),
      ...(intake.concerns && {
        concerns: sanitizePlainText(intake.concerns).slice(0, 800),
      }),
      ...(intake.attachments?.length
        ? {
            attachments: intake.attachments.map((file) => ({
              fileName: sanitizePlainText(file.fileName).slice(0, 160),
              mimeType: sanitizePlainText(file.mimeType).slice(0, 120),
              sizeBytes: file.sizeBytes,
              storageRef: sanitizePlainText(file.storageRef).slice(0, 1000),
            })),
          }
        : {}),
    };
  }

  private async findPublishedTenant(slug: string) {
    const tenant = await this.prisma.db.organization.findFirst({
      where: {
        deletedAt: null,
        organizationType: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        businessProfile: {
          is: {
            publicSlug: slug.toLowerCase().trim(),
            publicStatus: BusinessPublicStatus.PUBLISHED,
            onboardingCompletedAt: { not: null },
          },
        },
      },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Ward not found');
    return tenant;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
