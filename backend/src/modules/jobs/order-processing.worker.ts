import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { REDIS_CONFIG_KEY, RedisConfig } from '../../config/redis.config';
import { Order } from '../orders/entities/order.entity';

// What: Background worker that processes orders asynchronously.
// Why: Moves orders through lifecycle (PENDING→PROCESSING→SHIPPED→DELIVERED) without blocking API.
@Processor('order-processing', {
  concurrency: 1, // Process one job at a time to avoid race conditions.
})
@Injectable()
export class OrderProcessingWorker extends WorkerHost implements OnModuleInit {
  private readonly redis: Redis;
  private readonly LOCK_KEY = 'order-processing-job-lock';
  private readonly LOCK_TTL = 300; // 5 minutes (matches job interval)

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectQueue('order-processing')
    private readonly queue: Queue,
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    super();
    this.logger.setContext(OrderProcessingWorker.name);

    // Separate Redis client for distributed locking.
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

  async onModuleInit() {
    // Schedule repeatable job to run every 5 minutes.
    await this.queue.add(
      'process-pending-orders',
      {},
      {
        repeat: {
          pattern: '*/5 * * * *', // Every 5 minutes
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.info('Scheduled order processing job (every 5 minutes)');
  }

  async process(job: Job): Promise<void> {
    const startTime = Date.now();
    this.logger.info({ jobId: job.id }, 'Starting order processing job');

    // Acquire distributed lock to ensure only one worker runs this job.
    const lockAcquired = await this.acquireLock();

    if (!lockAcquired) {
      this.logger.info('Another worker is processing orders, skipping');
      return;
    }

    try {
      await this.processPendingOrders();
      await this.processProcessingToShipped();
      await this.processShippedToDelivered();
    } finally {
      await this.releaseLock();
      const duration = Date.now() - startTime;
      this.logger.info({ duration }, 'Order processing job completed');
    }
  }

  private async processPendingOrders(): Promise<void> {
    // No-op: PENDING -> PROCESSING transitions are now driven by payments.
    this.logger.debug('Skipping PENDING -> PROCESSING transition; handled by payments logic');
  }

  private async processProcessingToShipped(): Promise<void> {
    const now = new Date();
    const threshold = new Date(Date.now() - 5 * 60 * 1000);
    const result = await this.orderRepo
      .createQueryBuilder()
      .update(Order)
      .set({
        status: OrderStatus.SHIPPED,
        version: () => 'version + 1',
        updatedAt: now,
      })
      .where('status = :status', { status: OrderStatus.PROCESSING })
      .andWhere('updatedAt < :threshold', { threshold })
      .execute();

    const updatedCount = result.affected ?? 0;
    if (updatedCount > 0) {
      this.logger.info({ updatedCount }, 'Transitioned orders from PROCESSING to SHIPPED');
    }
  }

  private async processShippedToDelivered(): Promise<void> {
    const now = new Date();
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const result = await this.orderRepo
      .createQueryBuilder()
      .update(Order)
      .set({
        status: OrderStatus.DELIVERED,
        version: () => 'version + 1',
        updatedAt: now,
      })
      .where('status = :status', { status: OrderStatus.SHIPPED })
      .andWhere('updatedAt < :threshold', { threshold })
      .execute();

    const updatedCount = result.affected ?? 0;
    if (updatedCount > 0) {
      this.logger.info({ updatedCount }, 'Transitioned orders from SHIPPED to DELIVERED');
    }
  }

  private async acquireLock(): Promise<boolean> {
    try {
      // SET NX (only if not exists) with expiry.
      const result = await this.redis.set(
        this.LOCK_KEY,
        Date.now().toString(),
        'EX',
        this.LOCK_TTL,
        'NX',
      );
      return result === 'OK';
    } catch (error) {
      this.logger.error({ error }, 'Failed to acquire lock');
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await this.redis.del(this.LOCK_KEY);
    } catch (error) {
      this.logger.error({ error }, 'Failed to release lock');
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
