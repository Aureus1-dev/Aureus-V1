import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GuestLifecycleService } from './guest-lifecycle.service';
import { IUserRepository, USER_REPOSITORY } from '../users/repositories/user.repository.interface';

const mockUserRepo: jest.Mocked<Pick<IUserRepository, 'deleteInactiveGuests'>> = {
  deleteInactiveGuests: jest.fn(),
};

describe('GuestLifecycleService', () => {
  let service: GuestLifecycleService;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    config = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;
    const m = await Test.createTestingModule({
      providers: [
        GuestLifecycleService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = m.get(GuestLifecycleService);
    jest.clearAllMocks();
  });

  it('deletes guests inactive since before the configured retention window', async () => {
    config.get.mockReturnValue(7);
    mockUserRepo.deleteInactiveGuests.mockResolvedValue(3);

    const asOf = new Date('2026-08-01T03:00:00.000Z');
    const count = await service.purgeInactiveGuests(asOf);

    expect(config.get).toHaveBeenCalledWith('GUEST_SESSION_RETENTION_DAYS', 7);
    expect(mockUserRepo.deleteInactiveGuests).toHaveBeenCalledWith(new Date('2026-07-25T03:00:00.000Z'));
    expect(count).toBe(3);
  });

  it('uses a different configured retention window correctly', async () => {
    config.get.mockReturnValue(1);
    mockUserRepo.deleteInactiveGuests.mockResolvedValue(0);

    const asOf = new Date('2026-08-01T00:00:00.000Z');
    await service.purgeInactiveGuests(asOf);

    expect(mockUserRepo.deleteInactiveGuests).toHaveBeenCalledWith(new Date('2026-07-31T00:00:00.000Z'));
  });

  it('defaults asOfDate to now when not provided', async () => {
    config.get.mockReturnValue(7);
    mockUserRepo.deleteInactiveGuests.mockResolvedValue(0);

    const before = Date.now();
    await service.purgeInactiveGuests();
    const after = Date.now();

    const cutoff = mockUserRepo.deleteInactiveGuests.mock.calls[0][0].getTime();
    const sevenDaysMs = 7 * 86_400_000;
    expect(cutoff).toBeGreaterThanOrEqual(before - sevenDaysMs);
    expect(cutoff).toBeLessThanOrEqual(after - sevenDaysMs);
  });
});
