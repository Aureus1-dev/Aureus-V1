import { HarvestRetentionService } from './harvest-retention.service';
import { IHarvestRepository } from './repositories/harvest.repository.interface';

const repo = {
  deleteExpiredPlans: jest.fn(),
} as unknown as jest.Mocked<IHarvestRepository>;

describe('HarvestRetentionService', () => {
  let service: HarvestRetentionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HarvestRetentionService(repo);
  });

  it('deletes plans whose retention date has expired as of the supplied cutoff', async () => {
    const asOfDate = new Date('2034-01-01T04:00:00.000Z');
    repo.deleteExpiredPlans.mockResolvedValue(3);

    await expect(service.purgeExpiredPlans(asOfDate)).resolves.toBe(3);
    expect(repo.deleteExpiredPlans).toHaveBeenCalledTimes(1);
    expect(repo.deleteExpiredPlans).toHaveBeenCalledWith(asOfDate);
  });

  it('scheduled purge delegates to the same tested purge path', async () => {
    const purge = jest
      .spyOn(service, 'purgeExpiredPlans')
      .mockResolvedValue(0);

    await service.handleScheduledPurge();

    expect(purge).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledWith();
  });
});
