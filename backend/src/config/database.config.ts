import { registerAs } from '@nestjs/config';

// What: Centralized database configuration, typed and env-driven.
// Why: Keeps DB settings in one place and lets us switch behavior by environment (dev vs prod).
export const DATABASE_CONFIG_KEY = 'database';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  synchronize: boolean;
}

export default registerAs(
  DATABASE_CONFIG_KEY,
  (): DatabaseConfig => ({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'password',
    name: process.env.DB_NAME ?? 'orders_db',
    // Dev: auto-sync schema; Prod: must be false and rely on migrations.
    synchronize: process.env.NODE_ENV === 'development',
  }),
);

