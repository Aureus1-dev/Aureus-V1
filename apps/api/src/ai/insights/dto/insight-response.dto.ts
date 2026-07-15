import { ApiProperty } from '@nestjs/swagger';

export class InsightResponseDto {
  @ApiProperty({ description: 'The AI-generated explanation or guidance text' })
  content: string;

  @ApiProperty({ description: 'The AiRequest UUID this insight was logged under (audit/cost tracking)' })
  requestId: string;
}
