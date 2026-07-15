import { ApiProperty } from '@nestjs/swagger';

class KnowledgeSearchSourceDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) articleRef: string | null;
  @ApiProperty() title: string;
}

export class KnowledgeSearchResponseDto {
  @ApiProperty({ description: 'The AI-synthesized answer, grounded in the matching verified articles' })
  content: string;

  @ApiProperty({ description: 'The AiRequest UUID this search was logged under (audit/cost tracking)' })
  requestId: string;

  @ApiProperty({ type: [KnowledgeSearchSourceDto], description: 'The verified articles the answer was grounded in' })
  sources: KnowledgeSearchSourceDto[];
}
