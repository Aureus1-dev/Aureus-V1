import { Inject, Injectable } from '@nestjs/common';
import { StatedNeedResponseDto } from './dto/stated-need-response.dto';
import { IStatedNeedRepository, STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';

/**
 * Gate C (C1: Understanding). Captures a member's stated need — the first
 * user message of a conversation, taken in exactly as the member wrote it,
 * with no menu navigation involved. This is the entry point the rest of the
 * Clearing (C2 clarification, C3 urgency, C4 resource discovery, ...) reads
 * from; it does not itself interpret or classify the content.
 */
@Injectable()
export class NeedsService {
  constructor(@Inject(STATED_NEED_REPOSITORY) private readonly repo: IStatedNeedRepository) {}

  async capture(userId: string, conversationId: string, content: string): Promise<StatedNeedResponseDto> {
    const created = await this.repo.create({ userId, conversationId, content });
    return StatedNeedResponseDto.fromEntity(created);
  }

  async findMine(userId: string): Promise<StatedNeedResponseDto[]> {
    const needs = await this.repo.findAllByUser(userId);
    return needs.map(StatedNeedResponseDto.fromEntity);
  }
}
