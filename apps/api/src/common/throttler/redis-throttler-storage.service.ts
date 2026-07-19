import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

// Not exported from '@nestjs/throttler's public entry point (only the
// `ThrottlerStorage` interface that references it is) — redeclared
// structurally here rather than reaching into the package's internal dist
// path, since TypeScript compares interfaces structurally either way.
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed ThrottlerStorage (PD-002). `@nestjs/throttler`'s default
 * storage is an in-memory Map — correct for a single instance, silently
 * wrong the moment there's more than one API replica (each replica counts
 * hits independently, so the *effective* platform-wide limit becomes
 * `limit * replicaCount`). This shares hit counts across every replica via
 * Redis so the configured limit is the real, platform-wide limit.
 *
 * The increment is done in a single Lua script (EVAL) so the read-check-
 * write sequence (are we already blocked? increment; did we just cross the
 * limit?) is atomic against concurrent requests hitting the same key from
 * different replicas — a non-atomic multi-round-trip version would let a
 * burst of concurrent requests all "just miss" the limit at once.
 */
@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorageService.name);
  private readonly redis: Redis;

  // KEYS[1] = hits key, KEYS[2] = block key
  // ARGV[1] = ttl ms, ARGV[2] = limit, ARGV[3] = blockDuration ms
  // Returns [totalHits, timeToExpireMs, isBlocked (0/1), timeToBlockExpireMs]
  private static readonly INCREMENT_SCRIPT = `
    local blockPttl = redis.call('PTTL', KEYS[2])
    if blockPttl > 0 then
      local hits = tonumber(redis.call('GET', KEYS[1])) or 0
      local hitsPttl = redis.call('PTTL', KEYS[1])
      return {hits, hitsPttl > 0 and hitsPttl or 0, 1, blockPttl}
    end

    local totalHits = redis.call('INCR', KEYS[1])
    if totalHits == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    local hitsPttl = redis.call('PTTL', KEYS[1])

    local isBlocked = 0
    local timeToBlockExpire = 0
    if totalHits > tonumber(ARGV[2]) then
      isBlocked = 1
      redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
      timeToBlockExpire = tonumber(ARGV[3])
    end

    return {totalHits, hitsPttl, isBlocked, timeToBlockExpire}
  `;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
    this.redis.on('error', (err) => this.logger.error(`Redis connection error: ${err.message}`));
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttler:{${key}}:${throttlerName}:hits`;
    const blockKey = `throttler:{${key}}:${throttlerName}:blocked`;

    const [totalHits, timeToExpireMs, isBlocked, timeToBlockExpireMs] = (await this.redis.eval(
      RedisThrottlerStorageService.INCREMENT_SCRIPT,
      2,
      hitsKey,
      blockKey,
      ttl,
      limit,
      blockDuration,
    )) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: Math.ceil(timeToExpireMs / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpireMs / 1000),
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
