import { registerAs } from '@nestjs/config';

// What: Centralized Redis configuration for queues and rate limiting.
// Why: Single source of truth for Redis connection settings across the app.
export const REDIS_CONFIG_KEY = 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export default registerAs(
  REDIS_CONFIG_KEY,
  (): RedisConfig => ({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB ?? '0'),
  }),
);
