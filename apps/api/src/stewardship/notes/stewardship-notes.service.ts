import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { StewardshipNoteVisibility } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteResponseDto } from './dto/note-response.dto';
import { IStewardshipNoteRepository, STEWARDSHIP_NOTE_REPOSITORY } from './repositories/stewardship-note.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../relationships/repositories/stewardship-relationship.repository.interface';

@Injectable()
export class StewardshipNotesService {
  constructor(
    @Inject(STEWARDSHIP_NOTE_REPOSITORY) private readonly repo: IStewardshipNoteRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly relationshipRepo: IStewardshipRelationshipRepository,
  ) {}

  async create(relationshipId: string, dto: CreateNoteDto, caller: AuthenticatedUser): Promise<NoteResponseDto> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    const note = await this.repo.create({
      relationshipId,
      authorId: caller.id,
      content: dto.content,
      visibility: dto.visibility,
    });
    return NoteResponseDto.fromEntity(note);
  }

  async findByRelationship(relationshipId: string, caller: AuthenticatedUser): Promise<NoteResponseDto[]> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    const isAdmin = hasRole(caller, PLATFORM_ADMIN_ROLES);
    const isSteward = relationship.stewardId === caller.id;
    const isMember = relationship.memberId === caller.id;

    if (!isAdmin && !isSteward && !isMember) {
      throw new ForbiddenException('You do not have permission to view these notes');
    }

    const notes = await this.repo.findByRelationship(relationshipId);
    // Least privilege: a member (who is neither steward nor admin) only ever sees SHARED notes.
    const visible = isAdmin || isSteward
      ? notes
      : notes.filter((n) => n.visibility === StewardshipNoteVisibility.SHARED);

    return visible.map(NoteResponseDto.fromEntity);
  }

  async update(id: string, dto: UpdateNoteDto, caller: AuthenticatedUser): Promise<NoteResponseDto> {
    const note = await this.repo.findById(id);
    if (!note) throw new NotFoundException(`Note '${id}' not found`);

    const relationship = await this.getRelationshipOrThrow(note.relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    const updated = await this.repo.update(id, dto);
    return NoteResponseDto.fromEntity(updated);
  }

  private async getRelationshipOrThrow(relationshipId: string) {
    const relationship = await this.relationshipRepo.findById(relationshipId);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${relationshipId}' not found`);
    return relationship;
  }

  private assertIsStewardOrAdmin(stewardId: string | null, caller: AuthenticatedUser): void {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (stewardId === caller.id) return;
    throw new ForbiddenException('Only the assigned steward may manage notes on this relationship');
  }
}
