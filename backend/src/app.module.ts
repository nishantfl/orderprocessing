import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RedisThrottlerStorage } from './common/storage/redis-throttler.storage';
import databaseConfig, { DATABASE_CONFIG_KEY, DatabaseConfig } from './config/database.config';
import redisConfig from './config/redis.config';
import { HealthModule } from './modules/health/health.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    // ... config and other modules ...
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('LOG_LEVEL', 'info'),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const db = configService.get<DatabaseConfig>(DATABASE_CONFIG_KEY, {
          infer: true,
        });

        return {
          type: 'postgres' as const,
          host: db?.host,
          port: db?.port,
          username: db?.username,
          password: db?.password,
          database: db?.name,
          autoLoadEntities: true,
          synchronize: db?.synchronize,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get('THROTTLE_TTL', '60000')), // 1 minute
            limit: Number(configService.get('THROTTLE_LIMIT', '100')), // 100 requests
          },
        ],
        storage: new RedisThrottlerStorage(configService),
      }),
    }),
    HealthModule,
    AuthModule,
    JobsModule, // Must load before OrdersModule (provides Bull queue)
    OrdersModule,
    ProductsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
