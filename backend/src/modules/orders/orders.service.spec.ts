import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { DataSource, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: jest.Mocked<Repository<Order>>;
  let orderItemsRepo: jest.Mocked<Repository<OrderItem>>;
  let dataSource: jest.Mocked<DataSource>;
  let transactionManager: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
  };

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const customerId = '00000000-0000-0000-0000-000000000002';
  const orderId = '11111111-1111-1111-1111-111111111111';

  const mockOrder: Partial<Order> = {
    id: orderId,
    tenantId,
    customerId,
    status: OrderStatus.PENDING,
    version: 1,
    createdBy: customerId,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderItem: Partial<OrderItem> = {
    id: 'item-1',
    productId: 'prod-1',
    name: 'Product 1',
    quantity: 2,
    price: 10.5,
  };

  beforeEach(async () => {
    transactionManager = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
    };

    const mockTransaction = jest.fn().mockImplementation((fn: (mgr: typeof transactionManager) => Promise<unknown>) =>
      fn(transactionManager),
    );

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {
            transaction: mockTransaction,
          },
        },
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    ordersRepo = module.get(getRepositoryToken(Order));
    orderItemsRepo = module.get(getRepositoryToken(OrderItem));
    dataSource = module.get(DataSource);
  });

  describe('createOrder', () => {
    const createDto: CreateOrderDto = {
      tenantId,
      customerId,
      createdBy: customerId,
      items: [
        {
          productId: 'prod-1',
          name: 'Product 1',
          quantity: 2,
          price: 10.5,
        },
      ],
    };

    it('should create an order with items in a transaction', async () => {
      const savedOrder = { ...mockOrder, id: orderId };
      const savedOrderWithItems = { ...savedOrder, items: [mockOrderItem] };

      transactionManager.create
        .mockReturnValueOnce(savedOrder)
        .mockReturnValueOnce(mockOrderItem);
      transactionManager.save.mockResolvedValue(undefined);
      transactionManager.findOneOrFail.mockResolvedValue(savedOrderWithItems);

      const result = await service.createOrder(createDto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(transactionManager.create).toHaveBeenCalledWith(Order, {
        tenantId,
        customerId,
        status: OrderStatus.PENDING,
        createdBy: customerId,
      });
      expect(transactionManager.save).toHaveBeenCalled();
      expect(result).toEqual(savedOrderWithItems);
    });

    it('should create order with multiple items', async () => {
      const dtoWithMultipleItems: CreateOrderDto = {
        ...createDto,
        items: [
          { productId: 'p1', name: 'Prod 1', quantity: 1, price: 5 },
          { productId: 'p2', name: 'Prod 2', quantity: 3, price: 10 },
        ],
      };

      transactionManager.create
        .mockReturnValueOnce(mockOrder)
        .mockReturnValueOnce({})
        .mockReturnValueOnce({});
      transactionManager.save.mockResolvedValue(undefined);
      transactionManager.findOneOrFail.mockResolvedValue({ ...mockOrder, items: dtoWithMultipleItems.items });

      const result = await service.createOrder(dtoWithMultipleItems);

      expect(transactionManager.create).toHaveBeenCalledTimes(3); // 1 order + 2 items
      expect(result.items).toHaveLength(2);
    });
  });

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      const orderWithItems = { ...mockOrder, items: [mockOrderItem] };
      (ordersRepo.findOne as jest.Mock).mockResolvedValue(orderWithItems);

      const result = await service.getOrderById(orderId, tenantId);

      expect(ordersRepo.findOne).toHaveBeenCalledWith({
        where: { id: orderId, tenantId },
        relations: ['items'],
      });
      expect(result).toEqual(orderWithItems);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      (ordersRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrderById(orderId, tenantId)).rejects.toThrow(NotFoundException);
      await expect(service.getOrderById(orderId, tenantId)).rejects.toMatchObject({
        response: { errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    });

    it('should throw NotFoundException when order belongs to different tenant', async () => {
      (ordersRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrderById(orderId, 'other-tenant-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listOrders', () => {
    it('should return paginated orders for tenant', async () => {
      const orders = [{ ...mockOrder }];
      const queryBuilder = (ordersRepo as unknown as { createQueryBuilder: jest.Mock }).createQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([orders, 1]);

      const dto: ListOrdersDto = { offset: 0, limit: 10 };
      const result = await service.listOrders(dto, tenantId);

      expect(result.data).toEqual(orders);
      expect(result.meta.total).toBe(1);
      expect(result.meta.offset).toBe(0);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter by status when provided', async () => {
      const dto: ListOrdersDto = { offset: 0, limit: 10, status: OrderStatus.PENDING };
      const queryBuilder = (ordersRepo as unknown as { createQueryBuilder: jest.Mock }).createQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listOrders(dto, tenantId);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.status = :status', {
        status: OrderStatus.PENDING,
      });
    });

    it('should filter by customerId when provided', async () => {
      const dto: ListOrdersDto = { offset: 0, limit: 10, customerId };
      const queryBuilder = (ordersRepo as unknown as { createQueryBuilder: jest.Mock }).createQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listOrders(dto, tenantId);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.customerId = :customerId', {
        customerId,
      });
    });

    it('should apply pagination with skip and take', async () => {
      const dto: ListOrdersDto = { offset: 20, limit: 5 };
      const queryBuilder = (ordersRepo as unknown as { createQueryBuilder: jest.Mock }).createQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listOrders(dto, tenantId);

      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('updateStatus', () => {
    const updateDto: UpdateStatusDto = {
      status: OrderStatus.PROCESSING,
      version: 1,
    };

    it('should update order status when version matches', async () => {
      const existingOrder = { ...mockOrder, version: 1 };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PROCESSING, version: 2, items: [] };

      transactionManager.findOne.mockResolvedValue(existingOrder);
      transactionManager.save.mockResolvedValue(undefined);
      transactionManager.findOneOrFail.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus(orderId, tenantId, updateDto);

      expect(transactionManager.findOne).toHaveBeenCalledWith(Order, {
        where: { id: orderId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(existingOrder.status).toBe(OrderStatus.PROCESSING);
      expect(existingOrder.version).toBe(2);
      expect(result).toEqual(updatedOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(orderId, tenantId, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.updateStatus(orderId, tenantId, updateDto)).rejects.toMatchObject({
        response: { errorCode: 'ORDER_NOT_FOUND' },
      });
    });

    it('should throw ConflictException when version mismatch', async () => {
      const existingOrder = { ...mockOrder, version: 2 }; // DB has v2, client sent v1
      transactionManager.findOne.mockResolvedValue(existingOrder);

      await expect(service.updateStatus(orderId, tenantId, updateDto)).rejects.toThrow(ConflictException);
      await expect(service.updateStatus(orderId, tenantId, updateDto)).rejects.toMatchObject({
        response: { errorCode: 'VERSION_MISMATCH', message: 'Order has been modified by another request' },
      });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel PENDING order', async () => {
      const existingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED, version: 2, items: [] };

      transactionManager.findOne.mockResolvedValue(existingOrder);
      transactionManager.save.mockResolvedValue(undefined);
      transactionManager.findOneOrFail.mockResolvedValue(cancelledOrder);

      const result = await service.cancelOrder(orderId, tenantId);

      expect(existingOrder.status).toBe(OrderStatus.CANCELLED);
      expect(existingOrder.version).toBe(2);
      expect(result).toEqual(cancelledOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await expect(service.cancelOrder(orderId, tenantId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when order is not PENDING', async () => {
      const processingOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
      transactionManager.findOne.mockResolvedValue(processingOrder);

      await expect(service.cancelOrder(orderId, tenantId)).rejects.toThrow(ConflictException);
      await expect(service.cancelOrder(orderId, tenantId)).rejects.toMatchObject({
        response: {
          errorCode: 'INVALID_STATUS_TRANSITION',
          message: expect.stringContaining('Only PENDING orders can be cancelled'),
        },
      });
    });

    it('should throw ConflictException for DELIVERED order', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      transactionManager.findOne.mockResolvedValue(deliveredOrder);

      await expect(service.cancelOrder(orderId, tenantId)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for already CANCELLED order', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      transactionManager.findOne.mockResolvedValue(cancelledOrder);

      await expect(service.cancelOrder(orderId, tenantId)).rejects.toThrow(ConflictException);
    });
  });
});
