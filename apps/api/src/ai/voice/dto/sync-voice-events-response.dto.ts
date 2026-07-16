import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseDto } from '../../conversations/dto/message-response.dto';

export class TurnEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() voiceSessionId: string;
  @ApiProperty() type: string;
  @ApiProperty({ nullable: true }) providerItemId: string | null;
  @ApiProperty() occurredAt: Date;
}

export class SyncVoiceEventsResponseDto {
  @ApiProperty({ type: [MessageResponseDto] }) messages: MessageResponseDto[];
  @ApiProperty({ type: [TurnEventResponseDto] }) turnEvents: TurnEventResponseDto[];
}
