import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DocumentCategory } from '@prisma/client';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 200 })
  @IsOptional() @IsString() @MinLength(2)
  title?: string;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional() @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Plain text content of the document, supplied by the member/frontend.' })
  @IsOptional() @IsString()
  extractedText?: string;
}
