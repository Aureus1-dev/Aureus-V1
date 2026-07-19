const mockEval = jest.fn();
const mockQuit = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    eval: mockEval,
    quit: mockQuit,
    on: mockOn,
  }));
});

import { RedisThrottlerStorageService } from './redis-throttler-storage.service';

describe('RedisThrottlerStorageService (PD-002)', () => {
  let service: RedisThrottlerStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RedisThrottlerStorageService('redis://localhost:6379');
  });

  it('passes a namespaced hits/block key pair and the ttl/limit/blockDuration args to a single atomic EVAL', async () => {
    mockEval.mockResolvedValue([1, 60_000, 0, 0]);

    await service.increment('1.2.3.4', 60_000, 100, 60_000, 'default');

    expect(mockEval).toHaveBeenCalledTimes(1);
    const [script, numKeys, hitsKey, blockKey, ttl, limit, blockDuration] = mockEval.mock.calls[0];
    expect(typeof script).toBe('string');
    expect(numKeys).toBe(2);
    expect(hitsKey).toBe('throttler:{1.2.3.4}:default:hits');
    expect(blockKey).toBe('throttler:{1.2.3.4}:default:blocked');
    expect(ttl).toBe(60_000);
    expect(limit).toBe(100);
    expect(blockDuration).toBe(60_000);
  });

  it('maps a not-blocked EVAL result (ms) into a ThrottlerStorageRecord (seconds)', async () => {
    mockEval.mockResolvedValue([5, 45_000, 0, 0]);

    const record = await service.increment('1.2.3.4', 60_000, 100, 60_000, 'default');

    expect(record).toEqual({
      totalHits: 5,
      timeToExpire: 45,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('maps a blocked EVAL result into isBlocked: true with the block expiry in seconds', async () => {
    mockEval.mockResolvedValue([101, 30_000, 1, 55_000]);

    const record = await service.increment('1.2.3.4', 60_000, 100, 60_000, 'default');

    expect(record).toEqual({
      totalHits: 101,
      timeToExpire: 30,
      isBlocked: true,
      timeToBlockExpire: 55,
    });
  });

  it('closes the Redis connection on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });
});
