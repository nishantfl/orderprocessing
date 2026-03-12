import 'reflect-metadata';
import { DataSource } from 'typeorm';

// What: Standalone DataSource for CLI/migrations.
// Why: Lets us run TypeORM migrations without bootstrapping the NestJS app.
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'password',
  database: process.env.DB_NAME ?? 'orders_db',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false, // Migrations should control schema changes.
});

