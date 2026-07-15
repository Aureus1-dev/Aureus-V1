import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KnowledgeArticleStatus, KnowledgeCategory, VerificationStatus } from '@prisma/client';
import type { KnowledgeArticle } from '@prisma/client';

export class ArticleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-KB-000001' })
  articleRef: string | null;
  @ApiProperty() title: string;
  @ApiProperty() summary: string;
  @ApiProperty() content: string;
  @ApiProperty({ enum: KnowledgeCategory }) category: KnowledgeCategory;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiPropertyOptional({ nullable: true }) sourceUrl: string | null;
  @ApiProperty({ enum: KnowledgeArticleStatus }) status: KnowledgeArticleStatus;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus: VerificationStatus;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiProperty() version: number;
  @ApiPropertyOptional({ nullable: true }) datePublished: Date | null;
  @ApiPropertyOptional({ nullable: true }) dateLastVerified: Date | null;
  @ApiProperty() authorId: string;
  @ApiProperty() lastUpdatedById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(a: KnowledgeArticle): ArticleResponseDto {
    const dto = new ArticleResponseDto();
    Object.assign(dto, a);
    return dto;
  }
}
