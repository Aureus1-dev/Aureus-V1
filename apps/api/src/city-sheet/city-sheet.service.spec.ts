import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationConfidence,
  CitySheetVerificationEventType, CitySheetVerificationStatus, LaunchAreaScope, UserRole,
} from '@prisma/client';
import type { CitySheetEntry, CitySheetVerificationEvent } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CitySheetService } from './city-sheet.service';
import {
  CITY_SHEET_ENTRY_REPOSITORY, ICitySheetEntryRepository,
} from './repositories/city-sheet-entry.repository.interface';
import { ChecklistItemsService } from './checklist/checklist-items.service';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };

const makeEntry = (o: Partial<CitySheetEntry> = {}): CitySheetEntry => ({
  id: 'cs-uuid', sequenceNumber: 1, citySheetRef: 'AUR-CS-000001',
  organizationName: 'Chester County Crisis Line', category: CitySheetCategory.CRISIS_LINE,
  description: '24/7 crisis line for Chester County residents',
  address: null, serviceArea: 'Chester County only', launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
  phone: '+1-610-555-0100', website: null, hours: '24/7',
  eligibilityRequirements: null, languagesSupported: ['English'], accessibilityNotes: null,
  cost: null, requiredDocuments: [],
  referralRequired: false, isEmergencyService: true,
  verificationStatus: CitySheetVerificationStatus.UNVERIFIED,
  verificationConfidence: null,
  lastVerifiedAt: null,
  verifiedById: null, verificationNotes: null, rejectionReason: null, nextReviewDueAt: null,
  sourceNotes: 'Candidate compiled via web research.',
  status: CitySheetEntryStatus.ACTIVE,
  createdById: STEWARD.id,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const makeEvent = (o: Partial<CitySheetVerificationEvent> = {}): CitySheetVerificationEvent => ({
  id: 'event-uuid', citySheetEntryId: 'cs-uuid',
  eventType: CitySheetVerificationEventType.VERIFIED,
  previousStatus: CitySheetVerificationStatus.UNVERIFIED,
  newStatus: CitySheetVerificationStatus.VERIFIED,
  confidence: CitySheetVerificationConfidence.HIGH,
  notes: 'Called and confirmed.',
  checklistResponses: null,
  performedById: STEWARD.id,
  performedAt: NOW,
  ...o,
});

const mockRepo: jest.Mocked<ICitySheetEntryRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(),
  appendVerificationEvent: jest.fn(), listVerificationEvents: jest.fn(),
};

const mockChecklistItems: jest.Mocked<Pick<ChecklistItemsService, 'findApplicableForCategory'>> = {
  findApplicableForCategory: jest.fn(),
};

describe('CitySheetService', () => {
  let service: CitySheetService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        CitySheetService,
        { provide: CITY_SHEET_ENTRY_REPOSITORY, useValue: mockRepo },
        { provide: ChecklistItemsService, useValue: mockChecklistItems },
      ],
    }).compile();
    service = m.get(CitySheetService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates an entry and sets a stable ref', async () => {
      const raw = makeEntry({ citySheetRef: null, sequenceNumber: 1 });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, citySheetRef: 'AUR-CS-000001' });

      const result = await service.create({
        organizationName: 'Chester County Crisis Line',
        category: CitySheetCategory.CRISIS_LINE,
        description: '24/7 crisis line for Chester County residents',
        serviceArea: 'Chester County only',
        hours: '24/7',
      }, STEWARD);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: STEWARD.id }),
      );
      expect(result.citySheetRef).toBe('AUR-CS-000001');
    });
  });

  describe('findAll', () => {
    it('computes totalPages correctly', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeEntry()], total: 21, page: 1, limit: 20 });
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.totalPages).toBe(2);
    });
  });

  describe('findById / findByRef', () => {
    it('throws NotFoundException when missing by id', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates an entry', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry());
      mockRepo.update.mockResolvedValue(makeEntry({ hours: 'Mon-Fri 8-6' }));

      const result = await service.update('cs-uuid', { hours: 'Mon-Fri 8-6' }, STEWARD);
      expect(result.hours).toBe('Mon-Fri 8-6');
    });

    it('throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', {}, STEWARD)).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('sets status to INACTIVE regardless of verification status', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeEntry({ status: CitySheetEntryStatus.INACTIVE }));

      const result = await service.archive('cs-uuid', STEWARD);
      expect(result.status).toBe(CitySheetEntryStatus.INACTIVE);
      expect(mockRepo.update).toHaveBeenCalledWith('cs-uuid', { status: CitySheetEntryStatus.INACTIVE });
    });

    it('throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.archive('missing', STEWARD)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVerificationGuide', () => {
    it('returns entry summary, applicable checklist, and a call script', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry());
      mockChecklistItems.findApplicableForCategory.mockResolvedValue([
        { id: 'item-1', label: 'Phone number reached', category: null, sortOrder: 10, isActive: true, createdAt: NOW, updatedAt: NOW },
      ] as never);

      const guide = await service.getVerificationGuide('cs-uuid');

      expect(mockChecklistItems.findApplicableForCategory).toHaveBeenCalledWith(CitySheetCategory.CRISIS_LINE);
      expect(guide.checklist).toEqual([{ id: 'item-1', label: 'Phone number reached' }]);
      expect(guide.callScript).toContain('Chester County Crisis Line');
      expect(guide.callScript).toContain('Phone number reached');
    });

    it('throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getVerificationGuide('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listVerificationEvents', () => {
    it('returns the full history for an entry', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry());
      mockRepo.listVerificationEvents.mockResolvedValue([makeEvent()]);

      const events = await service.listVerificationEvents('cs-uuid');
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(CitySheetVerificationEventType.VERIFIED);
    });

    it('throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.listVerificationEvents('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify', () => {
    it('moves UNVERIFIED → VERIFIED, records confidence, and appends a permanent event', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED }));
      mockRepo.update.mockResolvedValue(makeEntry({
        verificationStatus: CitySheetVerificationStatus.VERIFIED,
        verificationConfidence: CitySheetVerificationConfidence.HIGH,
      }));

      const result = await service.verify('cs-uuid', {
        confidence: CitySheetVerificationConfidence.HIGH,
        verificationNotes: 'Called and confirmed',
      }, STEWARD);

      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.VERIFIED);
      expect(mockRepo.update).toHaveBeenCalledWith('cs-uuid', expect.objectContaining({
        verificationStatus: CitySheetVerificationStatus.VERIFIED,
        verificationConfidence: CitySheetVerificationConfidence.HIGH,
        verifiedById: STEWARD.id,
        verificationNotes: 'Called and confirmed',
        rejectionReason: null,
      }));
      expect(mockRepo.appendVerificationEvent).toHaveBeenCalledWith(expect.objectContaining({
        citySheetEntryId: 'cs-uuid',
        eventType: CitySheetVerificationEventType.VERIFIED,
        previousStatus: CitySheetVerificationStatus.UNVERIFIED,
        newStatus: CitySheetVerificationStatus.VERIFIED,
        confidence: CitySheetVerificationConfidence.HIGH,
        performedById: STEWARD.id,
      }));
    });

    it('never touches sourceNotes', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ sourceNotes: 'Original citation' }));
      mockRepo.update.mockResolvedValue(makeEntry());

      await service.verify('cs-uuid', { confidence: CitySheetVerificationConfidence.HIGH }, STEWARD);

      const updateArg = mockRepo.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('sourceNotes');
    });

    it('moves NEEDS_REVIEW → VERIFIED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW }));
      mockRepo.update.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));

      const result = await service.verify('cs-uuid', { confidence: CitySheetVerificationConfidence.MEDIUM }, STEWARD);
      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.VERIFIED);
    });

    it('moves REJECTED → VERIFIED (reopening a wrongly-rejected candidate)', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.REJECTED }));
      mockRepo.update.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));

      const result = await service.verify('cs-uuid', { confidence: CitySheetVerificationConfidence.HIGH }, STEWARD);
      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.VERIFIED);
    });

    it('throws ConflictException when already VERIFIED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
      await expect(
        service.verify('cs-uuid', { confidence: CitySheetVerificationConfidence.HIGH }, STEWARD),
      ).rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockRepo.appendVerificationEvent).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(
        service.verify('missing', { confidence: CitySheetVerificationConfidence.HIGH }, STEWARD),
      ).rejects.toThrow(NotFoundException);
    });

    it('persists checklistResponses on the verification event', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry());
      mockRepo.update.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));

      await service.verify('cs-uuid', {
        confidence: CitySheetVerificationConfidence.HIGH,
        checklistResponses: [{ itemId: 'item-1', label: 'Phone reached', confirmed: true }],
      }, STEWARD);

      expect(mockRepo.appendVerificationEvent).toHaveBeenCalledWith(expect.objectContaining({
        checklistResponses: [{ itemId: 'item-1', label: 'Phone reached', confirmed: true, note: undefined }],
      }));
    });
  });

  describe('flagForReview', () => {
    it('moves VERIFIED → NEEDS_REVIEW and appends an event', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW }));

      const result = await service.flagForReview('cs-uuid', { reason: 'Phone disconnected' }, STEWARD);

      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.NEEDS_REVIEW);
      expect(mockRepo.appendVerificationEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventType: CitySheetVerificationEventType.FLAGGED_FOR_REVIEW,
        previousStatus: CitySheetVerificationStatus.VERIFIED,
        newStatus: CitySheetVerificationStatus.NEEDS_REVIEW,
      }));
    });

    it('confidence is optional', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW }));

      await expect(service.flagForReview('cs-uuid', { reason: 'x' }, STEWARD)).resolves.toBeDefined();
    });

    it('throws ConflictException when not currently VERIFIED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED }));
      await expect(service.flagForReview('cs-uuid', { reason: 'x' }, STEWARD)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.flagForReview('missing', { reason: 'x' }, STEWARD)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('moves UNVERIFIED → REJECTED, sets status INACTIVE, and appends an event', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED }));
      mockRepo.update.mockResolvedValue(makeEntry({
        verificationStatus: CitySheetVerificationStatus.REJECTED, status: CitySheetEntryStatus.INACTIVE,
      }));

      const result = await service.reject('cs-uuid', {
        reason: 'Phone disconnected, no successor found',
        confidence: CitySheetVerificationConfidence.HIGH,
      }, STEWARD);

      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.REJECTED);
      expect(result.status).toBe(CitySheetEntryStatus.INACTIVE);
      expect(mockRepo.update).toHaveBeenCalledWith('cs-uuid', expect.objectContaining({
        verificationStatus: CitySheetVerificationStatus.REJECTED,
        status: CitySheetEntryStatus.INACTIVE,
        rejectionReason: 'Phone disconnected, no successor found',
        verifiedById: STEWARD.id,
      }));
      expect(mockRepo.appendVerificationEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventType: CitySheetVerificationEventType.REJECTED,
      }));
    });

    it('moves NEEDS_REVIEW → REJECTED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW }));
      mockRepo.update.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.REJECTED }));

      const result = await service.reject('cs-uuid', {
        reason: 'Defunct', confidence: CitySheetVerificationConfidence.MEDIUM,
      }, STEWARD);
      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.REJECTED);
    });

    it('throws ConflictException when already VERIFIED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
      await expect(
        service.reject('cs-uuid', { reason: 'x', confidence: CitySheetVerificationConfidence.LOW }, STEWARD),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(
        service.reject('missing', { reason: 'x', confidence: CitySheetVerificationConfidence.LOW }, STEWARD),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
