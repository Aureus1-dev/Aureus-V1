import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsIn, IsString, MaxLength } from 'class-validator';
import { CreateBusinessKnowledgeDto } from './create-business-knowledge.dto';

export class ImportBusinessKnowledgeDto extends CreateBusinessKnowledgeDto {
  @ApiProperty({ example: 'services.md', maxLength: 200 })
  @IsString() @MaxLength(200)
  fileName: string;

  @ApiProperty({ enum: ['text/plain', 'text/markdown'] })
  @IsIn(['text/plain', 'text/markdown'])
  mimeType: 'text/plain' | 'text/markdown';

  @ApiProperty({
    example: true,
    description: 'Required acknowledgement that an upload is unverified source material, not truth or legal advice',
  })
  @Equals(true)
  acknowledgeUnverifiedSource: true;
}
