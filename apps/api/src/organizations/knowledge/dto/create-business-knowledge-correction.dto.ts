import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CreateBusinessKnowledgeDto } from './create-business-knowledge.dto';

export class CreateBusinessKnowledgeCorrectionDto extends CreateBusinessKnowledgeDto {
  @ApiProperty({ description: 'Why the currently approved tenant knowledge needs a reviewed replacement' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  correctionReason!: string;
}
