import { Injectable } from '@nestjs/common';
import { StewardshipNote } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNoteInput, IStewardshipNoteRepository, UpdateNoteInput } from './stewardship-note.repository.interface';

@Injectable()
export class PrismaStewardshipNoteRepository implements IStewardshipNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNoteInput): Promise<StewardshipNote> {
    return this.prisma.db.stewardshipNote.create({ data });
  }

  async findById(id: string): Promise<StewardshipNote | null> {
    return this.prisma.db.stewardshipNote.findUnique({ where: { id } });
  }

  async findByRelationship(relationshipId: string): Promise<StewardshipNote[]> {
    return this.prisma.db.stewardshipNote.findMany({
      where: { relationshipId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateNoteInput): Promise<StewardshipNote> {
    return this.prisma.db.stewardshipNote.update({ where: { id }, data });
  }
}
