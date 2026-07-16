import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class StartVoiceSessionDto {
  @ApiPropertyOptional({ description: 'An existing AiConversation to continue by voice. Omit to start a new one — voice and text share the same canonical conversation record.' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
