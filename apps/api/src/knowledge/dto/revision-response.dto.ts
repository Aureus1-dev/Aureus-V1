import { ApiProperty } from '@nestjs/swagger';
import { KnowledgeCategory } from '@prisma/client';
import type { KnowledgeArticleRevision } from '@prisma/client';

export class RevisionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() articleId: string;
  @ApiProperty() versionNumber: number;
  @ApiProperty() title: string;
  @ApiProperty() summary: string;
  @ApiProperty() content: string;
  @ApiProperty({ enum: KnowledgeCategory }) category: KnowledgeCategory;
  @ApiProperty() editedById: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: KnowledgeArticleRevision): RevisionResponseDto {
    const dto = new RevisionResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
