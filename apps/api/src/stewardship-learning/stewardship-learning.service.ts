import { randomUUID } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AiMessageRole,
  NeedOutcomeStatus,
  Prisma,
  ResponsibilityContextType,
  ResponsibilityKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListLearningCandidatesQuery } from './dto/list-learning-candidates.query';
import { classifyExplicitMemberLearningSignal } from './member-learning-signal.util';
import {
  StewardshipLearningCandidate,
  StewardshipLearningCandidatePage,
  StewardshipLearningServiceContext,
} from './stewardship-learning.types';

const DEFAULT_LIMIT = 100;
const MESSAGE_SCAN_MULTIPLIER = 8;
const MAX_MESSAGE_SCAN = 1_000;
const EXPORT_CONTEXT_TTL_MS = 5 * 60 * 1_000;

interface ResponsibilityPointer {
  id: string;
  originConversationId: string | null;
  successCriteria: Prisma.JsonValue;
  createdAt: Date;
}

@Injectable()
export class StewardshipLearningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build a privacy-minimized, read-only projection from canonical runtime
   * truth into the already-versioned product-v1 outcome_feedback contract.
   *
   * Nothing here writes learning state. Re-reading the same source records
   * deterministically produces the same event ids, so Foundry can safely
   * dedupe/replay without Aureus creating a second evidence database.
   */
  async listCandidates(
    query: ListLearningCandidatesQuery,
  ): Promise<StewardshipLearningCandidatePage> {
    const since = new Date(query.since);
    const until = query.until ? new Date(query.until) : new Date();
    if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
      throw new BadRequestException('Invalid learning window');
    }
    if (since >= until) {
      throw new BadRequestException('since must be earlier than until');
    }

    const limit = query.limit ?? DEFAULT_LIMIT;
    const messageScanLimit = Math.min(limit * MESSAGE_SCAN_MULTIPLIER, MAX_MESSAGE_SCAN);
    const range = { gte: since, lt: until };

    const [outcomeReports, unresolvedNeeds, memberMessages] = await Promise.all([
      this.prisma.db.needOutcomeReport.findMany({
        where: { createdAt: range },
        select: {
          id: true,
          userId: true,
          statedNeedId: true,
          status: true,
          createdAt: true,
          statedNeed: { select: { conversationId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.db.unresolvedNeed.findMany({
        where: { createdAt: range },
        select: {
          id: true,
          userId: true,
          statedNeedId: true,
          reason: true,
          createdAt: true,
          statedNeed: { select: { conversationId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.db.aiMessage.findMany({
        where: {
          role: AiMessageRole.USER,
          createdAt: range,
        },
        select: {
          id: true,
          conversationId: true,
          content: true,
          createdAt: true,
          conversation: { select: { userId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: messageScanLimit,
      }),
    ]);

    const conversationIds = new Set<string>();
    for (const report of outcomeReports) conversationIds.add(report.statedNeed.conversationId);
    for (const unresolved of unresolvedNeeds) conversationIds.add(unresolved.statedNeed.conversationId);
    for (const message of memberMessages) conversationIds.add(message.conversationId);

    const responsibilities = conversationIds.size
      ? await this.prisma.db.responsibility.findMany({
          where: {
            contextType: ResponsibilityContextType.PERSONAL,
            kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
            originConversationId: { in: [...conversationIds] },
          },
          select: {
            id: true,
            originConversationId: true,
            successCriteria: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const byNeed = this.indexResponsibilitiesByNeed(responsibilities);
    const byConversation = this.indexResponsibilitiesByConversation(responsibilities);
    const generatedAt = new Date();
    const candidates: StewardshipLearningCandidate[] = [];

    for (const report of outcomeReports) {
      const responsibility = byNeed.get(report.statedNeedId);
      if (!responsibility) continue;

      candidates.push({
        contract_version: '1.0.0',
        context: this.contextFor(report.userId, generatedAt),
        event_id: `need-outcome:${report.id}`,
        work_id: responsibility.id,
        // A NeedOutcomeReport proves the member-reported state of the need.
        // It does not by itself prove Aureus caused that state, so causal
        // helpfulness remains unknown until separately evidenced.
        outcome: 'unknown',
        feedback: {
          signal_kind: 'OUTCOME_REPORTED',
          source: {
            system: 'NEEDS',
            record_type: 'NeedOutcomeReport',
            record_id: report.id,
            state: report.status,
          },
          source_provenance: 'REPORTED',
          classification_provenance: 'OBSERVED',
          capability_hints: [],
          capabilities_used: [ResponsibilityKind.PERSONAL_NEED_RESOLUTION],
          causal_attribution: 'UNDETERMINED',
        },
        occurred_at: report.createdAt.toISOString(),
        candidate_only: true,
      });
    }

    for (const unresolved of unresolvedNeeds) {
      const responsibility = byNeed.get(unresolved.statedNeedId);
      if (!responsibility) continue;

      candidates.push({
        contract_version: '1.0.0',
        context: this.contextFor(unresolved.userId, generatedAt),
        event_id: `unresolved-need:${unresolved.id}`,
        work_id: responsibility.id,
        outcome: 'unknown',
        feedback: {
          signal_kind: 'NO_CURRENT_ROUTE',
          source: {
            system: 'NEEDS',
            record_type: 'UnresolvedNeed',
            record_id: unresolved.id,
            state: unresolved.reason,
          },
          source_provenance: 'OBSERVED',
          classification_provenance: 'OBSERVED',
          capability_hints: [],
          capabilities_used: [ResponsibilityKind.PERSONAL_NEED_RESOLUTION],
          causal_attribution: 'NOT_APPLICABLE',
        },
        occurred_at: unresolved.createdAt.toISOString(),
        candidate_only: true,
      });
    }

    for (const message of memberMessages) {
      const classification = classifyExplicitMemberLearningSignal(message.content);
      if (!classification) continue;

      // PEOPLE-LEARN-001 Step 1 learns only from the existing universal
      // People need-to-resolution loop. Do not manufacture a work_id or
      // attribute another Personal Responsibility kind to that capability.
      const responsibility = byConversation.get(message.conversationId);
      if (!responsibility) continue;

      candidates.push({
        contract_version: '1.0.0',
        context: this.contextFor(message.conversation.userId, generatedAt),
        event_id: `member-message:${message.id}`,
        work_id: responsibility.id,
        outcome: 'unknown',
        feedback: {
          signal_kind: classification.signalKind,
          source: {
            system: 'AI_CONVERSATION',
            record_type: 'AiMessage',
            record_id: message.id,
            state: 'USER_MESSAGE',
          },
          // The member authored the source. Interpreting it as product or
          // stewardship feedback is still an inference, kept separate here.
          source_provenance: 'REPORTED',
          classification_provenance: 'INFERRED',
          capability_hints: classification.capabilityHints,
          capabilities_used: [ResponsibilityKind.PERSONAL_NEED_RESOLUTION],
          causal_attribution: 'UNDETERMINED',
        },
        occurred_at: message.createdAt.toISOString(),
        candidate_only: true,
      });
    }

    candidates.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

    return {
      contract_version: '1.0.0',
      generated_at: generatedAt.toISOString(),
      since: since.toISOString(),
      until: until.toISOString(),
      candidates: candidates.slice(0, limit),
    };
  }

  private indexResponsibilitiesByNeed(
    responsibilities: ResponsibilityPointer[],
  ): Map<string, ResponsibilityPointer> {
    const result = new Map<string, ResponsibilityPointer>();
    for (const responsibility of responsibilities) {
      const statedNeedId = this.readStatedNeedId(responsibility.successCriteria);
      if (statedNeedId && !result.has(statedNeedId)) {
        result.set(statedNeedId, responsibility);
      }
    }
    return result;
  }

  private indexResponsibilitiesByConversation(
    responsibilities: ResponsibilityPointer[],
  ): Map<string, ResponsibilityPointer> {
    const result = new Map<string, ResponsibilityPointer>();
    for (const responsibility of responsibilities) {
      if (
        responsibility.originConversationId &&
        !result.has(responsibility.originConversationId)
      ) {
        result.set(responsibility.originConversationId, responsibility);
      }
    }
    return result;
  }

  private readStatedNeedId(value: Prisma.JsonValue): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const statedNeedId = (value as Prisma.JsonObject).statedNeedId;
    return typeof statedNeedId === 'string' ? statedNeedId : null;
  }

  private contextFor(
    userId: string,
    generatedAt: Date,
  ): StewardshipLearningServiceContext {
    return {
      contract_version: '1.0.0',
      request_id: randomUUID(),
      // People work has no Business tenant. Keep the personal boundary
      // explicit while subject_id identifies the exact member whose canonical
      // evidence produced this candidate.
      tenant_id: 'personal',
      subject_id: userId,
      service_id: 'aureus-v1',
      roles: ['service', 'learning-candidate'],
      issued_at: generatedAt.toISOString(),
      expires_at: new Date(generatedAt.getTime() + EXPORT_CONTEXT_TTL_MS).toISOString(),
    };
  }
}
