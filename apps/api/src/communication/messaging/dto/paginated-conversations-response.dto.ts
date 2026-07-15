import { ApiProperty } from '@nestjs/swagger';
import { ConversationResponseDto } from './conversation-response.dto';

export class PaginatedConversationsResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] }) data: ConversationResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
