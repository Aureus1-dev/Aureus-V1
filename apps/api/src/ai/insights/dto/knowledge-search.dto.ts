import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class KnowledgeSearchDto {
  @ApiProperty({ minLength: 3, maxLength: 300, example: 'How do I request a steward?' })
  @IsString() @MinLength(3) @MaxLength(300)
  query: string;
}
