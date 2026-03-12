import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Order } from '../../../shared/types';
import { OrderStatus } from '../../../shared/types';
import { getErrorMessage } from '../../../shared/utils/errorUtils';
import { ordersService } from '../services/ordersService';
import type { CreateOrderRequest, FetchOrdersParams, OrdersResponse, OrdersState } from '../types';

const initialState: OrdersState = {
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
};

// Async thunks
export const fetchOrders = createAsyncThunk<OrdersResponse, FetchOrdersParams, { rejectValue: string }>(
  'orders/fetchOrders',
  async (params, { rejectWithValue }) => {
    try {
      return await ordersService.fetchOrders(params);
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch orders'));
    }
  }
);

export const fetchOrderById = createAsyncThunk<Order, string, { rejectValue: string }>(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      return await ordersService.fetchOrderById(orderId);
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch order'));
    }
  }
);

export const createOrder = createAsyncThunk<Order, CreateOrderRequest, { rejectValue: string }>(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      return await ordersService.createOrder(orderData);
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create order'));
    }
  }
);

export const updateOrderStatus = createAsyncThunk<
  Order,
  { orderId: string; status: OrderStatus; version: number },
  { rejectValue: string }
>(
  'orders/updateOrderStatus',
  async ({ orderId, status, version }, { rejectWithValue }) => {
    try {
      return await ordersService.updateOrderStatus(orderId, status, version);
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update order status'));
    }
  }
);

export const cancelOrder = createAsyncThunk<Order, string, { rejectValue: string }>(
  'orders/cancelOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      return await ordersService.cancelOrder(orderId);
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Failed to cancel order'));
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action: PayloadAction<OrdersResponse>) => {
        state.loading = false;
        state.orders = action.payload.data || [];
        
        if (action.payload.meta) {
          state.pagination = {
            page: Math.floor(action.payload.meta.offset / action.payload.meta.limit) + 1,
            limit: action.payload.meta.limit,
            total: action.payload.meta.total,
            totalPages: Math.ceil(action.payload.meta.total / action.payload.meta.limit),
          };
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch orders';
      })
      
      // Fetch order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action: PayloadAction<Order>) => {
        state.loading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch order';
      })
      
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action: PayloadAction<Order>) => {
        state.loading = false;
        state.orders.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create order';
      })
      
      // Update order status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action: PayloadAction<Order>) => {
        state.loading = false;
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update order status';
      })
      
      // Cancel order
      .addCase(cancelOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action: PayloadAction<Order>) => {
        state.loading = false;
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to cancel order';
      });
  },
});

export const { clearError, clearSelectedOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
