import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationType, StewardshipRelationshipStatus } from '@prisma/client';
import type { Conversation, Message } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { sanitizePlainText } from '../../common/utils/sanitize-text';
import { PLATFORM_ADMIN_ROLES } from '../common/communication-roles.util';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { PaginatedConversationsResponseDto } from './dto/paginated-conversations-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageReportResponseDto } from './dto/message-report-response.dto';
import { PaginatedMessagesResponseDto } from './dto/paginated-messages-response.dto';
import { CONVERSATION_REPOSITORY, IConversationRepository } from './repositories/conversation.repository.interface';
import { IMessageRepository, MESSAGE_REPOSITORY } from './repositories/message.repository.interface';
import { IMessageReportRepository, MESSAGE_REPORT_REPOSITORY } from './repositories/message-report.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../../stewardship/relationships/repositories/stewardship-relationship.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../organizations/members/repositories/organization-member.repository.interface';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly repo: IConversationRepository,
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepo: IMessageRepository,
    @Inject(MESSAGE_REPORT_REPOSITORY) private readonly reportRepo: IMessageReportRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly relationshipRepo: IStewardshipRelationshipRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly orgMemberRepo: IOrganizationMemberRepository,
  ) {}

  /** Member-to-assigned-steward / steward-to-assigned-member. Idempotent: one thread per ACTIVE relationship. */
  async startStewardshipConversation(relationshipId: string, caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    const relationship = await this.relationshipRepo.findById(relationshipId);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${relationshipId}' not found`);
    if (relationship.status !== StewardshipRelationshipStatus.ACTIVE || !relationship.stewardId) {
      throw new ConflictException('A conversation can only be started for an ACTIVE stewardship relationship');
    }
    const isAdmin = hasRole(caller, PLATFORM_ADMIN_ROLES);
    if (!isAdmin && caller.id !== relationship.memberId && caller.id !== relationship.stewardId) {
      throw new ForbiddenException('You are not a party to this stewardship relationship');
    }

    const existing = await this.repo.findByRelationshipId(relationshipId);
    if (existing) return ConversationResponseDto.fromEntity(existing);

    const created = await this.repo.create({
      type: ConversationType.STEWARDSHIP,
      relationshipId,
      participantIds: [relationship.memberId, relationship.stewardId],
    });
    return ConversationResponseDto.fromEntity(created);
  }

  /**
   * Pod messaging (WO-030 §1.6) — reuses Conversation/Message/
   * ConversationParticipant directly, per ADR-012 Decision 8's own
   * forward-declaration of this exact extension. Idempotent: one thread per
   * Pod. The Pods domain is responsible for resolving the current ACTIVE
   * membership roster and verifying the caller belongs to it — Communication
   * does not depend on Pods, so it trusts the participant list it is given.
   */
  async startPodConversation(podId: string, participantIds: string[], caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    if (!participantIds.includes(caller.id) && !hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('You are not a member of this Pod');
    }

    const existing = await this.repo.findByPodId(podId);
    if (existing) return ConversationResponseDto.fromEntity(existing);

    const created = await this.repo.create({ type: ConversationType.POD, podId, participantIds });
    return ConversationResponseDto.fromEntity(created);
  }

  /** Organization-authorized communication between two representatives of the same organization. */
  async startOrganizationConversation(
    organizationId: string, counterpartUserId: string, caller: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    if (counterpartUserId === caller.id) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }
    const callerMembership = await this.orgMemberRepo.findByOrgAndUser(organizationId, caller.id);
    if (!callerMembership) throw new ForbiddenException('You must be a representative of this organization');
    const counterpartMembership = await this.orgMemberRepo.findByOrgAndUser(organizationId, counterpartUserId);
    if (!counterpartMembership) throw new NotFoundException('That user is not a representative of this organization');

    const existing = await this.repo.findOrganizationConversationBetween(organizationId, caller.id, counterpartUserId);
    if (existing) return ConversationResponseDto.fromEntity(existing);

    const created = await this.repo.create({
      type: ConversationType.ORGANIZATION,
      organizationId,
      participantIds: [caller.id, counterpartUserId],
    });
    return ConversationResponseDto.fromEntity(created);
  }

  async findAllForUser(page: number, limit: number, caller: AuthenticatedUser): Promise<PaginatedConversationsResponseDto> {
    const result = await this.repo.findForUser(caller.id, page, limit);
    return {
      data: result.data.map(ConversationResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    const conversation = await this.assertParticipant(id, caller);
    return ConversationResponseDto.fromEntity(conversation);
  }

  async sendMessage(conversationId: string, dto: SendMessageDto, caller: AuthenticatedUser): Promise<MessageResponseDto> {
    await this.assertParticipant(conversationId, caller);
    const created = await this.messageRepo.create({ conversationId, senderId: caller.id, body: sanitizePlainText(dto.body) });
    await this.repo.touchLastMessageAt(conversationId, created.createdAt);
    return MessageResponseDto.fromEntity(created);
  }

  async findMessages(
    conversationId: string, query: ListMessagesQueryDto, caller: AuthenticatedUser,
  ): Promise<PaginatedMessagesResponseDto> {
    await this.assertParticipant(conversationId, caller);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.messageRepo.findByConversation(conversationId, page, limit);
    return {
      data: result.data.map(MessageResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async markRead(conversationId: string, caller: AuthenticatedUser): Promise<{ success: true }> {
    await this.assertParticipant(conversationId, caller);
    await this.repo.markRead(conversationId, caller.id, new Date());
    return { success: true };
  }

  /** PD-008 — a member may remove their own message; a Platform/System Administrator may remove any message in any conversation. */
  async deleteMessage(conversationId: string, messageId: string, caller: AuthenticatedUser): Promise<MessageResponseDto> {
    await this.assertParticipant(conversationId, caller);
    const message = await this.getOwnedMessageOrThrow(conversationId, messageId);
    if (message.senderId !== caller.id && !hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('You may only delete your own messages');
    }
    const deleted = await this.messageRepo.softDelete(message.id, caller.id);
    return MessageResponseDto.fromEntity(deleted);
  }

  /**
   * PD-008 — trusted-caller variant for Pod-Steward moderation
   * (`PodMessagesService`). No participant/sender check is performed here:
   * the caller has already verified the acting user is this Pod's Steward
   * or an Administrator via `PodAuthorizationService` before reaching this
   * method. Communication does not depend on Pods (one-way dependency,
   * mirrored from `startPodConversation`'s own comment), so it has no
   * membership data of its own to re-derive that check — this mirrors the
   * "internal caller, already authorized upstream" precedent recorded in
   * PD-001 §4 rather than inventing a new pattern.
   */
  async moderatorDeleteMessage(conversationId: string, messageId: string, moderatorId: string): Promise<MessageResponseDto> {
    const message = await this.getOwnedMessageOrThrow(conversationId, messageId);
    const deleted = await this.messageRepo.softDelete(message.id, moderatorId);
    return MessageResponseDto.fromEntity(deleted);
  }

  /** PD-008 — any participant may report a message (never only the sender's counterpart — reporting one's own conversation, any role). */
  async reportMessage(
    conversationId: string, messageId: string, dto: ReportMessageDto, caller: AuthenticatedUser,
  ): Promise<MessageReportResponseDto> {
    await this.assertParticipant(conversationId, caller);
    await this.getOwnedMessageOrThrow(conversationId, messageId);
    const report = await this.reportRepo.create({
      messageId, conversationId, reporterId: caller.id, reason: sanitizePlainText(dto.reason),
    });
    return MessageReportResponseDto.fromEntity(report);
  }

  /** PD-008 — platform-wide OPEN moderation queue, every conversation type (Administrator only). */
  async listReportsForAdmin(caller: AuthenticatedUser): Promise<MessageReportResponseDto[]> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may view the platform-wide moderation queue');
    }
    const reports = await this.reportRepo.findOpen();
    return reports.map(MessageReportResponseDto.fromEntity);
  }

  /** PD-008 — trusted-caller variant for Pod-Steward moderation, mirroring `moderatorDeleteMessage`'s own precedent. */
  async findReportsForPod(podId: string): Promise<MessageReportResponseDto[]> {
    const reports = await this.reportRepo.findOpenByPodId(podId);
    return reports.map(MessageReportResponseDto.fromEntity);
  }

  /** PD-008 — resolves or dismisses a report (Administrator only in this increment; see PD-008 follow-up notes for Pod-Steward resolution). */
  async resolveReport(reportId: string, dto: ResolveReportDto, caller: AuthenticatedUser): Promise<MessageReportResponseDto> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform or System Administrator may resolve a moderation report');
    }
    const resolved = await this.reportRepo.resolve(reportId, caller.id, dto.status);
    if (!resolved) throw new NotFoundException(`Report '${reportId}' not found`);
    return MessageReportResponseDto.fromEntity(resolved);
  }

  private async getOwnedMessageOrThrow(conversationId: string, messageId: string): Promise<Message> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException(`Message '${messageId}' not found in this conversation`);
    }
    return message;
  }

  /** Loads the conversation and enforces participant-only access — the single cross-member/cross-organization isolation checkpoint. */
  private async assertParticipant(conversationId: string, caller: AuthenticatedUser): Promise<Conversation> {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) throw new NotFoundException(`Conversation '${conversationId}' not found`);
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return conversation;

    const isParticipant = await this.repo.isParticipant(conversationId, caller.id);
    if (!isParticipant) throw new ForbiddenException('You are not a participant in this conversation');
    return conversation;
  }
}
