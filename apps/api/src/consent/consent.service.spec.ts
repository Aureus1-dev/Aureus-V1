import { Test } from '@nestjs/testing';
import { ConsentRecord } from '@prisma/client';
import { ConsentService } from './consent.service';
import { CONSENT_REPOSITORY, IConsentRepository } from './repositories/consent.repository.interface';
import { CURRENT_CONSENT_VERSION } from './consent.constants';
import { ConsentStatusResponseDto } from './dto/consent-status-response.dto';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeRecord = (r: Partial<ConsentRecord> = {}): ConsentRecord => ({
  id: 'c-001', userId: 'u-001', version: CURRENT_CONSENT_VERSION, grantedAt: NOW, ...r,
});

const mockRepo: jest.Mocked<IConsentRepository> = {
  grant: jest.fn(),
  findLatestByUser: jest.fn(),
};

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [ConsentService, { provide: CONSENT_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(ConsentService);
    jest.clearAllMocks();
  });

  it('grant records a new consent event and returns the resulting status', async () => {
    mockRepo.grant.mockResolvedValue(makeRecord());
    mockRepo.findLatestByUser.mockResolvedValue(makeRecord());

    const r = await service.grant('u-001', { version: CURRENT_CONSENT_VERSION });

    expect(mockRepo.grant).toHaveBeenCalledWith({ userId: 'u-001', version: CURRENT_CONSENT_VERSION });
    expect(r).toBeInstanceOf(ConsentStatusResponseDto);
    expect(r.granted).toBe(true);
    expect(r.isCurrentVersion).toBe(true);
  });

  it('getStatus reports not granted when no record exists', async () => {
    mockRepo.findLatestByUser.mockResolvedValue(null);
    const r = await service.getStatus('u-001');
    expect(r.granted).toBe(false);
    expect(r.isCurrentVersion).toBe(false);
    expect(r.version).toBeNull();
    expect(r.grantedAt).toBeNull();
  });

  it('getStatus reports granted but not current when the latest record is an older version', async () => {
    mockRepo.findLatestByUser.mockResolvedValue(makeRecord({ version: 'v0-old' }));
    const r = await service.getStatus('u-001');
    expect(r.granted).toBe(true);
    expect(r.isCurrentVersion).toBe(false);
    expect(r.version).toBe('v0-old');
  });

  it('getStatus reports granted and current when the latest record matches CURRENT_CONSENT_VERSION', async () => {
    mockRepo.findLatestByUser.mockResolvedValue(makeRecord());
    const r = await service.getStatus('u-001');
    expect(r.granted).toBe(true);
    expect(r.isCurrentVersion).toBe(true);
  });
});
