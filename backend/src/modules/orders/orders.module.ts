import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { Payment } from './entities/payment.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsService } from './payments.service';

// What: Orders module wiring entities, service, and controller.
// Why: Encapsulates order-related functionality behind a clear module boundary.
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment]),
    AuthModule, // Import auth for guards and JWT validation.
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PaymentsService],
  exports: [OrdersService, PaymentsService],
})
export class OrdersModule {}

