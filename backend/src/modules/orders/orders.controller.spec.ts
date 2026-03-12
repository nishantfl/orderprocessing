import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../common/enums/role.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import type { JwtUser } from '../../common/types/jwt-user.interface';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const customerId = '00000000-0000-0000-0000-000000000002';
  const adminId = '00000000-0000-0000-0000-000000000001';
  const orderId = '11111111-1111-1111-1111-111111111111';

  const adminUser: JwtUser = {
    user_id: adminId,
    tenant_id: tenantId,
    role: Role.ADMIN,
  };

  const customerUser: JwtUser = {
    user_id: customerId,
    tenant_id: tenantId,
    role: Role.CUSTOMER,
  };

  const mockOrder = {
    id: orderId,
    tenantId,
    customerId,
    status: OrderStatus.PENDING,
    version: 1,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: customerId,
  };

  const mockPaginatedResponse = {
    data: [mockOrder],
    meta: { offset: 0, limit: 10, total: 1, hasMore: false },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            listOrders: jest.fn(),
            createOrder: jest.fn(),
            getOrderById: jest.fn(),
            updateStatus: jest.fn(),
            cancelOrder: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService) as jest.Mocked<OrdersService>;
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated orders for ADMIN (all tenant orders)', async () => {
      const dto: ListOrdersDto = { offset: 0, limit: 10 };
      ordersService.listOrders.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.list(dto, adminUser);

      expect(ordersService.listOrders).toHaveBeenCalledWith(dto, tenantId);
      expect(dto.customerId).toBeUndefined();
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should restrict CUSTOMER to own orders only', async () => {
      const dto: ListOrdersDto = { offset: 0, limit: 10 };
      ordersService.listOrders.mockResolvedValue(mockPaginatedResponse);

      await controller.list(dto, customerUser);

      expect(dto.customerId).toBe(customerId);
      expect(ordersService.listOrders).toHaveBeenCalledWith(dto, tenantId);
    });
  });

  describe('create', () => {
    it('should create order with tenant/customer from JWT', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 'p1', name: 'Product', quantity: 1, price: 10 }],
      };
      ordersService.createOrder.mockResolvedValue(mockOrder as never);

      const result = await controller.create(dto, customerUser);

      expect(dto.tenantId).toBe(tenantId);
      expect(dto.customerId).toBe(customerId);
      expect(dto.createdBy).toBe(customerId);
      expect(ordersService.createOrder).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockOrder);
    });

    it('should override body tenantId/customerId with JWT values', async () => {
      const dto: CreateOrderDto = {
        tenantId: 'spoofed-tenant',
        customerId: 'spoofed-customer',
        createdBy: 'spoofed-creator',
        items: [{ productId: 'p1', name: 'Product', quantity: 1, price: 10 }],
      };
      ordersService.createOrder.mockResolvedValue(mockOrder as never);

      await controller.create(dto, customerUser);

      expect(dto.tenantId).toBe(tenantId);
      expect(dto.customerId).toBe(customerId);
      expect(dto.createdBy).toBe(customerId);
    });
  });

  describe('getById', () => {
    it('should return order for ADMIN', async () => {
      ordersService.getOrderById.mockResolvedValue(mockOrder as never);

      const result = await controller.getById(orderId, adminUser);

      expect(ordersService.getOrderById).toHaveBeenCalledWith(orderId, tenantId);
      expect(result).toEqual(mockOrder);
    });

    it('should return order for CUSTOMER when it is their order', async () => {
      const orderOwnedByCustomer = { ...mockOrder, customerId };
      ordersService.getOrderById.mockResolvedValue(orderOwnedByCustomer as never);

      const result = await controller.getById(orderId, customerUser);

      expect(result).toEqual(orderOwnedByCustomer);
    });

    it('should throw ForbiddenException when CUSTOMER tries to view another customer order', async () => {
      const otherCustomerOrder = { ...mockOrder, customerId: 'other-customer-id' };
      ordersService.getOrderById.mockResolvedValue(otherCustomerOrder as never);

      await expect(controller.getById(orderId, customerUser)).rejects.toThrow(ForbiddenException);
      await expect(controller.getById(orderId, customerUser)).rejects.toMatchObject({
        response: { errorCode: 'FORBIDDEN', message: 'You can only view your own orders' },
      });
    });
  });

  describe('updateStatus', () => {
    const updateDto: UpdateStatusDto = { status: OrderStatus.PROCESSING, version: 1 };

    it('should update status for ADMIN', async () => {
      const updatedOrder = { ...mockOrder, status: OrderStatus.PROCESSING, version: 2 };
      ordersService.updateStatus.mockResolvedValue(updatedOrder as never);

      const result = await controller.updateStatus(orderId, updateDto, adminUser);

      expect(ordersService.updateStatus).toHaveBeenCalledWith(orderId, tenantId, updateDto);
      expect(result).toEqual(updatedOrder);
    });
  });

  describe('cancel', () => {
    it('should cancel order for ADMIN', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      ordersService.getOrderById.mockResolvedValue(mockOrder as never);
      ordersService.cancelOrder.mockResolvedValue(cancelledOrder as never);

      const result = await controller.cancel(orderId, adminUser);

      expect(ordersService.getOrderById).toHaveBeenCalledWith(orderId, tenantId);
      expect(ordersService.cancelOrder).toHaveBeenCalledWith(orderId, tenantId);
      expect(result).toEqual(cancelledOrder);
    });

    it('should cancel order for CUSTOMER when it is their order', async () => {
      const orderOwnedByCustomer = { ...mockOrder, customerId };
      const cancelledOrder = { ...orderOwnedByCustomer, status: OrderStatus.CANCELLED };
      ordersService.getOrderById.mockResolvedValue(orderOwnedByCustomer as never);
      ordersService.cancelOrder.mockResolvedValue(cancelledOrder as never);

      const result = await controller.cancel(orderId, customerUser);

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw ForbiddenException when CUSTOMER tries to cancel another customer order', async () => {
      const otherCustomerOrder = { ...mockOrder, customerId: 'other-customer-id' };
      ordersService.getOrderById.mockResolvedValue(otherCustomerOrder as never);

      await expect(controller.cancel(orderId, customerUser)).rejects.toThrow(ForbiddenException);
      await expect(controller.cancel(orderId, customerUser)).rejects.toMatchObject({
        response: { errorCode: 'FORBIDDEN', message: 'You can only cancel your own orders' },
      });
      expect(ordersService.cancelOrder).not.toHaveBeenCalled();
    });
  });
});
