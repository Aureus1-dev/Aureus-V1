import { MessageReport, MessageReportStatus } from '@prisma/client';

export const MESSAGE_REPORT_REPOSITORY = 'MESSAGE_REPORT_REPOSITORY';

export interface CreateMessageReportInput {
  messageId: string;
  conversationId: string;
  reporterId: string;
  reason: string;
}

export interface IMessageReportRepository {
  create(data: CreateMessageReportInput): Promise<MessageReport>;
  /** Platform-wide OPEN queue (Administrator view — every conversation type). */
  findOpen(): Promise<MessageReport[]>;
  /** OPEN queue scoped to a single Pod's conversation (Pods-domain Steward view — see `ConversationsService.findReportsForPod`). */
  findOpenByPodId(podId: string): Promise<MessageReport[]>;
  resolve(id: string, resolvedById: string, status: MessageReportStatus): Promise<MessageReport | null>;
}
