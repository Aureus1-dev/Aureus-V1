import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import type { StewardActivityLog } from '@prisma/client';
import { StewardActivityLogService } from './steward-activity-log.service';
import { IStewardActivityLogRepository, STEWARD_ACTIVITY_LOG_REPOSITORY } from './repositories/steward-activity-log.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const CALLER: AuthenticatedUser = { id: 'user-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeLog = (o: Partial<StewardActivityLog> = {}): StewardActivityLog => ({
  id: 'log-001', userId: CALLER.id, eventType: 'DOCUMENT_UPLOADED', actor: 'MEMBER',
  description: 'Uploaded "Lease".', connectedAccountId: null, documentId: 'doc-001', occurredAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStewardActivityLogRepository> = { create: jest.fn(), findAll: jest.fn() };

describe('StewardActivityLogService — append-only audit trail', () => {
  let service: StewardActivityLogService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [StewardActivityLogService, { provide: STEWARD_ACTIVITY_LOG_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(StewardActivityLogService);
    jest.clearAllMocks();
  });

  it('record() writes through to the repository unchanged', async () => {
    mockRepo.create.mockResolvedValue(makeLog());
    await service.record({ userId: CALLER.id, eventType: 'DOCUMENT_UPLOADED', actor: 'MEMBER', description: 'Uploaded "Lease".', documentId: 'doc-001' });
    expect(mockRepo.create).toHaveBeenCalledWith({ userId: CALLER.id, eventType: 'DOCUMENT_UPLOADED', actor: 'MEMBER', description: 'Uploaded "Lease".', documentId: 'doc-001' });
  });

  it('findMine() paginates and scopes strictly to the caller', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [makeLog()], total: 1, page: 1, limit: 20 });

    const result = await service.findMine({ page: 1, limit: 20 }, CALLER);

    expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: CALLER.id }));
    expect(result.data).toHaveLength(1);
    expect(result.totalPages).toBe(1);
  });
});
