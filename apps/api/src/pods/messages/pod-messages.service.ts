import { Inject, Injectable } from '@nestjs/common';
import { PodMembershipStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ConversationsService } from '../../communication/messaging/conversations.service';
import { ConversationResponseDto } from '../../communication/messaging/dto/conversation-response.dto';
import { MessageResponseDto } from '../../communication/messaging/dto/message-response.dto';
import { MessageReportResponseDto } from '../../communication/messaging/dto/message-report-response.dto';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';

/** Get-or-create the Pod's single conversation thread, seated with every current ACTIVE member (§1.6). */
@Injectable()
export class PodMessagesService {
  constructor(
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IPodMembershipRepository,
    private readonly conversations: ConversationsService,
    private readonly auth: PodAuthorizationService,
  ) {}

  async startOrGetConversation(podId: string, caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    const roster = await this.membershipRepo.findAll({ page: 1, limit: 200, podId, status: PodMembershipStatus.ACTIVE });
    const participantIds = roster.data.map((m) => m.userId);
    return this.conversations.startPodConversation(podId, participantIds, caller);
  }

  /**
   * PD-008 — this Pod's Steward or an Administrator may remove any message
   * in this Pod's conversation. Authorization is checked here, in Pods
   * (which owns Pod membership data), then delegated to Communication's
   * `moderatorDeleteMessage` — a trusted-caller method that performs no
   * further authorization check of its own, since Communication does not
   * depend on Pods (one-way dependency; see `startPodConversation`'s own
   * comment and `moderatorDeleteMessage`'s doc comment).
   */
  async deleteAnyMessage(podId: string, messageId: string, caller: AuthenticatedUser): Promise<MessageResponseDto> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    const conversation = await this.startOrGetConversation(podId, caller);
    return this.conversations.moderatorDeleteMessage(conversation.id, messageId, caller.id);
  }

  /** PD-008 — this Pod's Steward or an Administrator may view this Pod's reported-content queue. */
  async listReports(podId: string, caller: AuthenticatedUser): Promise<MessageReportResponseDto[]> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    return this.conversations.findReportsForPod(podId);
  }
}
