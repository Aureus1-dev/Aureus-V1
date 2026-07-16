import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** AI_SERVICE_ACCOUNT-gated: prepares a proactive Home Pod invitation. Never assigns (Founder Decision #1). */
export class SuggestHomePodDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}
