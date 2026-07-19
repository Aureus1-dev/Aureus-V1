import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { PaginatedDocumentsResponseDto } from './dto/paginated-documents-response.dto';

// Storage- and AI-cost-relevant operations — tighter than the global 100/min default (PD-001).
const DOCUMENT_UPLOAD_THROTTLE = { default: { limit: 20, ttl: 60_000 } };
const DOCUMENT_SUMMARIZE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('connected-experiences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @Throttle(DOCUMENT_UPLOAD_THROTTLE)
  @ApiOperation({ summary: 'Upload a document (self only)' })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  upload(
    @Body() dto: UploadDocumentDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    return this.service.upload(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List the caller's own documents (self only)" })
  @ApiResponse({ status: 200, type: PaginatedDocumentsResponseDto })
  findAll(
    @Query() query: ListDocumentsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedDocumentsResponseDto> {
    return this.service.findMine(query, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by UUID (owner only)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    return this.service.findById(id, caller);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document title, category, or text content (owner only)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Post(':id/summarize')
  @Throttle(DOCUMENT_SUMMARIZE_THROTTLE)
  @ApiOperation({ summary: "Generate an AI summary from the document's extracted text (owner only)" })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'Document has no extracted text to summarize' })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  summarize(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    return this.service.summarize(id, caller);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document (owner only)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  remove(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(id, caller);
  }
}
