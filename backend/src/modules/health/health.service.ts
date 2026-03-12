import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { REDIS_CONFIG_KEY, RedisConfig } from '../../config/redis.config';

// What: Health check service that verifies DB and Redis connectivity.
// Why: Provides production-grade health endpoints for orchestrators.
@Injectable()
export class HealthService {
  private readonly redis: Redis;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    // Initialize Redis client for health checks.
    const redisConfig = this.configService.get<RedisConfig>(REDIS_CONFIG_KEY, {
      infer: true,
    });

    this.redis = new Redis({
      host: redisConfig?.host,
      port: redisConfig?.port,
      password: redisConfig?.password,
      db: redisConfig?.db,
      // Minimal settings for health check client.
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry on health checks.
    });
  }

  async getHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dbStatus = checks[0].status === 'fulfilled' && checks[0].value;
    const redisStatus = checks[1].status === 'fulfilled' && checks[1].value;

    // Determine overall health:
    // - healthy: both DB and Redis are up
    // - degraded: DB is up but Redis is down (can still serve requests)
    // - unhealthy: DB is down (cannot function)
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (dbStatus && redisStatus) {
      status = 'healthy';
    } else if (dbStatus && !redisStatus) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks: {
        database: dbStatus ? 'ok' : 'down',
        redis: redisStatus ? 'ok' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      // Ensure we're connected.
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    // Clean up Redis connection when the module is destroyed.
    await this.redis.quit();
  }
}

