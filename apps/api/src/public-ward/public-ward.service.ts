import { createHash, randomBytes } from 'node:crypto';
import {
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BusinessKnowledgeStatus,
  BusinessPublicStatus,
  OrganizationStatus,
  OrganizationType,
  Prisma,
  WardConversationStatus,
  WardMessageRole,
  WardResponseKind,
  VerificationStatus,
} from '@prisma/client';
import { AiRequestsService } from '../ai/requests/ai-requests.service';
import { sanitizePlainText } from '../common/utils/sanitize-text';
import { CRISIS_REDIRECT_MESSAGE, isCrisisLanguage } from '../needs/crisis-detection.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildWardGroundingPrompt,
  rankWardKnowledge,
  validateGroundedWardAnswer,
  type RankedWardSource,
} from './ward-grounding.util';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TURNS = 20;
const HISTORY_MESSAGES = 6;
const OPENING_MESSAGE = 'How can we help?';

type PublicContact = {
  type: 'PHONE' | 'SMS' | 'EMAIL' | 'WEBSITE';
  value: string;
  label?: string;
};

interface PublishedWardTenant {
  id: string;
  name: string;
  shortDescription: string;
  websiteUrl: string;
  businessProfile: {
    publicSlug: string | null;
    serviceArea: Prisma.JsonValue;
    businessHours: Prisma.JsonValue;
    contactRoutes: Prisma.JsonValue;
  };
}

