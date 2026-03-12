import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { REDIS_CONFIG_KEY, RedisConfig } from '../../config/redis.config';

// What: Redis-backed storage for distributed rate limiting.
// Why: Ensures rate limits work across multiple app instances.
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly redis: Redis;
  private readonly keyPrefix = 'throttle:';

  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get<RedisConfig>(REDIS_CONFIG_KEY, {
      infer: true,
    });

    this.redis = new Redis({
      host: redisConfig?.host,
      port: redisConfig?.port,
      password: redisConfig?.password,
      db: redisConfig?.db,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const fullKey = this.keyPrefix + key;

    // Increment counter and set TTL if it's a new key.
    const multi = this.redis.multi();
    multi.incr(fullKey);
    multi.pexpire(fullKey, ttl);
    multi.pttl(fullKey);

    const results = await multi.exec();

    // results is an array of [error, result] tuples.
    const totalHits = (results?.[0]?.[1] as number) ?? 1;
    const timeToExpire = (results?.[2]?.[1] as number) ?? ttl;

    return {
      totalHits,
      timeToExpire: Math.max(0, timeToExpire),
      isBlocked: totalHits > limit,
      timeToBlockExpire: totalHits > limit ? timeToExpire : 0,
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
