import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  StewardshipEscalationSeverity, StewardshipEscalationStatus, StewardshipRelationshipOrigin,
  StewardshipRelationshipStatus, UserRole,
} from '@prisma/client';
import { StewardshipEscalationsService } from './stewardship-escalations.service';
import {
  STEWARDSHIP_ESCALATION_REPOSITORY,
  IStewardshipEscalationRepository,
} from './repositories/stewardship-escalation.repository.interface';
import {
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
  IStewardshipRelationshipRepository,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import type { StewardshipEscalation, StewardshipRelationship } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRelationship = (o: Partial<StewardshipRelationship> = {}): StewardshipRelationship => ({
  id: 'rel-001', memberId: MEMBER.id, stewardId: STEWARD.id,
  status: StewardshipRelationshipStatus.ACTIVE, origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
  requestedById: null, assignedById: ADMIN.id, assignedByOrganizationId: null, recommendedById: null,
  endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeEscalation = (o: Partial<StewardshipEscalation> = {}): StewardshipEscalation => ({
  id: 'esc-001', relationshipId: 'rel-001', title: 'Issue', description: 'Description here',
  severity: StewardshipEscalationSeverity.MEDIUM, status: StewardshipEscalationStatus.OPEN,
  raisedById: STEWARD.id, resolvedById: null, resolutionNotes: null, createdAt: NOW, resolvedAt: null, ...o,
});

const mockRepo: jest.Mocked<IStewardshipEscalationRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationship: jest.fn(), findByPod: jest.fn(),
  update: jest.fn(), countByStewardAndStatus: jest.fn(), countByStatus: jest.fn(),
};
const mockRelationshipRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};

describe('StewardshipEscalationsService', () => {
  let service: StewardshipEscalationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        StewardshipEscalationsService,
        { provide: STEWARDSHIP_ESCALATION_REPOSITORY, useValue: mockRepo },
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRelationshipRepo },
      ],
    }).compile();
    service = m.get(StewardshipEscalationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('allows the steward to raise an escalation', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.create.mockResolvedValue(makeEscalation());
      const result = await service.create('rel-001', { title: 'Issue', description: 'Description here' }, STEWARD);
      expect(result.status).toBe(StewardshipEscalationStatus.OPEN);
    });

    it('forbids the member from raising an escalation', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.create('rel-001', { title: 'x', description: 'y' }, MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByRelationship', () => {
    it('is not visible to the member', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.findByRelationship('rel-001', MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('is visible to the assigned steward', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.findByRelationship.mockResolvedValue([makeEscalation()]);
      const result = await service.findByRelationship('rel-001', STEWARD);
      expect(result).toHaveLength(1);
    });
  });

  describe('resolve', () => {
    it('resolves an OPEN escalation', async () => {
      mockRepo.findById.mockResolvedValue(makeEscalation());
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.update.mockResolvedValue(makeEscalation({ status: StewardshipEscalationStatus.RESOLVED }));

      const result = await service.resolve('esc-001', { resolutionNotes: 'Fixed' }, STEWARD);
      expect(result.status).toBe(StewardshipEscalationStatus.RESOLVED);
    });

    it('throws ConflictException when already resolved', async () => {
      mockRepo.findById.mockResolvedValue(makeEscalation({ status: StewardshipEscalationStatus.RESOLVED }));
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.resolve('esc-001', { resolutionNotes: 'x' }, STEWARD)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for a missing escalation', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.resolve('x', { resolutionNotes: 'x' }, STEWARD)).rejects.toThrow(NotFoundException);
    });
  });
});