@Injectable()
export class PublicWardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRequests: AiRequestsService,
  ) {}

  async getPublicProfile(slug: string) {
    const tenant = await this.findPublishedTenant(slug);
    return this.toPublicProfile(tenant);
  }

  async startConversation(slug: string) {
    const tenant = await this.findPublishedTenant(slug);
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    const expiresAt = new Date(now.getTime() + RETENTION_MS);

    const { conversation, opening } = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.wardConversation.create({
        data: {
          organizationId: tenant.id,
          accessTokenHash: this.hashToken(token),
          tokenExpiresAt,
          expiresAt,
        },
      });
      const message = await tx.wardMessage.create({
        data: {
          organizationId: tenant.id,
          conversationId: created.id,
          role: WardMessageRole.WARD,
          responseKind: WardResponseKind.OPENING,
          content: OPENING_MESSAGE,
        },
      });
      return { conversation: created, opening: message };
    });

    return {
      conversationId: conversation.id,
      accessToken: token,
      tokenExpiresAt,
      expiresAt,
      status: conversation.status,
      remainingTurns: MAX_TURNS,
      profile: this.toPublicProfile(tenant),
      messages: [this.toPublicMessage(opening, [])],
    };
  }

  async getConversation(slug: string, conversationId: string, token: string | undefined) {
    const tenant = await this.findPublishedTenant(slug);
    const conversation = await this.requireConversation(tenant.id, conversationId, token);
    const messages = await this.prisma.db.wardMessage.findMany({
      where: { organizationId: tenant.id, conversationId },
      include: { sources: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return {
      conversationId,
      status: conversation.status,
      remainingTurns: Math.max(0, MAX_TURNS - conversation.turnCount),
      profile: this.toPublicProfile(tenant),
      messages: messages.map((message) => this.toPublicMessage(message, message.sources)),
    };
  }

  async sendMessage(
    slug: string,
    conversationId: string,
    token: string | undefined,
    rawContent: string,
  ) {
    const tenant = await this.findPublishedTenant(slug);
    const conversation = await this.requireConversation(tenant.id, conversationId, token);
    const content = sanitizePlainText(rawContent).slice(0, 1200);
    if (!content) throw new NotFoundException('Conversation not found');

    const reserved = await this.prisma.db.wardConversation.updateMany({
      where: {
        id: conversation.id,
        organizationId: tenant.id,
        status: { in: [WardConversationStatus.OPEN, WardConversationStatus.ESCALATION_OFFERED] },
        turnCount: { lt: MAX_TURNS },
        tokenExpiresAt: { gt: new Date() },
      },
      data: { turnCount: { increment: 1 }, lastActivityAt: new Date() },
    });
    if (reserved.count !== 1) {
      throw new HttpException(
        'This conversation has reached its limit. Please use the business contact route.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const visitorMessage = await this.prisma.db.wardMessage.create({
      data: {
        organizationId: tenant.id,
        conversationId,
        role: WardMessageRole.VISITOR,
        content,
      },
    });

    if (isCrisisLanguage(content)) {
      return this.persistAnswer({
        tenant,
        conversationId,
        visitorMessage,
        content: CRISIS_REDIRECT_MESSAGE,
        responseKind: WardResponseKind.SAFETY,
        sources: [],
        nextStatus: WardConversationStatus.ESCALATION_OFFERED,
      });
    }

    const approvedKnowledge = await this.prisma.db.businessKnowledgeRecord.findMany({
      where: {
        organizationId: tenant.id,
        status: BusinessKnowledgeStatus.APPROVED,
        deletedAt: null,
        reviewedAt: { not: null },
        nextReviewAt: { gt: new Date() },
      },
      select: {
        id: true,
        title: true,
        summary: true,
        content: true,
        knowledgeType: true,
        sourceUrl: true,
        reviewedAt: true,
      },
      orderBy: [{ reviewedAt: 'desc' }, { title: 'asc' }],
      take: 200,
    });

    const ranked = rankWardKnowledge(content, approvedKnowledge);
    if (ranked.length === 0) {
      return this.persistUnknown(tenant, conversationId, visitorMessage);
    }

    const historyRows = await this.prisma.db.wardMessage.findMany({
      where: {
        organizationId: tenant.id,
        conversationId,
        id: { not: visitorMessage.id },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: HISTORY_MESSAGES,
    });
    const history = historyRows.reverse().map((message) => ({
      role: message.role === WardMessageRole.VISITOR ? 'user' as const : 'assistant' as const,
      content: message.content.slice(0, 1800),
    }));

    try {
      const completion = await this.aiRequests.runWardCompletion({
        organizationId: tenant.id,
        wardConversationId: conversationId,
        messages: [
          { role: 'system', content: buildWardGroundingPrompt(tenant.name, ranked) },
          ...history,
          { role: 'user', content },
        ],
        maxTokens: 450,
        temperature: 0.1,
      });

      if (completion.moderationBlocked) {
        return this.persistAnswer({
          tenant,
          conversationId,
          visitorMessage,
          content: completion.content,
          responseKind: WardResponseKind.SAFETY,
          sources: [],
          nextStatus: WardConversationStatus.ESCALATION_OFFERED,
        });
      }

      const validated = validateGroundedWardAnswer(completion.content, ranked.length);
      if (!validated) {
        return this.persistUnknown(tenant, conversationId, visitorMessage);
      }

      return this.persistAnswer({
        tenant,
        conversationId,
        visitorMessage,
        content: validated.content,
        responseKind: WardResponseKind.GROUNDED,
        sources: validated.sourceIndexes.map((index) => ranked[index]),
        nextStatus: WardConversationStatus.OPEN,
      });
    } catch {
      const fallback = `I'm temporarily unable to check ${tenant.name}'s approved information. Please use the human contact route shown here.`;
      return this.persistAnswer({
        tenant,
        conversationId,
        visitorMessage,
        content: fallback,
        responseKind: WardResponseKind.ESCALATION,
        sources: [],
        nextStatus: WardConversationStatus.ESCALATION_OFFERED,
      });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredConversations(): Promise<void> {
    await this.prisma.db.wardConversation.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }

  private async persistUnknown(
    tenant: PublishedWardTenant,
    conversationId: string,
    visitorMessage: { id: string; content: string; createdAt: Date },
  ) {
    return this.persistAnswer({
      tenant,
      conversationId,
      visitorMessage,
      content: `I don't know from ${tenant.name}'s approved information. A person at the business can help with that.`,
      responseKind: WardResponseKind.UNKNOWN,
      sources: [],
      nextStatus: WardConversationStatus.ESCALATION_OFFERED,
    });
  }

  private async persistAnswer(params: {
    tenant: PublishedWardTenant;
    conversationId: string;
    visitorMessage: { id: string; content: string; createdAt: Date };
    content: string;
    responseKind: WardResponseKind;
    sources: RankedWardSource[];
    nextStatus: WardConversationStatus;
  }) {
    const answerContent = sanitizePlainText(params.content).slice(0, 8000);
    const answer = await this.prisma.db.$transaction(async (tx) => {
      const message = await tx.wardMessage.create({
        data: {
          organizationId: params.tenant.id,
          conversationId: params.conversationId,
          role: WardMessageRole.WARD,
          content: answerContent,
          responseKind: params.responseKind,
        },
      });

      if (params.sources.length > 0) {
        await tx.wardMessageSource.createMany({
          data: params.sources.map(({ source }) => ({
            organizationId: params.tenant.id,
            wardMessageId: message.id,
            knowledgeRecordId: source.id,
            sourceTitle: source.title,
            sourceUrl: source.sourceUrl,
            sourceReviewedAt: source.reviewedAt!,
            sourceContentSha256: createHash('sha256').update(source.content).digest('hex'),
          })),
        });
      }

      await tx.wardConversation.update({
        where: { id: params.conversationId },
        data: { status: params.nextStatus, lastActivityAt: new Date() },
      });

      return tx.wardMessage.findUniqueOrThrow({
        where: { id: message.id },
        include: { sources: { orderBy: { createdAt: 'asc' } } },
      });
    });

    const refreshed = await this.prisma.db.wardConversation.findUniqueOrThrow({
      where: { id: params.conversationId },
      select: { status: true, turnCount: true },
    });

    return {
      conversationId: params.conversationId,
      status: refreshed.status,
      remainingTurns: Math.max(0, MAX_TURNS - refreshed.turnCount),
      visitorMessage: this.toPublicMessage(params.visitorMessage, []),
      message: this.toPublicMessage(answer, answer.sources),
      humanContact: this.publicContact(params.tenant.businessProfile!.contactRoutes),
    };
  }

  private async requireConversation(
    organizationId: string,
    conversationId: string,
    token: string | undefined,
  ) {
    if (!token || token.length < 40 || token.length > 100) {
      throw new NotFoundException('Conversation not found');
    }

    const conversation = await this.prisma.db.wardConversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
        accessTokenHash: this.hashToken(token),
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const now = new Date();
    if (conversation.expiresAt <= now || conversation.tokenExpiresAt <= now) {
      await this.prisma.db.wardConversation.updateMany({
        where: { id: conversation.id, organizationId },
        data: { status: WardConversationStatus.EXPIRED },
      });
      throw new GoneException('This private conversation link has expired. Start a new conversation.');
    }

    return conversation;
  }

  private async findPublishedTenant(slug: string): Promise<PublishedWardTenant> {
    const safeSlug = slug.toLowerCase().trim();
    const tenant = await this.prisma.db.organization.findFirst({
      where: {
        deletedAt: null,
        organizationType: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        businessProfile: {
          is: {
            publicSlug: safeSlug,
            publicStatus: BusinessPublicStatus.PUBLISHED,
            onboardingCompletedAt: { not: null },
          },
        },
      },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        websiteUrl: true,
        businessProfile: {
          select: {
            publicSlug: true,
            serviceArea: true,
            businessHours: true,
            contactRoutes: true,
          },
        },
      },
    });
    if (!tenant?.businessProfile) throw new NotFoundException('Ward not found');
    return tenant as PublishedWardTenant;
  }

  private toPublicProfile(tenant: PublishedWardTenant) {
    return {
      slug: tenant.businessProfile!.publicSlug,
      name: tenant.name,
      description: tenant.shortDescription,
      websiteUrl: tenant.websiteUrl,
      serviceArea: tenant.businessProfile!.serviceArea,
      businessHours: tenant.businessProfile!.businessHours,
      contactRoutes: this.publicContacts(tenant.businessProfile!.contactRoutes),
      notice: 'This Ward answers from business-approved information. It can be wrong or incomplete, cannot make commitments, and is not an emergency service.',
    };
  }

  private toPublicMessage(
    message: {
      id: string;
      content: string;
      createdAt: Date;
      role?: WardMessageRole;
      responseKind?: WardResponseKind | null;
    },
    sources: Array<{
      sourceTitle: string;
      sourceUrl: string | null;
      sourceReviewedAt: Date;
    }>,
  ) {
    return {
      id: message.id,
      role: message.role ?? WardMessageRole.VISITOR,
      content: message.content,
      responseKind: message.responseKind ?? null,
      createdAt: message.createdAt,
      sources: sources.map((source) => ({
        title: source.sourceTitle,
        url: this.safeHttpUrl(source.sourceUrl),
        reviewedAt: source.sourceReviewedAt,
      })),
    };
  }

  private publicContacts(value: unknown): PublicContact[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const route = entry as Record<string, unknown>;
      if (!['PHONE', 'SMS', 'EMAIL', 'WEBSITE'].includes(String(route.type))) return [];
      if (typeof route.value !== 'string' || !route.value.trim()) return [];
      const type = route.type as PublicContact['type'];
      const value = sanitizePlainText(route.value).slice(0, 500);
      if (type === 'WEBSITE' && !this.safeHttpUrl(value)) return [];
      return [{
        type,
        value,
        ...(typeof route.label === 'string' && route.label.trim()
          ? { label: sanitizePlainText(route.label).slice(0, 80) }
          : {}),
      }];
    }).slice(0, 12);
  }

  private publicContact(value: unknown): PublicContact | null {
    return this.publicContacts(value)[0] ?? null;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private safeHttpUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  }
}
