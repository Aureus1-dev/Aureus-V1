import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StewardshipNoteVisibility, StewardshipRelationshipOrigin, StewardshipRelationshipStatus, UserRole } from '@prisma/client';
import { StewardshipNotesService } from './stewardship-notes.service';
import { STEWARDSHIP_NOTE_REPOSITORY, IStewardshipNoteRepository } from './repositories/stewardship-note.repository.interface';
import {
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
  IStewardshipRelationshipRepository,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import type { StewardshipNote, StewardshipRelationship } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER: AuthenticatedUser = { id: 'other-001', email: 'o@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRelationship = (o: Partial<StewardshipRelationship> = {}): StewardshipRelationship => ({
  id: 'rel-001', memberId: MEMBER.id, stewardId: STEWARD.id,
  status: StewardshipRelationshipStatus.ACTIVE, origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
  requestedById: null, assignedById: ADMIN.id, assignedByOrganizationId: null, recommendedById: null,
  endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeNote = (o: Partial<StewardshipNote> = {}): StewardshipNote => ({
  id: 'note-001', relationshipId: 'rel-001', authorId: STEWARD.id, content: 'test note',
  visibility: StewardshipNoteVisibility.PRIVATE, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStewardshipNoteRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationship: jest.fn(), update: jest.fn(),
};
const mockRelationshipRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};

describe('StewardshipNotesService', () => {
  let service: StewardshipNotesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        StewardshipNotesService,
        { provide: STEWARDSHIP_NOTE_REPOSITORY, useValue: mockRepo },
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRelationshipRepo },
      ],
    }).compile();
    service = m.get(StewardshipNotesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('allows the assigned steward to create a note', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.create.mockResolvedValue(makeNote());
      const result = await service.create('rel-001', { content: 'hi' }, STEWARD);
      expect(result.content).toBe('test note');
    });

    it('forbids a non-steward from creating a note', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.create('rel-001', { content: 'hi' }, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing relationship', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(null);
      await expect(service.create('x', { content: 'hi' }, STEWARD)).rejects.toThrow(NotFoundException);
    });

    it('strips markup from note content before persisting (PD-001)', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.create.mockResolvedValue(makeNote());
      await service.create('rel-001', { content: '<img src=x onerror=alert(1)>hi' }, STEWARD);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ content: 'hi' }));
    });
  });

  describe('findByRelationship', () => {
    it('returns all notes (including PRIVATE) to the steward', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.findByRelationship.mockResolvedValue([
        makeNote({ visibility: StewardshipNoteVisibility.PRIVATE }),
        makeNote({ id: 'note-002', visibility: StewardshipNoteVisibility.SHARED }),
      ]);
      const result = await service.findByRelationship('rel-001', STEWARD);
      expect(result).toHaveLength(2);
    });

    it('filters out PRIVATE notes for the member', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.findByRelationship.mockResolvedValue([
        makeNote({ visibility: StewardshipNoteVisibility.PRIVATE }),
        makeNote({ id: 'note-002', visibility: StewardshipNoteVisibility.SHARED }),
      ]);
      const result = await service.findByRelationship('rel-001', MEMBER);
      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe(StewardshipNoteVisibility.SHARED);
    });

    it('forbids an unrelated caller', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.findByRelationship('rel-001', OTHER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('allows the steward to update their note', async () => {
      mockRepo.findById.mockResolvedValue(makeNote());
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.update.mockResolvedValue(makeNote({ content: 'updated' }));
      const result = await service.update('note-001', { content: 'updated' }, STEWARD);
      expect(result.content).toBe('updated');
    });

    it('throws NotFoundException when the note does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {}, STEWARD)).rejects.toThrow(NotFoundException);
    });
  });
});
