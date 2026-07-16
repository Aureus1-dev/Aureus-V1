import { Inject, Injectable } from '@nestjs/common';
import { PodMembershipStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ConversationsService } from '../../communication/messaging/conversations.service';
import { ConversationResponseDto } from '../../communication/messaging/dto/conversation-response.dto';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';

/** Get-or-create the Pod's single conversation thread, seated with every current ACTIVE member (§1.6). */
@Injectable()
export class PodMessagesService {
  constructor(
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IPodMembershipRepository,
    private readonly conversations: ConversationsService,
  ) {}

  async startOrGetConversation(podId: string, caller: AuthenticatedUser): Promise<ConversationResponseDto> {
    const roster = await this.membershipRepo.findAll({ page: 1, limit: 200, podId, status: PodMembershipStatus.ACTIVE });
    const participantIds = roster.data.map((m) => m.userId);
    return this.conversations.startPodConversation(podId, participantIds, caller);
  }
}
