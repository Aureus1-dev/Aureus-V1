import { Injectable } from '@nestjs/common';
import { Document, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDocumentInput,
  DocumentQueryParams,
  IDocumentRepository,
  PaginatedDocuments,
  UpdateDocumentInput,
} from './document.repository.interface';

@Injectable()
export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDocumentInput): Promise<Document> {
    return this.prisma.db.document.create({ data });
  }

  async setRef(id: string, documentRef: string): Promise<Document> {
    return this.prisma.db.document.update({ where: { id }, data: { documentRef } });
  }

  async findById(id: string): Promise<Document | null> {
    return this.prisma.db.document.findFirst({ where: { id, deletedAt: null } });
  }

  async findAll(params: DocumentQueryParams): Promise<PaginatedDocuments> {
    const { page, limit, userId, category, q } = params;
    const skip = (page - 1) * limit;

    const searchClauses: Prisma.DocumentWhereInput[] = q
      ? [
          { title: { contains: q, mode: 'insensitive' } },
          { originalFilename: { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.DocumentWhereInput = {
      userId,
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(category && { category }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.document.findMany({ where, skip, take: limit, orderBy: { uploadedAt: 'desc' } }),
      this.prisma.db.document.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateDocumentInput): Promise<Document> {
    return this.prisma.db.document.update({ where: { id }, data });
  }

  async setSummary(id: string, aiSummary: string): Promise<Document> {
    return this.prisma.db.document.update({ where: { id }, data: { aiSummary, aiSummaryGeneratedAt: new Date() } });
  }

  async softDelete(id: string): Promise<Document> {
    return this.prisma.db.document.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
