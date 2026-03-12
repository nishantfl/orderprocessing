import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { REDIS_CONFIG_KEY, RedisConfig } from '../../config/redis.config';
import { Order } from '../orders/entities/order.entity';
import { OrderProcessingWorker } from './order-processing.worker';

// What: Jobs module that configures BullMQ for background processing.
// Why: Enables asynchronous order processing without blocking HTTP requests.
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>(REDIS_CONFIG_KEY, {
          infer: true,
        });

        return {
          connection: {
            host: redis?.host,
            port: redis?.port,
            password: redis?.password,
            db: redis?.db,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'order-processing',
    }),
    TypeOrmModule.forFeature([Order]),
  ],
  providers: [OrderProcessingWorker],
  exports: [BullModule],
})
export class JobsModule {}
