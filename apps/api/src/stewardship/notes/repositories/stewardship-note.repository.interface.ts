import { StewardshipNote, StewardshipNoteVisibility } from '@prisma/client';

export const STEWARDSHIP_NOTE_REPOSITORY = 'STEWARDSHIP_NOTE_REPOSITORY';

export interface CreateNoteInput {
  relationshipId: string;
  authorId: string;
  content: string;
  visibility?: StewardshipNoteVisibility;
}

export interface UpdateNoteInput {
  content?: string;
  visibility?: StewardshipNoteVisibility;
}

export interface IStewardshipNoteRepository {
  create(data: CreateNoteInput): Promise<StewardshipNote>;
  findById(id: string): Promise<StewardshipNote | null>;
  findByRelationship(relationshipId: string): Promise<StewardshipNote[]>;
  update(id: string, data: UpdateNoteInput): Promise<StewardshipNote>;
}
