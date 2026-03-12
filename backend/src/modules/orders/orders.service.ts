import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { DataSource, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaginatedResponse, PaginationUtil } from '../../common/utils/pagination.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';

// What: Service boundary for order-related business logic.
// Why: Keeps controllers thin and centralizes transaction handling.
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepo: Repository<OrderItem>,
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrdersService.name);
  }

  // What: Creates an order and its items inside a single transaction.
  // Why: Ensures we never persist an order without its items (or vice versa).
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const { tenantId, customerId, createdBy, items } = dto;

    return this.dataSource.transaction(async (manager) => {
      const totalAmount = items
        .reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        )
        .toFixed(2);

      const order = manager.create(Order, {
        tenantId,
        customerId,
        status: OrderStatus.PENDING,
        createdBy,
        totalAmount,
        totalPaid: '0.00',
      });

      await manager.save(order);

      const orderItems = items.map((item) =>
        manager.create(OrderItem, {
          order,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }),
      );

      await manager.save(orderItems);

      // Reload order with items to return a complete aggregate.
      return manager.findOneOrFail(Order, {
        where: { id: order.id },
        relations: ['items'],
      });
    });
  }

  // What: Retrieves a single order by ID, scoped to tenant.
  // Why: Ensures multi-tenant isolation—users can't access other tenants' orders.
  async getOrderById(id: string, tenantId: string): Promise<Order> {
    const order = await this.ordersRepo.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    return order;
  }

  // What: Lists orders with pagination and optional filtering.
  // Why: Supports efficient browsing of orders with tenant isolation.
  async listOrders(
    dto: ListOrdersDto,
    tenantId: string,
  ): Promise<PaginatedResponse<Order>> {
    const { offset, limit } = PaginationUtil.normalize(dto.offset, dto.limit);

    // Build query with filters.
    this.logger.debug({ tenantId }, 'listOrders');
    const queryBuilder = this.ordersRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.tenantId = :tenantId', { tenantId });

    if (dto.status) {
      queryBuilder.andWhere('order.status = :status', { status: dto.status });
    }

    // if (dto.customerId) {
    //   queryBuilder.andWhere('order.customerId = :customerId', {
    //     customerId: dto.customerId,
    //   });
    // }

    // Get total count and paginated results.
    const [data, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .orderBy('order.createdAt', 'DESC')
      .getManyAndCount();

    return PaginationUtil.format(data, total, offset, limit);
  }

  // What: Updates an order's status with optimistic locking.
  // Why: Prevents lost updates when multiple clients modify the same order.
  async updateStatus(
    id: string,
    tenantId: string,
    dto: UpdateStatusDto,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      // Lock the order row for update within this transaction.
      const order = await manager.findOne(Order, {
        where: { id, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException({
          message: 'Order not found',
          errorCode: 'ORDER_NOT_FOUND',
        });
      }

      // Check optimistic lock version.
      if (order.version !== dto.version) {
        throw new ConflictException({
          message: 'Order has been modified by another request',
          errorCode: 'VERSION_MISMATCH',
        });
      }

      // Enforce that PROCESSING is only reachable when fully paid.
      if (dto.status === OrderStatus.PROCESSING) {
        const totalAmountCents = Math.round(Number(order.totalAmount) * 100);
        const totalPaidCents = Math.round(Number(order.totalPaid) * 100);

        if (totalPaidCents < totalAmountCents) {
          throw new ConflictException({
            message: 'Order cannot be moved to PROCESSING until it is fully paid',
            errorCode: 'PAYMENT_REQUIRED',
          });
        }
      }

      // Update status and increment version.
      order.status = dto.status;
      order.version += 1;

      await manager.save(order);

      // Reload with items for complete response.
      return manager.findOneOrFail(Order, {
        where: { id },
        relations: ['items'],
      });
    });
  }

  // What: Cancels an order by setting its status to CANCELLED.
  // Why: Business operation that enforces status transition rules.
  async cancelOrder(id: string, tenantId: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException({
          message: 'Order not found',
          errorCode: 'ORDER_NOT_FOUND',
        });
      }

      // Only allow cancellation of PENDING orders.
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException({
          message: `Cannot cancel order with status ${order.status}. Only PENDING orders can be cancelled.`,
          errorCode: 'INVALID_STATUS_TRANSITION',
        });
      }

      order.status = OrderStatus.CANCELLED;
      order.version += 1;

      await manager.save(order);

      return manager.findOneOrFail(Order, {
        where: { id },
        relations: ['items'],
      });
    });
  }
}

