import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export type MembershipResponseDecision = 'ACCEPT' | 'DECLINE' | 'DEFER';

/**
 * A member's response to a proactive Home Pod invitation (a PENDING,
 * AI_MATCH_SUGGESTION-origin membership — Founder Decision #1). Never
 * automatic assignment: the member always decides.
 */
export class RespondToMembershipDto {
  @ApiProperty({ enum: ['ACCEPT', 'DECLINE', 'DEFER'] })
  @IsIn(['ACCEPT', 'DECLINE', 'DEFER'])
  decision: MembershipResponseDecision;
}
