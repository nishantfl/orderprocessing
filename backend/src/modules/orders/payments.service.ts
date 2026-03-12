import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { Order } from './entities/order.entity';
import { Payment } from './entities/payment.entity';

// What: Service for payment-related business logic.
// Why: Encapsulates transactional payment creation and order updates.
@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
  ) {}

  private toCents(value: string | number): number {
    return Math.round(Number(value) * 100);
  }

  async createPayment(
    orderId: string,
    tenantId: string,
    amount: number,
  ): Promise<{ order: Order; payment: Payment }> {
    if (amount <= 0) {
      throw new ConflictException({
        message: 'Payment amount must be greater than zero',
        errorCode: 'INVALID_PAYMENT_AMOUNT',
      });
    }

    const amountCents = this.toCents(amount);

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException({
          message: 'Order not found',
          errorCode: 'ORDER_NOT_FOUND',
        });
      }

      // Prevent payments on non-payable orders.
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException({
          message: `Cannot pay for order with status ${order.status}. Only PENDING orders can be paid.`,
          errorCode: 'ORDER_NOT_PAYABLE',
        });
      }

      const totalAmountCents = this.toCents(order.totalAmount);
      const totalPaidCents = this.toCents(order.totalPaid);
      const remainingCents = totalAmountCents - totalPaidCents;

      if (remainingCents <= 0) {
        throw new ConflictException({
          message: 'Order is already fully paid',
          errorCode: 'ORDER_ALREADY_FULLY_PAID',
        });
      }

      if (amountCents > remainingCents) {
        throw new ConflictException({
          message: `Overpayment is not allowed. Remaining amount is ${(remainingCents / 100).toFixed(
            2,
          )}.`,
          errorCode: 'OVERPAYMENT_NOT_ALLOWED',
        });
      }

      const payment = manager.create(Payment, {
        order,
        amount: (amountCents / 100).toFixed(2),
        status: PaymentStatus.CONFIRMED,
      });

      await manager.save(payment);

      const newTotalPaidCents = totalPaidCents + amountCents;
      order.totalPaid = (newTotalPaidCents / 100).toFixed(2);

      if (newTotalPaidCents === totalAmountCents) {
        order.status = OrderStatus.PROCESSING;
      }

      await manager.save(order);

      const reloadedOrder = await manager.findOneOrFail(Order, {
        where: { id: order.id },
        relations: ['items'],
      });

      return { order: reloadedOrder, payment };
    });
  }

  async listPaymentsForOrder(orderId: string, tenantId: string): Promise<Payment[]> {
    const order = await this.ordersRepo.findOne({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    return this.paymentsRepo.find({
      where: { order: { id: orderId } },
      order: { createdAt: 'ASC' },
    });
  }
}

