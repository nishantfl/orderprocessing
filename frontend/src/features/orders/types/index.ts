import type { Order, PaginatedResponse } from '../../../shared/types';
import { OrderStatus } from '../../../shared/types';

export interface OrdersState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface FetchOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export type OrdersResponse = PaginatedResponse<Order>;
