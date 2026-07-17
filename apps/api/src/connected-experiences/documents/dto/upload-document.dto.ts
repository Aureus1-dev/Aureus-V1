import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { DocumentCategory } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({ minLength: 2, maxLength: 200 })
  @IsString() @MinLength(2)
  title: string;

  @ApiProperty()
  @IsString() @MinLength(1)
  originalFilename: string;

  @ApiProperty()
  @IsString() @MinLength(1)
  mimeType: string;

  @ApiProperty({ minimum: 1 })
  @IsInt() @Min(1)
  sizeBytes: number;

  @ApiProperty({ description: 'Opaque storage pointer (key/URL) — no cloud provider implemented yet' })
  @IsString() @MinLength(1)
  storageRef: string;

  @ApiPropertyOptional({ enum: DocumentCategory, default: DocumentCategory.OTHER })
  @IsOptional() @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({
    description: 'Plain text content of the document, supplied by the member/frontend. Required for AI summarization — the backend never reads storageRef bytes directly.',
  })
  @IsOptional() @IsString()
  extractedText?: string;
}
