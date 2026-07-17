import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiCapability } from '@prisma/client';
import type { Document } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AiRequestsService } from '../../ai/requests/ai-requests.service';
import { PLATFORM_ASSISTANT_SYSTEM_PROMPT, buildDocumentSummaryPrompt } from '../../ai/prompts/system-prompts.util';
import { StewardActivityLogService } from '../activity/steward-activity-log.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { PaginatedDocumentsResponseDto } from './dto/paginated-documents-response.dto';
import { DOCUMENT_REPOSITORY, IDocumentRepository } from './repositories/document.repository.interface';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: IDocumentRepository,
    private readonly aiRequests: AiRequestsService,
    private readonly activityLog: StewardActivityLogService,
  ) {}

  async upload(dto: UploadDocumentDto, caller: AuthenticatedUser): Promise<DocumentResponseDto> {
    const document = await this.repo.create({ ...dto, userId: caller.id });

    const documentRef = `AUR-DOC-${document.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(document.id, documentRef);

    await this.activityLog.record({
      userId: caller.id,
      eventType: 'DOCUMENT_UPLOADED',
      actor: 'MEMBER',
      documentId: document.id,
      description: `Uploaded "${updated.title}".`,
    });

    this.logger.log(`Document uploaded: ${documentRef} by ${caller.id}`);
    return DocumentResponseDto.fromEntity(updated);
  }

  async findMine(query: ListDocumentsQueryDto, caller: AuthenticatedUser): Promise<PaginatedDocumentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({
      page, limit, userId: caller.id, category: query.category, q: query.q,
    });

    return {
      data: result.data.map(DocumentResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<DocumentResponseDto> {
    const document = await this.getOwnedOrThrow(id, caller);
    return DocumentResponseDto.fromEntity(document);
  }

  async update(id: string, dto: UpdateDocumentDto, caller: AuthenticatedUser): Promise<DocumentResponseDto> {
    await this.getOwnedOrThrow(id, caller);
    const updated = await this.repo.update(id, dto);
    return DocumentResponseDto.fromEntity(updated);
  }

  async summarize(id: string, caller: AuthenticatedUser): Promise<DocumentResponseDto> {
    const document = await this.getOwnedOrThrow(id, caller);
    if (!document.extractedText) {
      throw new BadRequestException(
        'This document has no text content yet. Add extractedText before requesting an AI summary — the Steward only summarizes text it can actually see, never a filename alone.',
      );
    }

    const prompt = buildDocumentSummaryPrompt({
      title: document.title,
      category: document.category,
      extractedText: document.extractedText,
    });

    const result = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.DOCUMENT_SUMMARY,
      messages: [
        { role: 'system', content: PLATFORM_ASSISTANT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });

    const updated = await this.repo.setSummary(id, result.content);

    await this.activityLog.record({
      userId: caller.id,
      eventType: 'DOCUMENT_SUMMARIZED',
      actor: 'AI_STEWARD',
      documentId: id,
      description: `Summarized "${document.title}" at the member's request.`,
    });

    return DocumentResponseDto.fromEntity(updated);
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const existing = await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);

    await this.activityLog.record({
      userId: caller.id,
      eventType: 'DOCUMENT_DELETED',
      actor: 'MEMBER',
      documentId: id,
      description: `Deleted "${existing.title}".`,
    });

    this.logger.log(`Document soft-deleted: ${existing.documentRef ?? id} by ${caller.id}`);
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<Document> {
    const document = await this.repo.findById(id);
    if (!document) throw new NotFoundException(`Document '${id}' not found`);
    if (document.userId !== caller.id) {
      throw new ForbiddenException('You may only access your own documents');
    }
    return document;
  }
}
