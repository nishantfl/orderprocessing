import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ordersService } from './ordersService';
import apiClient from '../../../shared/services/apiClient';

vi.mock('../../../shared/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockOrder = {
  id: 'order-1',
  customerId: 'c1',
  tenantId: 't1',
  status: 'PENDING',
  items: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  version: 1,
};

describe('ordersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchOrders', () => {
    it('should call API with offset and limit', async () => {
      const response = {
        data: { data: [mockOrder], meta: { offset: 0, limit: 10, total: 1, hasMore: false } },
      };
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(response);

      await ordersService.fetchOrders({ page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/v1/orders', {
        params: { offset: 0, limit: 10, status: undefined },
      });
    });

    it('should include status filter when provided', async () => {
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
      await ordersService.fetchOrders({ page: 2, limit: 5, status: 'PENDING' });

      expect(apiClient.get).toHaveBeenCalledWith('/v1/orders', {
        params: { offset: 5, limit: 5, status: 'PENDING' },
      });
    });

    it('should use default page and limit', async () => {
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
      await ordersService.fetchOrders({});

      expect(apiClient.get).toHaveBeenCalledWith('/v1/orders', {
        params: { offset: 0, limit: 10, status: undefined },
      });
    });
  });

  describe('fetchOrderById', () => {
    it('should call API with order ID', async () => {
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockOrder });
      const result = await ordersService.fetchOrderById('order-1');

      expect(apiClient.get).toHaveBeenCalledWith('/v1/orders/order-1');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('createOrder', () => {
    it('should POST order data to API', async () => {
      const orderData = {
        items: [{ productId: 'p1', quantity: 2, price: 10 }],
      };
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockOrder });

      const result = await ordersService.createOrder(orderData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/orders', orderData);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('updateOrderStatus', () => {
    it('should PATCH order status with version', async () => {
      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...mockOrder, status: 'PROCESSING', version: 2 },
      });
      const result = await ordersService.updateOrderStatus('order-1', 'PROCESSING', 1);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/orders/order-1/status', {
        status: 'PROCESSING',
        version: 1,
      });
      expect(result.status).toBe('PROCESSING');
    });
  });

  describe('cancelOrder', () => {
    it('should POST to cancel endpoint', async () => {
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...mockOrder, status: 'CANCELLED' },
      });
      const result = await ordersService.cancelOrder('order-1');

      expect(apiClient.post).toHaveBeenCalledWith('/v1/orders/order-1/cancel');
      expect(result.status).toBe('CANCELLED');
    });
  });
});
