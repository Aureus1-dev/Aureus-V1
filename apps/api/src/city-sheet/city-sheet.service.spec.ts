import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationStatus, LaunchAreaScope, UserRole,
} from '@prisma/client';
import type { CitySheetEntry } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CitySheetService } from './city-sheet.service';
import {
  CITY_SHEET_ENTRY_REPOSITORY, ICitySheetEntryRepository,
} from './repositories/city-sheet-entry.repository.interface';

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
  verificationStatus: CitySheetVerificationStatus.UNVERIFIED, lastVerifiedAt: null,
  verifiedById: null, verificationNotes: null, nextReviewDueAt: null,
  status: CitySheetEntryStatus.ACTIVE,
  createdById: STEWARD.id,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<ICitySheetEntryRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(),
};

describe('CitySheetService', () => {
  let service: CitySheetService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        CitySheetService,
        { provide: CITY_SHEET_ENTRY_REPOSITORY, useValue: mockRepo },
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

    it('defaults launchScope to CORE_LAUNCH_COUNTY when omitted (P1 boundary)', async () => {
      const raw = makeEntry({ citySheetRef: null });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue(raw);

      await service.create({
        organizationName: 'Chester County Crisis Line',
        category: CitySheetCategory.CRISIS_LINE,
        description: '24/7 crisis line for Chester County residents',
        serviceArea: 'Chester County only',
        hours: '24/7',
      }, STEWARD);

      const createArg = mockRepo.create.mock.calls[0][0];
      expect(createArg.launchScope).toBeUndefined(); // left to Prisma's schema default
    });

    it('accepts an explicit GREATER_PHILADELPHIA_SUPPLEMENTAL scope', async () => {
      const raw = makeEntry({ launchScope: LaunchAreaScope.GREATER_PHILADELPHIA_SUPPLEMENTAL });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue(raw);

      const result = await service.create({
        organizationName: 'Regional Legal Aid',
        category: CitySheetCategory.LEGAL_AID,
        description: 'Legal aid serving the wider Philadelphia region, including Chester/Delaware County',
        serviceArea: 'Greater Philadelphia',
        hours: 'Mon-Fri 9-5',
        launchScope: LaunchAreaScope.GREATER_PHILADELPHIA_SUPPLEMENTAL,
      }, STEWARD);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ launchScope: LaunchAreaScope.GREATER_PHILADELPHIA_SUPPLEMENTAL }),
      );
      expect(result.launchScope).toBe(LaunchAreaScope.GREATER_PHILADELPHIA_SUPPLEMENTAL);
    });
  });

  describe('findAll', () => {
    it('passes launchScope and verificationStatus filters through to the repository', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.findAll({
        page: 1, limit: 20,
        launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
        verificationStatus: CitySheetVerificationStatus.VERIFIED,
      });

      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({
        launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
        verificationStatus: CitySheetVerificationStatus.VERIFIED,
      }));
    });

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

    it('throws NotFoundException when missing by ref', async () => {
      mockRepo.findByRef.mockResolvedValue(null);
      await expect(service.findByRef('AUR-CS-999999')).rejects.toThrow(NotFoundException);
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

    it('allows reactivating an archived entry by setting status back to ACTIVE', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ status: CitySheetEntryStatus.INACTIVE }));
      mockRepo.update.mockResolvedValue(makeEntry({ status: CitySheetEntryStatus.ACTIVE }));

      const result = await service.update('cs-uuid', { status: CitySheetEntryStatus.ACTIVE }, STEWARD);
      expect(result.status).toBe(CitySheetEntryStatus.ACTIVE);
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

  describe('verification lifecycle', () => {
    it('verify moves UNVERIFIED → VERIFIED and records verifier + timestamp', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED }));
      mockRepo.update.mockResolvedValue(makeEntry({
        verificationStatus: CitySheetVerificationStatus.VERIFIED,
        lastVerifiedAt: NOW, verifiedById: STEWARD.id,
      }));

      const result = await service.verify('cs-uuid', { verificationNotes: 'Called and confirmed' }, STEWARD);

      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.VERIFIED);
      expect(mockRepo.update).toHaveBeenCalledWith('cs-uuid', expect.objectContaining({
        verificationStatus: CitySheetVerificationStatus.VERIFIED,
        verifiedById: STEWARD.id,
        verificationNotes: 'Called and confirmed',
      }));
    });

    it('verify moves NEEDS_REVIEW → VERIFIED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW }));
      mockRepo.update.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));

      const result = await service.verify('cs-uuid', {}, STEWARD);
      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.VERIFIED);
    });

    it('verify throws ConflictException when already VERIFIED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
      await expect(service.verify('cs-uuid', {}, STEWARD)).rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('verify throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.verify('missing', {}, STEWARD)).rejects.toThrow(NotFoundException);
    });

    it('flagForReview moves VERIFIED → NEEDS_REVIEW with a reason', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeEntry({
        verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW,
        verificationNotes: 'Phone disconnected',
      }));

      const result = await service.flagForReview('cs-uuid', { reason: 'Phone disconnected' }, STEWARD);
      expect(result.verificationStatus).toBe(CitySheetVerificationStatus.NEEDS_REVIEW);
      expect(result.verificationNotes).toBe('Phone disconnected');
    });

    it('flagForReview throws ConflictException when not currently VERIFIED', async () => {
      mockRepo.findById.mockResolvedValue(makeEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED }));
      await expect(service.flagForReview('cs-uuid', { reason: 'x' }, STEWARD)).rejects.toThrow(ConflictException);
    });

    it('flagForReview throws NotFoundException for a missing entry', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.flagForReview('missing', { reason: 'x' }, STEWARD)).rejects.toThrow(NotFoundException);
    });
  });
});
