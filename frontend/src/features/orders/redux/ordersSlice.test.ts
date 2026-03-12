import { describe, it, expect, beforeEach, vi } from 'vitest';
import ordersReducer, {
  fetchOrders,
  fetchOrderById,
  createOrder,
  cancelOrder,
  clearError,
  clearSelectedOrder,
} from './ordersSlice';
import { ordersService } from '../services/ordersService';

vi.mock('../services/ordersService', () => ({
  ordersService: {
    fetchOrders: vi.fn(),
    fetchOrderById: vi.fn(),
    createOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
    cancelOrder: vi.fn(),
  },
}));

const mockOrder = {
  id: 'order-1',
  customerId: 'cust-1',
  tenantId: 'tenant-1',
  status: 'PENDING' as const,
  items: [
    { id: 'i1', productId: 'p1', name: 'Product', quantity: 2, price: 10 },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  version: 1,
};

describe('ordersSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = ordersReducer(undefined, { type: 'unknown' });
      expect(state).toEqual({
        orders: [],
        selectedOrder: null,
        loading: false,
        error: null,
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const state = ordersReducer(
        { ...ordersReducer(undefined, { type: 'x' }), error: 'Failed' },
        clearError(),
      );
      expect(state.error).toBeNull();
    });
  });

  describe('clearSelectedOrder', () => {
    it('should clear selectedOrder', () => {
      const stateWithOrder = {
        ...ordersReducer(undefined, { type: 'x' }),
        selectedOrder: mockOrder,
      };
      const state = ordersReducer(stateWithOrder, clearSelectedOrder());
      expect(state.selectedOrder).toBeNull();
    });
  });

  describe('fetchOrders', () => {
    it('should set loading and clear error on pending', () => {
      const state = ordersReducer(undefined, { type: fetchOrders.pending.type });
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set orders and pagination on fulfilled', async () => {
      const response = {
        data: [mockOrder],
        meta: { offset: 0, limit: 10, total: 1, hasMore: false },
      };
      (ordersService.fetchOrders as ReturnType<typeof vi.fn>).mockResolvedValue(response);

      const thunk = fetchOrders({ page: 1, limit: 10 });
      const dispatch = vi.fn();

      await thunk(dispatch, vi.fn(), undefined);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: fetchOrders.fulfilled.type,
          payload: response,
        }),
      );
    });

    it('should compute pagination from meta', () => {
      const action = {
        type: fetchOrders.fulfilled.type,
        payload: {
          data: [mockOrder],
          meta: { offset: 20, limit: 10, total: 50, hasMore: true },
        },
      };
      const prevState = ordersReducer(undefined, { type: fetchOrders.pending.type });
      const state = ordersReducer(prevState, action);

      expect(state.orders).toHaveLength(1);
      expect(state.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });

    it('should set error on rejected', async () => {
      (ordersService.fetchOrders as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      const thunk = fetchOrders({});
      const dispatch = vi.fn();

      await thunk(dispatch, vi.fn(), undefined);

      const rejectedAction = dispatch.mock.calls.find(
        (call) => call[0]?.type === fetchOrders.rejected.type,
      )?.[0];
      expect(rejectedAction?.payload).toBe('Network error');
    });
  });

  describe('fetchOrderById', () => {
    it('should set selectedOrder on fulfilled', () => {
      const action = {
        type: fetchOrderById.fulfilled.type,
        payload: mockOrder,
      };
      const prevState = ordersReducer(undefined, { type: fetchOrderById.pending.type });
      const state = ordersReducer(prevState, action);

      expect(state.selectedOrder).toEqual(mockOrder);
      expect(state.loading).toBe(false);
    });
  });

  describe('createOrder', () => {
    it('should prepend new order to list on fulfilled', () => {
      const existingOrders = [mockOrder];
      const newOrder = { ...mockOrder, id: 'order-2' };
      const prevState = {
        ...ordersReducer(undefined, { type: 'x' }),
        orders: existingOrders,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      const action = {
        type: createOrder.fulfilled.type,
        payload: newOrder,
      };
      const state = ordersReducer(prevState, action);

      expect(state.orders).toHaveLength(2);
      expect(state.orders[0]).toEqual(newOrder);
      expect(state.pagination.total).toBe(2);
    });
  });

  describe('cancelOrder', () => {
    it('should update order in list and selectedOrder on fulfilled', () => {
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' as const };
      const prevState = {
        ...ordersReducer(undefined, { type: 'x' }),
        orders: [mockOrder],
        selectedOrder: mockOrder,
      };
      const action = {
        type: cancelOrder.fulfilled.type,
        payload: cancelledOrder,
      };
      const state = ordersReducer(prevState, action);

      expect(state.orders[0]).toEqual(cancelledOrder);
      expect(state.selectedOrder).toEqual(cancelledOrder);
    });
  });
});
