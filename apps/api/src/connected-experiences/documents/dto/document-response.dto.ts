import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';
import type { Document } from '@prisma/client';

export class DocumentResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true, description: 'Stable human-readable ID, e.g. AUR-DOC-000001' }) documentRef: string | null;
  @ApiProperty() userId: string;
  @ApiProperty() title: string;
  @ApiProperty() originalFilename: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty() storageRef: string;
  @ApiProperty({ enum: DocumentCategory }) category: DocumentCategory;
  @ApiPropertyOptional({ nullable: true }) extractedText: string | null;
  @ApiPropertyOptional({ nullable: true }) aiSummary: string | null;
  @ApiPropertyOptional({ nullable: true }) aiSummaryGeneratedAt: Date | null;
  @ApiProperty() uploadedAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(document: Document): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    Object.assign(dto, document);
    return dto;
  }
}
